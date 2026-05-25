/**
 * Solana Wallet Balance Fetcher
 * Retrieves native SOL and all SPL token balances for a connected wallet.
 * Enriches balances with token metadata from the Smart Bag catalog.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SOLANA_TOKENS } from '@/lib/smart-bags/catalog';

// ── Types ───────────────────────────────────────────────────────────────

export interface WalletTokenBalance {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;      // raw base-unit string
  balanceUi: number;    // human-readable decimal
  icon: string;
  priceUsd: number;
  valueUsd: number;
}

export interface WalletBalanceResult {
  balances: WalletTokenBalance[];
  totalValueUsd: number;
  fetchedAt: string;
}

// ── Fallback Price Map ──────────────────────────────────────────────────
// Used as a fail-safe default when Jupiter API is rate-limited or offline.
const FALLBACK_PRICE_MAP: Record<string, number> = {
  So11111111111111111111111111111111111111112: 180.0,         // SOL
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 1.0,       // USDC
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 1.0,        // USDT
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 0.88,        // JUP
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 0.000013,  // BONK
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: 200.0,     // JitoSOL
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: 0.45,       // PYTH
  DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7: 0.60,       // DRIFT
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: 2.80,        // JTO
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: 2.50,        // WIF
};

// In-memory cache for dynamic prices to avoid spamming the Jupiter API
interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

let priceCache: PriceCache | null = null;
const CACHE_DURATION_MS = 30 * 1000; // 30 seconds cache duration

/**
 * Fetches token prices from Jupiter Price API v3 for a list of mints.
 * Updates the in-memory cache and returns the prices.
 */
export async function fetchTokenPrices(mints: string[]): Promise<Record<string, number>> {
  // If cache is fresh, return it
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION_MS) {
    return priceCache.prices;
  }

  const uniqueMints = Array.from(new Set(mints)).filter(Boolean);
  if (uniqueMints.length === 0) {
    return priceCache ? priceCache.prices : FALLBACK_PRICE_MAP;
  }

  try {
    const url = `https://api.jup.ag/price/v3?ids=${uniqueMints.join(',')}`;
    const startTime = Date.now();
    const res = await fetch(url);
    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`Jupiter Price API returned status ${res.status}`);
    }

    const json = await res.json() as Record<string, { usdPrice?: number }>;
    const fetchedPrices: Record<string, number> = {};

    for (const [mint, info] of Object.entries(json)) {
      if (info && typeof info.usdPrice === 'number') {
        fetchedPrices[mint] = info.usdPrice;
      }
    }

    // Merge fetched prices with fallback prices for any missing catalog tokens
    const prices: Record<string, number> = {
      ...FALLBACK_PRICE_MAP,
      ...fetchedPrices,
    };

    // Update cache
    priceCache = {
      prices,
      timestamp: Date.now(),
    };

    return prices;
  } catch (err) {
    console.error('[Pricing] Error fetching token prices from Jupiter:', err);
    
    // If we have a stale cache, use it as fallback rather than hardcoded map
    if (priceCache) {
      return priceCache.prices;
    }

    // Otherwise, return fallback map
    return FALLBACK_PRICE_MAP;
  }
}

// ── Known Token Metadata ────────────────────────────────────────────────

interface KnownToken {
  symbol: string;
  name: string;
  icon: string;
}

const KNOWN_TOKENS: Record<string, KnownToken> = {};
for (const token of Object.values(SOLANA_TOKENS)) {
  KNOWN_TOKENS[token.mint] = {
    symbol: token.symbol,
    name: token.name,
    icon: token.icon ?? token.symbol[0],
  };
}

// Minimum UI balance to include (filters dust accounts)
const DUST_THRESHOLD = 0.0001;

// ── Core Fetch ──────────────────────────────────────────────────────────

export async function getWalletBalances(
  connection: Connection,
  publicKey: PublicKey
): Promise<WalletBalanceResult> {
  // Fetch native SOL and all SPL tokens in parallel
  const [solLamports, tokenAccounts] = await Promise.all([
    connection.getBalance(publicKey, 'confirmed'),
    connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID },
      'confirmed'
    ),
  ]);

  const solMint = 'So11111111111111111111111111111111111111112';
  const solBalanceUi = solLamports / 1e9;
  
  // Gather all unique mints to fetch prices in one batch
  const mintsToPrice = new Set<string>();
  if (solBalanceUi >= DUST_THRESHOLD) {
    mintsToPrice.add(solMint);
  }
  
  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed?.info;
    if (!parsed) continue;
    const mint: string = parsed.mint;
    const balanceUi: number = parsed.tokenAmount?.uiAmount ?? 0;
    if (balanceUi >= DUST_THRESHOLD) {
      mintsToPrice.add(mint);
    }
  }

  // Fetch prices in bulk
  const prices = await fetchTokenPrices(Array.from(mintsToPrice));

  const balances: WalletTokenBalance[] = [];

  // ── Native SOL ──────────────────────────────────────────────────────
  if (solBalanceUi >= DUST_THRESHOLD) {
    const solPrice = prices[solMint] ?? FALLBACK_PRICE_MAP[solMint] ?? 0;
    balances.push({
      mint: solMint,
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      balance: solLamports.toString(),
      balanceUi: solBalanceUi,
      icon: 'S',
      priceUsd: solPrice,
      valueUsd: solBalanceUi * solPrice,
    });
  }

  // ── SPL Tokens ──────────────────────────────────────────────────────
  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed?.info;
    if (!parsed) continue;

    const mint: string = parsed.mint;
    const decimals: number = parsed.tokenAmount?.decimals ?? 0;
    const balanceUi: number = parsed.tokenAmount?.uiAmount ?? 0;
    const balanceRaw: string = parsed.tokenAmount?.amount ?? '0';

    if (balanceUi < DUST_THRESHOLD) continue;

    const known = KNOWN_TOKENS[mint];
    const price = prices[mint] ?? FALLBACK_PRICE_MAP[mint] ?? 0;

    balances.push({
      mint,
      symbol: known?.symbol ?? mint.slice(0, 4) + '…',
      name: known?.name ?? 'Unknown Token',
      decimals,
      balance: balanceRaw,
      balanceUi,
      icon: known?.icon ?? '?',
      priceUsd: price,
      valueUsd: balanceUi * price,
    });
  }

  // Sort by USD value descending
  balances.sort((a, b) => b.valueUsd - a.valueUsd);

  const totalValueUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);

  return {
    balances,
    totalValueUsd,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get the USD price for a specific mint.
 * Uses cached prices if available, otherwise returns the fallback value.
 */
export function getTokenPriceUsd(mint: string): number {
  if (priceCache) {
    return priceCache.prices[mint] ?? FALLBACK_PRICE_MAP[mint] ?? 0;
  }
  return FALLBACK_PRICE_MAP[mint] ?? 0;
}

/**
 * Resets the in-memory price cache.
 * Useful for testing and force-refreshing pricing data.
 */
export function resetPriceCache(): void {
  priceCache = null;
}
