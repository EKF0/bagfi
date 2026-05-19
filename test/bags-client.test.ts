import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getTokenLaunchFeed, 
  getTradeQuote,
  createSwapTransaction,
  getTokenLaunchCreators,
  BagsApiError 
} from '@/lib/bags/client';

// Mock global fetch
global.fetch = vi.fn();

describe('Bags API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.BAGS_API_KEY = 'test-api-key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTokenLaunchFeed', () => {
    it('should fetch token launch feed successfully', async () => {
      const mockResponse = {
        success: true,
        response: [
          { tokenMint: 'mint1', name: 'Token 1', symbol: 'TK1', status: 'LAUNCHED' }
        ]
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({
          'x-ratelimit-remaining': '999',
          'x-ratelimit-reset': '1716112345',
          'x-ratelimit-limit': '1000'
        }),
        json: async () => mockResponse
      });

      const result = await getTokenLaunchFeed();

      expect(result.success).toBe(true);
      expect(result.data.launches).toHaveLength(1);
      expect(result.data.launches[0].tokenMint).toBe('mint1');
    });

    it('should throw BagsApiError on 500 error after all retries', async () => {
      const mockError = { success: false, error: 'Bags explode' };
      
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => mockError
      });

      // To avoid unhandled rejection, we must catch it
      const promise = getTokenLaunchFeed().catch(e => {
        if (!(e instanceof BagsApiError)) throw e;
        return e;
      });
      
      // Fast-forward through retries
      for (let i = 0; i < 4; i++) {
        await vi.runAllTimersAsync();
      }

      const result = await promise;
      expect(result).toBeInstanceOf(BagsApiError);
      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('getTradeQuote', () => {
    it('should fetch trade quote with correct params', async () => {
      const mockQuote = {
        success: true,
        response: {
          inputAmount: '1000000',
          outputAmount: '500000',
          priceImpactPct: '0.5',
          routePlan: []
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => mockQuote
      });

      const result = await getTradeQuote({
        inputMint: 'input-mint',
        outputMint: 'output-mint',
        amount: '1000000',
        slippageMode: 'auto'
      });

      expect(result.success).toBe(true);
      expect(result.data.inputAmount).toBe('1000000');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('inputMint=input-mint'),
        expect.any(Object)
      );
    });
  });

  describe('createSwapTransaction', () => {
    it('should return serialized transaction on success', async () => {
      const mockTx = {
        success: true,
        response: {
          swapTransaction: 'base64-tx-data',
          lastValidBlockHeight: 123456789
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => mockTx
      });

      const result = await createSwapTransaction({
        quoteResponse: {} as any,
        userPublicKey: 'user-pubkey'
      });

      expect(result.success).toBe(true);
      expect(result.data.swapTransaction).toBe('base64-tx-data');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/trade/swap'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('getTokenLaunchCreators', () => {
    it('should fetch creators successfully', async () => {
      const mockCreators = {
        success: true,
        response: [
          { wallet: 'wallet1', isCreator: true, username: 'creator1' }
        ]
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => mockCreators
      });

      const result = await getTokenLaunchCreators('mint1');

      expect(result.success).toBe(true);
      expect(result.data.creators).toHaveLength(1);
      expect(result.data.creators[0].wallet).toBe('wallet1');
    });
  });
});
