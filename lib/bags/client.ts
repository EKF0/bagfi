/**
 * Bags.fm API Client
 * Server-side only wrapper for Bags API v1
 * Handles auth, retries, rate limiting, and error normalization
 */

import { validateServerEnvironment } from '@/lib/env';
import telemetry from '@/lib/telemetry';

const BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

// Rate limit tracking
interface RateLimitState {
  remaining: number;
  reset: number;
  limit: number;
}

const rateLimitState: RateLimitState = {
  remaining: 1000,
  reset: 0,
  limit: 1000
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export class BagsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'BagsApiError';
  }
}

export interface BagsApiResponse<T> {
  success: boolean;
  data: T;
  requestId?: string;
  rateLimit?: RateLimitState;
}

/**
 * Standard Bags API Response Envelope
 */
export interface BagsApiEnvelope<T> {
  success: boolean;
  response: T;
}

/**
 * Generic request wrapper for Bags.fm API
 */
async function bagsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<BagsApiResponse<T>> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${endpoint}`;
  const requestId = `bags-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-request-id': requestId,
          ...options.headers
        }
      });
      
      updateRateLimits(response.headers);
      const durationMs = Date.now() - startTime;
      
      // Parse response
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        const parseError = 'Invalid JSON response from Bags API';
        telemetry.trackBagsRequest({
          endpoint,
          method: options.method || 'GET',
          status: response.status,
          durationMs,
          requestId,
          error: parseError
        });
        throw new BagsApiError(
          parseError,
          response.status,
          'PARSE_ERROR',
          requestId
        );
      }
      
      if (!response.ok) {
        // Normalize Bags error format
        const errorData = data as Record<string, unknown>;
        const errorMessage = (errorData.message as string) || (errorData.error as string) || `Bags API error: ${response.status}`;
        
        telemetry.trackBagsRequest({
          endpoint,
          method: options.method || 'GET',
          status: response.status,
          durationMs,
          requestId,
          rateLimitRemaining: rateLimitState.remaining,
          rateLimitReset: rateLimitState.reset,
          error: errorMessage
        });

        throw new BagsApiError(
          errorMessage,
          response.status,
          (errorData.code as string) || `HTTP_${response.status}`,
          requestId
        );
      }
      
      telemetry.trackBagsRequest({
        endpoint,
        method: options.method || 'GET',
        status: response.status,
        durationMs,
        requestId,
        rateLimitRemaining: rateLimitState.remaining,
        rateLimitReset: rateLimitState.reset
      });

      return {
        success: true,
        data: data as T,
        requestId,
        rateLimit: { ...rateLimitState }
      };
      
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error, attempt)) {
        break;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️  Bags API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${errorMessage}. Retrying...`);
      await delay(attempt);
    }
  }
  
  const durationMs = Date.now() - startTime;
  const finalError = lastError instanceof BagsApiError 
    ? lastError 
    : new BagsApiError(lastError instanceof Error ? lastError.message : 'Unknown error', 0, 'UNKNOWN_ERROR', requestId);

  telemetry.trackBagsRequest({
    endpoint,
    method: options.method || 'GET',
    status: finalError.statusCode,
    durationMs,
    requestId,
    error: finalError.message
  });

  throw finalError;
}

/**
 * Get the Bags API key from environment
 * @throws {Error} If BAGS_API_KEY is not set
 */
function getApiKey(): string {
  validateServerEnvironment();
  const key = process.env.BAGS_API_KEY;
  if (!key) {
    throw new Error('BAGS_API_KEY is not configured');
  }
  return key;
}

/**
 * Update rate limit state from response headers
 */
function updateRateLimits(headers: Headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const limit = headers.get('x-ratelimit-limit');
  
  if (remaining) rateLimitState.remaining = parseInt(remaining, 10);
  if (reset) rateLimitState.reset = parseInt(reset, 10);
  if (limit) rateLimitState.limit = parseInt(limit, 10);
  
  // Warn if running low
  if (rateLimitState.remaining < 100) {
    console.warn(`⚠️  Bags API rate limit low: ${rateLimitState.remaining}/${rateLimitState.limit} remaining, resets at ${new Date(rateLimitState.reset * 1000).toISOString()}`);
  }
}

/**
 * Check if we should retry based on error
 */
function shouldRetry(error: unknown, attempt: number): boolean {
  if (attempt >= MAX_RETRIES) return false;
  
  if (error instanceof BagsApiError) {
    // Retry on 5xx or specific network-like errors
    return error.statusCode >= 500 || error.statusCode === 429;
  }
  
  return true; // Retry on network errors
}

/**
 * Helper for exponential backoff
 */
async function delay(attempt: number): Promise<void> {
  const ms = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely unwrap a Bags API success response
 */
export function unwrapBagsResponse<T>(envelope: BagsApiResponse<BagsApiEnvelope<T>>, errorContext: string): BagsApiResponse<T> {
  if (!envelope.data || envelope.data.success === false) {
    throw new BagsApiError(
      `${errorContext}: API returned failure`,
      500,
      'API_FAILURE',
      envelope.requestId
    );
  }
  
  return {
    ...envelope,
    data: envelope.data.response
  };
}

/**
 * Rate limit status
 */
export function getRateLimitStatus() {
  return { ...rateLimitState };
}

export function isRateLimitLow(): boolean {
  return rateLimitState.remaining < 100;
}

// ── Trade API ────────────────────────────────────────────────────────────

export interface TradeQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  slippageMode?: 'auto' | 'manual';
  userPublicKey?: string;
}

export interface RawTradeQuoteRouteStep {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface RawTradeQuoteResponse {
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RawTradeQuoteRouteStep[];
  platformFee: string | null | {
    amount: string;
    feeBps: number;
    feeAccount: string;
    segmenterFeeAmount: string;
    segmenterFeePct: number;
  };
  outTransferFee?: string | null;
  simulatedComputeUnits?: number | null;
  timeTaken?: number;
}

export interface TradeQuoteResponse extends RawTradeQuoteResponse {
  // Add any client-specific enrichments here
}

/**
 * Normalizes Bags raw quote response into app-ready shape
 */
function normalizeTradeQuoteResponse(raw: RawTradeQuoteResponse): TradeQuoteResponse {
  return {
    ...raw,
    // Add normalization logic if needed (e.g. converting string numbers to BigInt/number)
  };
}

export async function getTradeQuote(params: TradeQuoteRequest): Promise<BagsApiResponse<TradeQuoteResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('inputMint', params.inputMint);
  queryParams.set('outputMint', params.outputMint);
  queryParams.set('amount', params.amount);
  queryParams.set('slippageMode', params.slippageMode ?? (params.slippageBps !== undefined ? 'manual' : 'auto'));
  if (params.slippageBps !== undefined) queryParams.set('slippageBps', params.slippageBps.toString());
  if (params.userPublicKey) queryParams.set('userPublicKey', params.userPublicKey);

  const response = await bagsRequest<BagsApiEnvelope<RawTradeQuoteResponse> | RawTradeQuoteResponse>(`/trade/quote?${queryParams.toString()}`);

  if ('success' in response.data) {
    const unwrapped = unwrapBagsResponse(
      response as BagsApiResponse<BagsApiEnvelope<RawTradeQuoteResponse>>,
      'Invalid trade quote response from Bags API'
    );

    return {
      ...unwrapped,
      data: normalizeTradeQuoteResponse(unwrapped.data)
    };
  }

  return {
    ...response,
    data: normalizeTradeQuoteResponse(response.data as RawTradeQuoteResponse)
  };
}

/**
 * Swap Transaction
 * POST /trade/swap
 */
export interface SwapTransactionRequest {
  quoteResponse: TradeQuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  prioritizationFeeLamports?: number;
}

export interface SwapTransactionResponse {
  swapTransaction: string; // base64 serialized transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
}

export async function createSwapTransaction(params: SwapTransactionRequest): Promise<BagsApiResponse<SwapTransactionResponse>> {
  const response = await bagsRequest<BagsApiEnvelope<SwapTransactionResponse> | SwapTransactionResponse>('/trade/swap', {
    method: 'POST',
    body: JSON.stringify(params)
  });

  if ('success' in response.data) {
    const unwrapped = unwrapBagsResponse(
      response as BagsApiResponse<BagsApiEnvelope<SwapTransactionResponse>>,
      'Invalid swap transaction response from Bags API'
    );

    return {
      ...unwrapped,
      data: unwrapped.data
    };
  }

  return response as BagsApiResponse<SwapTransactionResponse>;
}

/**
 * Token Launch Feed
 * GET /token-launch/feed
 */
export type TokenLaunchStatus = 'PRE_LAUNCH' | 'LAUNCHED' | 'FAILED' | 'CANCELLED' | string;

export interface TokenLaunch {
  tokenMint: string;
  name: string;
  symbol: string;
  description?: string | null;
  image?: string | null;
  status: TokenLaunchStatus;
  twitter?: string | null;
  website?: string | null;
  launchSignature?: string | null;
  accountKeys?: string[];
  numRequiredSigners?: number;
  uri?: string | null;
  dbcPoolKey?: string | null;
  dbcConfigKey?: string | null;
}

export interface TokenLaunchFeedResponse {
  launches: TokenLaunch[];
  total: number;
}

export async function getTokenLaunchFeed(): Promise<BagsApiResponse<TokenLaunchFeedResponse>> {
  const response = await bagsRequest<BagsApiEnvelope<TokenLaunch[]>>('/token-launch/feed');
  const unwrapped = unwrapBagsResponse(response, 'Invalid token launch feed response from Bags API');

  return {
    ...unwrapped,
    data: {
      launches: unwrapped.data,
      total: unwrapped.data.length
    }
  };
}

/**
 * Bags Pools
 * GET /solana/bags/pools
 */
export interface BagsPool {
  tokenMint: string;
  dbcConfigKey: string;
  dbcPoolKey: string;
  dammV2PoolKey: string;
}

export interface BagsPoolsResponse {
  pools: BagsPool[];
  total: number;
}

export interface BagsPoolsRequest {
  onlyMigrated?: boolean;
}

export async function getBagsPools(params: BagsPoolsRequest = {}): Promise<BagsApiResponse<BagsPoolsResponse>> {
  const queryParams = new URLSearchParams();
  if (params.onlyMigrated !== undefined) {
    queryParams.set('onlyMigrated', String(params.onlyMigrated));
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/solana/bags/pools?${queryString}`
    : '/solana/bags/pools';
  const response = await bagsRequest<BagsApiEnvelope<BagsPool[]>>(endpoint);
  const unwrapped = unwrapBagsResponse(response, 'Invalid Bags pool response from Bags API');

  return {
    ...unwrapped,
    data: {
      pools: unwrapped.data,
      total: unwrapped.data.length
    }
  };
}

/**
 * Token Launch Creators / Claim Stats
 * GET /token-launch/creator/v3
 * GET /token-launch/claim-stats
 */
export interface TokenLaunchCreator {
  username?: string | null;
  pfp?: string | null;
  royaltyBps?: number | null;
  isCreator?: boolean;
  wallet?: string | null;
  provider?: string | null;
  providerUsername?: string | null;
  twitterUsername?: string | null;
  bagsUsername?: string | null;
  isAdmin?: boolean;
  totalClaimed?: string; // Total amount claimed in lamports (from claim-stats)
}

export interface TokenLaunchCreatorsResponse {
  creators: TokenLaunchCreator[];
  total: number;
}

export async function getTokenLaunchCreators(tokenMint: string): Promise<BagsApiResponse<TokenLaunchCreatorsResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('tokenMint', tokenMint);

  const response = await bagsRequest<BagsApiEnvelope<TokenLaunchCreator[]>>(`/token-launch/creator/v3?${queryParams.toString()}`);
  const unwrapped = unwrapBagsResponse(response, 'Invalid token launch creators response from Bags API');

  return {
    ...unwrapped,
    data: {
      creators: unwrapped.data,
      total: unwrapped.data.length
    }
  };
}

export async function getTokenClaimStats(tokenMint: string): Promise<BagsApiResponse<TokenLaunchCreatorsResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('tokenMint', tokenMint);

  const response = await bagsRequest<BagsApiEnvelope<TokenLaunchCreator[]>>(`/token-launch/claim-stats?${queryParams.toString()}`);
  const unwrapped = unwrapBagsResponse(response, 'Invalid token claim stats response from Bags API');

  return {
    ...unwrapped,
    data: {
      creators: unwrapped.data,
      total: unwrapped.data.length
    }
  };
}

/**
 * Token Lifetime Fees
 * GET /token-launch/lifetime-fees
 */
export interface TokenLifetimeFeesResponse {
  lifetimeFeesLamports: string;
}

export async function getTokenLifetimeFees(tokenMint: string): Promise<BagsApiResponse<TokenLifetimeFeesResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('tokenMint', tokenMint);

  const response = await bagsRequest<BagsApiEnvelope<string>>(`/token-launch/lifetime-fees?${queryParams.toString()}`);
  const unwrapped = unwrapBagsResponse(response, 'Invalid token lifetime fees response from Bags API');

  return {
    ...unwrapped,
    data: {
      lifetimeFeesLamports: unwrapped.data
    }
  };
}

/**
 * Token Claim Events
 * GET /fee-share/token/claim-events
 */
export interface TokenClaimEvent {
  wallet: string;
  isCreator: boolean;
  amount: string;
  signature: string;
  timestamp: string; // ISO 8601
}

export interface TokenClaimEventsResponse {
  events: TokenClaimEvent[];
  total?: number;
}

export interface TokenClaimEventsRequest {
  tokenMint: string;
  mode?: 'offset' | 'time';
  limit?: number;
  offset?: number;
  from?: number; // unix timestamp
  to?: number;   // unix timestamp
}

export async function getTokenClaimEvents(params: TokenClaimEventsRequest): Promise<BagsApiResponse<TokenClaimEventsResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('tokenMint', params.tokenMint);
  if (params.mode) queryParams.set('mode', params.mode);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.from) queryParams.set('from', params.from.toString());
  if (params.to) queryParams.set('to', params.to.toString());

  const response = await bagsRequest<BagsApiEnvelope<{ events: TokenClaimEvent[] }>>(`/fee-share/token/claim-events?${queryParams.toString()}`);
  const unwrapped = unwrapBagsResponse(response, 'Invalid token claim events response from Bags API');

  return {
    ...unwrapped,
    data: {
      events: unwrapped.data.events,
      total: unwrapped.data.events.length
    }
  };
}

/**
 * Claimable Positions
 * GET /claimable-positions
 */
export interface ClaimablePosition {
  isCustomFeeVault?: boolean;
  baseMint: string;
  isMigrated: boolean;
  totalClaimableLamportsUserShare: number;
  programId: string;
  quoteMint?: string | null;
  virtualPool?: string;
  virtualPoolAddress?: string | null;
  virtualPoolClaimableAmount?: number | null;
  virtualPoolClaimableLamportsUserShare?: number | null;
  dammPoolClaimableAmount?: number | null;
  dammPoolClaimableLamportsUserShare?: number | null;
  dammPoolAddress?: string | null;
  dammPositionInfo?: {
    position: string;
    pool: string;
    positionNftAccount: string;
    tokenAMint: string;
    tokenBMint: string;
    tokenAVault: string;
    tokenBVault: string;
  } | null;
  claimableDisplayAmount?: number | null;
  user?: string | null;
  claimerIndex?: number | null;
  userBps?: number | null;
  customFeeVault?: string | null;
  customFeeVaultClaimerA?: string | null;
  customFeeVaultClaimerB?: string | null;
  customFeeVaultClaimerSide?: 'A' | 'B' | null;
  
  // Normalized fields for easier UI usage
  tokenMint: string;
  tokenSymbol?: string;
  claimableAmountUsd?: string;
  lastClaimAt?: string | null;
  totalClaimed?: string;
  totalClaimedUsd?: string;
}

export interface ClaimablePositionsResponse {
  positions: ClaimablePosition[];
  totalClaimableUsd: string;
}

export async function getClaimablePositions(userPublicKey: string): Promise<BagsApiResponse<ClaimablePositionsResponse>> {
  const response = await bagsRequest<BagsApiEnvelope<ClaimablePosition[]> | ClaimablePositionsResponse>(`/claimable-positions?userPublicKey=${userPublicKey}`);
  
  if ('success' in response.data) {
    const unwrapped = unwrapBagsResponse(
      response as BagsApiResponse<BagsApiEnvelope<ClaimablePosition[]>>,
      'Invalid claimable positions response from Bags API'
    );

    return {
      ...unwrapped,
      data: {
        positions: unwrapped.data.map(p => ({
          ...p,
          tokenMint: p.baseMint // Normalize tokenMint
        })),
        totalClaimableUsd: '0' // Total USD is not always in the v2 response, set default
      }
    };
  }

  return response as BagsApiResponse<ClaimablePositionsResponse>;
}

/**
 * Claim Transactions
 * POST /token-launch/claim-txs/v2
 */
export interface ClaimTransactionRequest {
  feeClaimer: string;
  tokenMint: string;
  virtualPoolAddress?: string | null;
  dammV2Position?: string | null;
  dammV2Pool?: string | null;
  dammV2PositionNftAccount?: string | null;
  tokenAMint?: string | null;
  tokenBMint?: string | null;
  tokenAVault?: string | null;
  tokenBVault?: string | null;
  claimVirtualPoolFees?: boolean | null;
  claimDammV2Fees?: boolean | null;
  isCustomFeeVault?: boolean | null;
  feeShareProgramId?: string | null;
  customFeeVaultClaimerA?: string | null;
  customFeeVaultClaimerB?: string | null;
  customFeeVaultClaimerSide?: 'A' | 'B' | null;
}

export interface ClaimTransactionResponse {
  tx: string; // base64 serialized transaction
  blockhash: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
}

export interface ClaimTransactionsResponse {
  success: boolean;
  response: ClaimTransactionResponse[];
}

export async function createClaimTransactions(params: ClaimTransactionRequest): Promise<BagsApiResponse<ClaimTransactionResponse[]>> {
  const response = await bagsRequest<ClaimTransactionsResponse>('/token-launch/claim-txs/v2', {
    method: 'POST',
    body: JSON.stringify(params)
  });

  if (!response.data.success) {
    throw new BagsApiError('Failed to generate claim transactions', 500, 'CLAIM_TX_FAILED');
  }

  return {
    ...response,
    data: response.data.response
  };
}

/**
 * Partner Configuration & Stats
 */
export interface PartnerStats {
  claimedFees: string; // lamports
  unclaimedFees: string; // lamports
}

export async function getPartnerStats(partnerPublicKey: string): Promise<BagsApiResponse<PartnerStats>> {
  const queryParams = new URLSearchParams();
  queryParams.set('partner', partnerPublicKey);

  const response = await bagsRequest<BagsApiEnvelope<PartnerStats>>(`/fee-share/partner-config/stats?${queryParams.toString()}`);
  return unwrapBagsResponse(response, 'Invalid partner stats response from Bags API');
}

export interface PartnerTransactionRequest {
  partner: string;
}

export async function createPartnerClaimTransaction(params: PartnerTransactionRequest): Promise<BagsApiResponse<ClaimTransactionResponse[]>> {
  const response = await bagsRequest<ClaimTransactionsResponse>('/fee-share/partner-config/claim-tx', {
    method: 'POST',
    body: JSON.stringify(params)
  });

  if (!response.data.success) {
    throw new BagsApiError('Failed to generate partner claim transaction', 500, 'PARTNER_CLAIM_FAILED');
  }

  return {
    ...response,
    data: response.data.response
  };
}

export async function createPartnerConfigTransaction(params: PartnerTransactionRequest): Promise<BagsApiResponse<ClaimTransactionResponse[]>> {
  const response = await bagsRequest<ClaimTransactionsResponse>('/fee-share/partner-config/creation-tx', {
    method: 'POST',
    body: JSON.stringify(params)
  });

  if (!response.data.success) {
    throw new BagsApiError('Failed to generate partner config transaction', 500, 'PARTNER_CONFIG_FAILED');
  }

  return {
    ...response,
    data: response.data.response
  };
}

/**
 * Health Check
 * GET /ping
 */
export async function healthCheck(): Promise<{ message: string }> {
  const response = await fetch(`${BASE_URL}/ping`);
  if (!response.ok) {
    throw new BagsApiError('Bags API health check failed', response.status, 'HTTP_FAILED');
  }
  return response.json();
}
