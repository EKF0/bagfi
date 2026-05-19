import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getBagsPools,
  getRateLimitStatus,
  getTokenLaunchFeed,
  getTokenLaunchCreators,
  getTradeQuote,
  type BagsPool,
  type TokenLaunch,
  type TokenLaunchCreator
} from '@/lib/bags/client';
import { SOLANA_TOKENS } from '@/lib/smart-bags/catalog';
import {
  scoreBagsTokenCandidate,
  type BagsTokenRiskTier
} from '@/lib/bags/risk-scoring';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BagsTokenLaunchRow = {
  token_mint: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  status: string;
  twitter_url: string | null;
  website_url: string | null;
  launch_signature: string | null;
  account_keys: string[];
  num_required_signers: number | null;
  metadata_uri: string | null;
  dbc_pool_key: string | null;
  dbc_config_key: string | null;
  raw_payload: Json;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
};

type BagsTokenLaunchInsert = Omit<BagsTokenLaunchRow, 'first_seen_at'>;
type BagsTokenLaunchUpdate = Partial<BagsTokenLaunchInsert>;

export type BagsPoolRow = {
  token_mint: string;
  dbc_config_key: string | null;
  dbc_pool_key: string | null;
  damm_v2_pool_key: string | null;
  raw_payload: Json;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
};

type BagsPoolInsert = Omit<BagsPoolRow, 'first_seen_at'>;
type BagsPoolUpdate = Partial<BagsPoolInsert>;

export type BagsCacheStateRow = {
  cache_key: string;
  last_refreshed_at: string;
  expires_at: string;
  source_request_ids: string[];
  rate_limit_remaining: number | null;
  rate_limit_reset: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type BagsCacheStateInsert = Omit<BagsCacheStateRow, 'created_at'>;
type BagsCacheStateUpdate = Partial<BagsCacheStateInsert>;

export type BagsTokenScoreRow = {
  token_mint: string;
  is_eligible: boolean;
  risk_score: number;
  risk_tier: BagsTokenRiskTier;
  filters: Json;
  rejection_reasons: string[];
  warnings: string[];
  creator_wallets: string[];
  creator_payload: Json;
  price_impact_pct: number | null;
  quote_request_id: string | null;
  scored_at: string;
  updated_at: string;
};

type BagsTokenScoreInsert = BagsTokenScoreRow;
type BagsTokenScoreUpdate = Partial<BagsTokenScoreInsert>;

type BagsDiscoveryDatabase = {
  public: {
    Tables: {
      bags_token_launches: {
        Row: BagsTokenLaunchRow;
        Insert: BagsTokenLaunchInsert;
        Update: BagsTokenLaunchUpdate;
        Relationships: [];
      };
      bags_pools: {
        Row: BagsPoolRow;
        Insert: BagsPoolInsert;
        Update: BagsPoolUpdate;
        Relationships: [];
      };
      bags_cache_state: {
        Row: BagsCacheStateRow;
        Insert: BagsCacheStateInsert;
        Update: BagsCacheStateUpdate;
        Relationships: [];
      };
      bags_token_scores: {
        Row: BagsTokenScoreRow;
        Insert: BagsTokenScoreInsert;
        Update: BagsTokenScoreUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export interface BagsDiscoveryCachePayload {
  launches: BagsTokenLaunchRow[];
  eligibleLaunches: BagsTokenLaunchRow[];
  pools: BagsPoolRow[];
  scores: BagsTokenScoreRow[];
  cacheState: BagsCacheStateRow | null;
  scoreCacheState: BagsCacheStateRow | null;
}

export interface RefreshBagsDiscoveryCacheOptions {
  force?: boolean;
}

export interface RefreshBagsDiscoveryCacheResult {
  refreshed: boolean;
  skippedReason?: 'fresh';
  launchCount: number;
  poolCount: number;
  cacheState: BagsCacheStateRow | null;
  minRefreshIntervalMs: number;
  estimatedMaxRequestsPerHour: number;
  rateLimit: ReturnType<typeof getRateLimitStatus>;
}

export interface RefreshBagsTokenScoresOptions {
  force?: boolean;
  limit?: number;
}

export interface RefreshBagsTokenScoresResult {
  refreshed: boolean;
  skippedReason?: 'fresh';
  scoredCount: number;
  eligibleCount: number;
  cacheState: BagsCacheStateRow | null;
  minRefreshIntervalMs: number;
  estimatedMaxRequestsPerHour: number;
  externalRequestsUsed: number;
  rateLimit: ReturnType<typeof getRateLimitStatus>;
}

const DISCOVERY_CACHE_KEY = 'bags_discovery';
const SCORING_CACHE_KEY = 'bags_risk_scores';
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 60 * 1000;
const DEFAULT_SCORING_INTERVAL_MS = 15 * 60 * 1000;
const MIN_SCORING_INTERVAL_MS = 5 * 60 * 1000;
const BAGS_REQUESTS_PER_DISCOVERY_REFRESH = 2;
const BAGS_REQUESTS_PER_SCORE_CANDIDATE = 2;
const BAGS_API_REQUEST_LIMIT_PER_HOUR = 1000;
const DEFAULT_SCORING_CANDIDATE_LIMIT = 20;
const USDC_PRICE_IMPACT_PROBE_AMOUNT = '10000000';

let cachedSupabaseClient: SupabaseClient<BagsDiscoveryDatabase> | null = null;

function getRefreshIntervalMs(): number {
  const configured = Number(process.env.BAGS_DISCOVERY_REFRESH_INTERVAL_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.max(configured, MIN_REFRESH_INTERVAL_MS);
  }

  return DEFAULT_REFRESH_INTERVAL_MS;
}

function getEstimatedMaxRequestsPerHour(intervalMs: number): number {
  return Math.ceil((60 * 60 * 1000 / intervalMs) * BAGS_REQUESTS_PER_DISCOVERY_REFRESH);
}

function getScoringRefreshIntervalMs(): number {
  const configured = Number(process.env.BAGS_SCORING_REFRESH_INTERVAL_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.max(configured, MIN_SCORING_INTERVAL_MS);
  }

  return DEFAULT_SCORING_INTERVAL_MS;
}

function getScoringCandidateLimit(limit?: number): number {
  const configured = Number(process.env.BAGS_SCORING_CANDIDATE_LIMIT);
  const rawLimit = limit ?? (
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_SCORING_CANDIDATE_LIMIT
  );

  return Math.max(1, Math.min(Math.floor(rawLimit), DEFAULT_SCORING_CANDIDATE_LIMIT));
}

function getEstimatedScoringRequestsPerHour(intervalMs: number, candidateLimit: number): number {
  return Math.ceil((60 * 60 * 1000 / intervalMs) * candidateLimit * BAGS_REQUESTS_PER_SCORE_CANDIDATE);
}

function getSupabaseCacheClient(): SupabaseClient<BagsDiscoveryDatabase> {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for server-side Bags discovery cache access'
    );
  }

  cachedSupabaseClient = createClient<BagsDiscoveryDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': 'bagfi-bags-discovery-cache'
      }
    }
  });

  return cachedSupabaseClient;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRateLimitResetIso(reset: number): string | null {
  if (!Number.isFinite(reset) || reset <= 0) {
    return null;
  }

  const resetMs = reset > 10_000_000_000 ? reset : reset * 1000;
  return new Date(resetMs).toISOString();
}

function mapTokenLaunchToRow(launch: TokenLaunch, now: string): BagsTokenLaunchInsert {
  return {
    token_mint: launch.tokenMint,
    name: launch.name,
    symbol: launch.symbol,
    description: normalizeNullableString(launch.description),
    image_url: normalizeNullableString(launch.image),
    status: launch.status,
    twitter_url: normalizeNullableString(launch.twitter),
    website_url: normalizeNullableString(launch.website),
    launch_signature: normalizeNullableString(launch.launchSignature),
    account_keys: launch.accountKeys ?? [],
    num_required_signers: launch.numRequiredSigners ?? null,
    metadata_uri: normalizeNullableString(launch.uri),
    dbc_pool_key: normalizeNullableString(launch.dbcPoolKey),
    dbc_config_key: normalizeNullableString(launch.dbcConfigKey),
    raw_payload: launch as unknown as Json,
    last_seen_at: now,
    updated_at: now
  };
}

function mapPoolToRow(pool: BagsPool, now: string): BagsPoolInsert {
  return {
    token_mint: pool.tokenMint,
    dbc_config_key: normalizeNullableString(pool.dbcConfigKey),
    dbc_pool_key: normalizeNullableString(pool.dbcPoolKey),
    damm_v2_pool_key: normalizeNullableString(pool.dammV2PoolKey),
    raw_payload: pool as unknown as Json,
    last_seen_at: now,
    updated_at: now
  };
}

function assertRefreshCadence(intervalMs: number) {
  const estimatedRequestsPerHour = getEstimatedMaxRequestsPerHour(intervalMs);

  if (estimatedRequestsPerHour > BAGS_API_REQUEST_LIMIT_PER_HOUR) {
    throw new Error(
      `Bags discovery refresh cadence would use ${estimatedRequestsPerHour} requests/hour, above the ${BAGS_API_REQUEST_LIMIT_PER_HOUR} requests/hour limit`
    );
  }
}

function assertScoringCadence(intervalMs: number, candidateLimit: number) {
  const estimatedRequestsPerHour = getEstimatedScoringRequestsPerHour(intervalMs, candidateLimit);

  if (estimatedRequestsPerHour > BAGS_API_REQUEST_LIMIT_PER_HOUR) {
    throw new Error(
      `Bags risk scoring cadence would use ${estimatedRequestsPerHour} requests/hour, above the ${BAGS_API_REQUEST_LIMIT_PER_HOUR} requests/hour limit`
    );
  }
}

async function getCacheState(client: SupabaseClient<BagsDiscoveryDatabase>, cacheKey = DISCOVERY_CACHE_KEY) {
  const { data, error } = await client
    .from('bags_cache_state')
    .select('*')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read Bags discovery cache state: ${error.message}`);
  }

  return data;
}

async function upsertTokenLaunches(
  client: SupabaseClient<BagsDiscoveryDatabase>,
  launches: TokenLaunch[],
  now: string
) {
  if (launches.length === 0) {
    return;
  }

  const { error } = await client
    .from('bags_token_launches')
    .upsert(launches.map((launch) => mapTokenLaunchToRow(launch, now)), {
      onConflict: 'token_mint'
    });

  if (error) {
    throw new Error(`Failed to upsert Bags token launches: ${error.message}`);
  }
}

async function upsertPools(
  client: SupabaseClient<BagsDiscoveryDatabase>,
  pools: BagsPool[],
  now: string
) {
  if (pools.length === 0) {
    return;
  }

  const { error } = await client
    .from('bags_pools')
    .upsert(pools.map((pool) => mapPoolToRow(pool, now)), {
      onConflict: 'token_mint'
    });

  if (error) {
    throw new Error(`Failed to upsert Bags pools: ${error.message}`);
  }
}

async function upsertCacheState(
  client: SupabaseClient<BagsDiscoveryDatabase>,
  state: BagsCacheStateInsert
) {
  const { data, error } = await client
    .from('bags_cache_state')
    .upsert(state, {
      onConflict: 'cache_key'
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to upsert Bags discovery cache state: ${error.message}`);
  }

  return data;
}

async function upsertTokenScores(
  client: SupabaseClient<BagsDiscoveryDatabase>,
  scores: BagsTokenScoreInsert[]
) {
  if (scores.length === 0) {
    return;
  }

  const { error } = await client
    .from('bags_token_scores')
    .upsert(scores, {
      onConflict: 'token_mint'
    });

  if (error) {
    throw new Error(`Failed to upsert Bags token risk scores: ${error.message}`);
  }
}

function mapScoreToRow(params: {
  launch: BagsTokenLaunchRow;
  creators: TokenLaunchCreator[];
  priceImpactRequestId?: string;
  scoredAt: string;
  score: ReturnType<typeof scoreBagsTokenCandidate>;
}): BagsTokenScoreInsert {
  return {
    token_mint: params.launch.token_mint,
    is_eligible: params.score.isEligible,
    risk_score: params.score.riskScore,
    risk_tier: params.score.riskTier,
    filters: params.score.filters,
    rejection_reasons: params.score.rejectionReasons,
    warnings: params.score.warnings,
    creator_wallets: params.score.creatorWallets,
    creator_payload: params.creators as unknown as Json,
    price_impact_pct: params.score.priceImpactPct,
    quote_request_id: params.priceImpactRequestId ?? null,
    scored_at: params.scoredAt,
    updated_at: params.scoredAt
  };
}

export async function getCachedBagsDiscovery(options: {
  launchLimit?: number;
  poolLimit?: number;
  scoreLimit?: number;
  eligibleOnly?: boolean;
} = {}): Promise<BagsDiscoveryCachePayload> {
  const client = getSupabaseCacheClient();
  const launchLimit = options.launchLimit ?? 100;
  const poolLimit = options.poolLimit ?? 250;
  const scoreLimit = options.scoreLimit ?? 250;

  const [launchesResult, poolsResult, scoresResult, state, scoreState] = await Promise.all([
    client
      .from('bags_token_launches')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(launchLimit),
    client
      .from('bags_pools')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(poolLimit),
    client
      .from('bags_token_scores')
      .select('*')
      .order('scored_at', { ascending: false })
      .limit(scoreLimit),
    getCacheState(client),
    getCacheState(client, SCORING_CACHE_KEY)
  ]);

  if (launchesResult.error) {
    throw new Error(`Failed to read cached Bags token launches: ${launchesResult.error.message}`);
  }

  if (poolsResult.error) {
    throw new Error(`Failed to read cached Bags pools: ${poolsResult.error.message}`);
  }

  if (scoresResult.error) {
    throw new Error(`Failed to read cached Bags token scores: ${scoresResult.error.message}`);
  }

  const scores = scoresResult.data ?? [];
  const scoresByMint = new Map(scores.map((score) => [score.token_mint, score]));
  const launches = launchesResult.data ?? [];
  const eligibleLaunches = launches.filter((launch) => scoresByMint.get(launch.token_mint)?.is_eligible === true);

  return {
    launches: options.eligibleOnly ? eligibleLaunches : launches,
    eligibleLaunches,
    pools: poolsResult.data ?? [],
    scores,
    cacheState: state,
    scoreCacheState: scoreState
  };
}

export async function refreshBagsDiscoveryCache(
  options: RefreshBagsDiscoveryCacheOptions = {}
): Promise<RefreshBagsDiscoveryCacheResult> {
  const client = getSupabaseCacheClient();
  const minRefreshIntervalMs = getRefreshIntervalMs();
  assertRefreshCadence(minRefreshIntervalMs);

  const existingState = await getCacheState(client);
  const nowMs = Date.now();

  if (
    !options.force &&
    existingState?.expires_at &&
    new Date(existingState.expires_at).getTime() > nowMs
  ) {
    const metadata = existingState.metadata as {
      launchCount?: number;
      poolCount?: number;
    } | null;

    return {
      refreshed: false,
      skippedReason: 'fresh',
      launchCount: metadata?.launchCount ?? 0,
      poolCount: metadata?.poolCount ?? 0,
      cacheState: existingState,
      minRefreshIntervalMs,
      estimatedMaxRequestsPerHour: getEstimatedMaxRequestsPerHour(minRefreshIntervalMs),
      rateLimit: getRateLimitStatus()
    };
  }

  const now = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + minRefreshIntervalMs).toISOString();
  const [launchFeedResponse, poolsResponse] = await Promise.all([
    getTokenLaunchFeed(),
    getBagsPools({ onlyMigrated: false })
  ]);

  await upsertTokenLaunches(client, launchFeedResponse.data.launches, now);
  await upsertPools(client, poolsResponse.data.pools, now);

  const rateLimit = getRateLimitStatus();
  const requestIds = [launchFeedResponse.requestId, poolsResponse.requestId].filter(
    (requestId): requestId is string => Boolean(requestId)
  );

  const cacheState = await upsertCacheState(client, {
    cache_key: DISCOVERY_CACHE_KEY,
    last_refreshed_at: now,
    expires_at: expiresAt,
    source_request_ids: requestIds,
    rate_limit_remaining: rateLimit.remaining,
    rate_limit_reset: toRateLimitResetIso(rateLimit.reset),
    metadata: {
      launchCount: launchFeedResponse.data.launches.length,
      poolCount: poolsResponse.data.pools.length,
      requestsPerRefresh: BAGS_REQUESTS_PER_DISCOVERY_REFRESH,
      estimatedMaxRequestsPerHour: getEstimatedMaxRequestsPerHour(minRefreshIntervalMs)
    },
    updated_at: now
  });

  return {
    refreshed: true,
    launchCount: launchFeedResponse.data.launches.length,
    poolCount: poolsResponse.data.pools.length,
    cacheState,
    minRefreshIntervalMs,
    estimatedMaxRequestsPerHour: getEstimatedMaxRequestsPerHour(minRefreshIntervalMs),
    rateLimit
  };
}

export async function refreshBagsTokenScores(
  options: RefreshBagsTokenScoresOptions = {}
): Promise<RefreshBagsTokenScoresResult> {
  const client = getSupabaseCacheClient();
  const candidateLimit = getScoringCandidateLimit(options.limit);
  const minRefreshIntervalMs = getScoringRefreshIntervalMs();
  assertScoringCadence(minRefreshIntervalMs, candidateLimit);

  const existingState = await getCacheState(client, SCORING_CACHE_KEY);
  const nowMs = Date.now();

  if (
    !options.force &&
    existingState?.expires_at &&
    new Date(existingState.expires_at).getTime() > nowMs
  ) {
    const metadata = existingState.metadata as {
      scoredCount?: number;
      eligibleCount?: number;
      externalRequestsUsed?: number;
    } | null;

    return {
      refreshed: false,
      skippedReason: 'fresh',
      scoredCount: metadata?.scoredCount ?? 0,
      eligibleCount: metadata?.eligibleCount ?? 0,
      cacheState: existingState,
      minRefreshIntervalMs,
      estimatedMaxRequestsPerHour: getEstimatedScoringRequestsPerHour(minRefreshIntervalMs, candidateLimit),
      externalRequestsUsed: metadata?.externalRequestsUsed ?? 0,
      rateLimit: getRateLimitStatus()
    };
  }

  const { launches, pools } = await getCachedBagsDiscovery({
    launchLimit: candidateLimit * 2,
    poolLimit: candidateLimit * 3,
    scoreLimit: candidateLimit * 3
  });
  const poolsByMint = new Map(pools.map((pool) => [pool.token_mint, pool]));
  const candidates = launches
    .filter((launch) => launch.status === 'LAUNCHED')
    .slice(0, candidateLimit);
  const scoredAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + minRefreshIntervalMs).toISOString();
  const scoreRows: BagsTokenScoreInsert[] = [];
  const requestIds: string[] = [];
  let externalRequestsUsed = 0;

  for (const launch of candidates) {
    const pool = poolsByMint.get(launch.token_mint);
    let creators: TokenLaunchCreator[] = [];
    let priceImpactPct: number | null = null;
    let quoteRequestId: string | undefined;
    const externalErrors: {
      creators?: string;
      priceImpact?: string;
    } = {};

    try {
      const creatorsResponse = await getTokenLaunchCreators(launch.token_mint);
      externalRequestsUsed += 1;
      if (creatorsResponse.requestId) {
        requestIds.push(creatorsResponse.requestId);
      }
      creators = creatorsResponse.data.creators;
    } catch (error) {
      externalRequestsUsed += 1;
      externalErrors.creators = error instanceof Error ? error.message : 'Creator lookup failed';
    }

    try {
      const quoteResponse = await getTradeQuote({
        inputMint: SOLANA_TOKENS.USDC.mint,
        outputMint: launch.token_mint,
        amount: process.env.BAGS_SCORING_PRICE_IMPACT_PROBE_USDC_UNITS || USDC_PRICE_IMPACT_PROBE_AMOUNT,
        slippageMode: 'auto'
      });
      externalRequestsUsed += 1;
      quoteRequestId = quoteResponse.requestId || quoteResponse.data.requestId;
      if (quoteRequestId) {
        requestIds.push(quoteRequestId);
      }
      priceImpactPct = Number.parseFloat(quoteResponse.data.priceImpactPct);
    } catch (error) {
      externalRequestsUsed += 1;
      externalErrors.priceImpact = error instanceof Error ? error.message : 'Price impact probe failed';
    }

    const score = scoreBagsTokenCandidate({
      launch,
      pool,
      creators,
      priceImpactPct,
      externalErrors
    });

    scoreRows.push(mapScoreToRow({
      launch,
      creators,
      priceImpactRequestId: quoteRequestId,
      scoredAt,
      score
    }));
  }

  await upsertTokenScores(client, scoreRows);

  const eligibleCount = scoreRows.filter((score) => score.is_eligible).length;
  const rateLimit = getRateLimitStatus();
  const cacheState = await upsertCacheState(client, {
    cache_key: SCORING_CACHE_KEY,
    last_refreshed_at: scoredAt,
    expires_at: expiresAt,
    source_request_ids: requestIds,
    rate_limit_remaining: rateLimit.remaining,
    rate_limit_reset: toRateLimitResetIso(rateLimit.reset),
    metadata: {
      scoredCount: scoreRows.length,
      eligibleCount,
      candidateLimit,
      requestsPerCandidate: BAGS_REQUESTS_PER_SCORE_CANDIDATE,
      externalRequestsUsed,
      estimatedMaxRequestsPerHour: getEstimatedScoringRequestsPerHour(minRefreshIntervalMs, candidateLimit)
    },
    updated_at: scoredAt
  });

  return {
    refreshed: true,
    scoredCount: scoreRows.length,
    eligibleCount,
    cacheState,
    minRefreshIntervalMs,
    estimatedMaxRequestsPerHour: getEstimatedScoringRequestsPerHour(minRefreshIntervalMs, candidateLimit),
    externalRequestsUsed,
    rateLimit
  };
}
