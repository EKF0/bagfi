/**
 * Bags.fm API Client
 * Server-side only wrapper for Bags API v1
 * Handles auth, retries, rate limiting, and error normalization
 */

import { validateServerEnvironment } from '@/lib/env';

const BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

// Rate limit tracking
interface RateLimitState {
  remaining: number;
  reset: number;
  limit: number;
}

let rateLimitState: RateLimitState = {
  remaining: 1000,
  reset: 0,
  limit: 1000
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Normalized error from Bags API
 */
export class BagsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'BagsApiError';
  }
}

/**
 * Normalized success response
 */
export interface BagsApiResponse<T> {
  success: true;
  data: T;
  requestId?: string;
  rateLimit?: RateLimitState;
}

/**
 * Normalized error response
 */
export interface BagsApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
  requestId?: string;
  rateLimit?: RateLimitState;
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
    // Retry on rate limit (429) and server errors (5xx)
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  
  // Retry on network errors
  return true;
}

/**
 * Delay for retry with exponential backoff
 */
function delay(attempt: number): Promise<void> {
  const ms = RETRY_DELAY_MS * Math.pow(2, attempt);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make a request to the Bags API
 * @param endpoint API endpoint path (without base URL)
 * @param options Fetch options
 * @returns Normalized response
 */
export async function bagsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<BagsApiResponse<T>> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${endpoint}`;
  const requestId = `bags-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
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
      
      // Parse response
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new BagsApiError(
          'Invalid JSON response from Bags API',
          response.status,
          'PARSE_ERROR',
          requestId
        );
      }
      
      if (!response.ok) {
        // Normalize Bags error format
        const errorData = data as Record<string, unknown>;
        throw new BagsApiError(
          (errorData.message as string) || (errorData.error as string) || `Bags API error: ${response.status}`,
          response.status,
          (errorData.code as string) || `HTTP_${response.status}`,
          requestId
        );
      }
      
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
      
      console.warn(`⚠️  Bags API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error instanceof Error ? error.message : 'Unknown error'}. Retrying...`);
      await delay(attempt);
    }
  }
  
  // All retries exhausted
  if (lastError instanceof BagsApiError) {
    throw lastError;
  }
  
  throw new BagsApiError(
    lastError instanceof Error ? lastError.message : 'Unknown error',
    0,
    'UNKNOWN_ERROR',
    requestId
  );
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): RateLimitState {
  return { ...rateLimitState };
}

/**
 * Check if rate limit is approaching
 */
export function isRateLimitLow(threshold = 100): boolean {
  return rateLimitState.remaining < threshold;
}

// ==========================================
// Typed API Methods
// ==========================================

/**
 * Trade Quote
 * GET /trade/quote
 */
export interface TradeQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  userPublicKey?: string;
}

export interface TradeQuoteResponse {
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: string | null;
  priceImpactPct: string;
  routePlan: Array<{
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
  }>;
  contextSlot: number;
  timeTaken: number;
}

export async function getTradeQuote(params: TradeQuoteRequest): Promise<BagsApiResponse<TradeQuoteResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('inputMint', params.inputMint);
  queryParams.set('outputMint', params.outputMint);
  queryParams.set('amount', params.amount);
  if (params.slippageBps !== undefined) queryParams.set('slippageBps', params.slippageBps.toString());
  if (params.userPublicKey) queryParams.set('userPublicKey', params.userPublicKey);
  
  return bagsRequest<TradeQuoteResponse>(`/trade/quote?${queryParams.toString()}`);
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
  return bagsRequest<SwapTransactionResponse>('/trade/swap', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

/**
 * Token Launch Feed
 * GET /token-launch/feed
 */
export interface TokenLaunch {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creator: string;
  createdAt: string;
  liquidityUsd: string;
  marketCapUsd: string;
  volume24hUsd: string;
  priceUsd: string;
  priceChange24hPct: string;
  holders: number;
  isVerified: boolean;
}

export interface TokenLaunchFeedResponse {
  tokens: TokenLaunch[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getTokenLaunchFeed(page = 1, pageSize = 50): Promise<BagsApiResponse<TokenLaunchFeedResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('pageSize', pageSize.toString());
  
  return bagsRequest<TokenLaunchFeedResponse>(`/token-launch/feed?${queryParams.toString()}`);
}

/**
 * Bags Pools
 * GET /solana/bags/pools
 */
export interface BagsPool {
  poolAddress: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenAReserve: string;
  tokenBReserve: string;
  liquidityUsd: string;
  volume24hUsd: string;
  feeRateBps: number;
  apr24h: string;
}

export interface BagsPoolsResponse {
  pools: BagsPool[];
  total: number;
}

export async function getBagsPools(): Promise<BagsApiResponse<BagsPoolsResponse>> {
  return bagsRequest<BagsPoolsResponse>('/solana/bags/pools');
}

/**
 * Claimable Positions
 * GET /claimable-positions
 */
export interface ClaimablePosition {
  tokenMint: string;
  tokenSymbol: string;
  claimableAmount: string;
  claimableAmountUsd: string;
  lastClaimAt: string | null;
  totalClaimed: string;
  totalClaimedUsd: string;
}

export interface ClaimablePositionsResponse {
  positions: ClaimablePosition[];
  totalClaimableUsd: string;
}

export async function getClaimablePositions(userPublicKey: string): Promise<BagsApiResponse<ClaimablePositionsResponse>> {
  return bagsRequest<ClaimablePositionsResponse>(`/claimable-positions?userPublicKey=${userPublicKey}`);
}

/**
 * Health Check
 * GET /ping
 */
export async function healthCheck(): Promise<{ message: string }> {
  const response = await fetch(`${BASE_URL}/ping`);
  if (!response.ok) {
    throw new BagsApiError('Bags API health check failed', response.status);
  }
  return response.json();
}
