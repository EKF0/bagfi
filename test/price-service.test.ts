import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTokenPrices, getTokenPriceUsd, getWalletBalances, resetPriceCache } from '@/lib/solana/balances';
import { Connection, PublicKey } from '@solana/web3.js';

describe('Solana Pricing and Balance Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetPriceCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch prices from Jupiter API v3 and merge with fallback map', async () => {
    const mockResponse = {
      So11111111111111111111111111111111111111112: {
        usdPrice: 155.50
      },
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
        usdPrice: 0.999
      }
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const prices = await fetchTokenPrices([
      'So11111111111111111111111111111111111111112',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    expect(prices['So11111111111111111111111111111111111111112']).toBe(155.50);
    expect(prices['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']).toBe(0.999);
    // Non-queried tokens should get fallback values from catalogs
    expect(prices['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB']).toBe(1.0); // USDT fallback
  });

  it('should fall back to cache or fallback map when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const prices = await fetchTokenPrices(['So11111111111111111111111111111111111111112']);
    
    // Should fall back to the fallback price map
    expect(prices['So11111111111111111111111111111111111111112']).toBe(180.0);
  });

  it('should synchronously return price from cache or fallback in getTokenPriceUsd', () => {
    const price = getTokenPriceUsd('So11111111111111111111111111111111111111112');
    expect(price).toBe(180.0);
  });

  it('should enrich and sort balances in getWalletBalances using fetched prices', async () => {
    // Mock connection calls
    const mockConnection = {
      getBalance: vi.fn().mockResolvedValue(10 * 1e9), // 10 SOL
      getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                    tokenAmount: {
                      amount: '50000000',
                      decimals: 6,
                      uiAmount: 50
                    }
                  }
                }
              }
            }
          }
        ]
      })
    } as unknown as Connection;

    const mockResponse = {
      So11111111111111111111111111111111111111112: {
        usdPrice: 150.0
      },
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
        usdPrice: 1.0
      }
    };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const publicKey = new PublicKey('So11111111111111111111111111111111111111112');
    const result = await getWalletBalances(mockConnection, publicKey);

    expect(result.balances.length).toBe(2);
    expect(result.balances[0].symbol).toBe('SOL');
    expect(result.balances[0].priceUsd).toBe(150.0);
    expect(result.balances[0].valueUsd).toBe(1500.0); // 10 SOL * $150

    expect(result.balances[1].symbol).toBe('USDC');
    expect(result.balances[1].priceUsd).toBe(1.0);
    expect(result.balances[1].valueUsd).toBe(50.0); // 50 USDC * $1.0

    expect(result.totalValueUsd).toBe(1550.0);
  });
});
