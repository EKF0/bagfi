import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getQuote } from '@/app/api/bags/quote/route';
import { POST as createSwap } from '@/app/api/bags/swap/route';
import { getTradeQuote, createSwapTransaction, BagsApiError } from '@/lib/bags/client';
import { NextRequest } from 'next/server';

// Mock the Bags client
vi.mock('@/lib/bags/client', () => ({
  getTradeQuote: vi.fn(),
  createSwapTransaction: vi.fn(),
  BagsApiError: class extends Error {
    constructor(message: string, public statusCode: number, public code: string) {
      super(message);
    }
  }
}));

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  default: {
    trackApiRequest: vi.fn()
  }
}));

describe('Bags API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bags/quote', () => {
    const validMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

    it('should return 400 if required parameters are missing', async () => {
      const req = new NextRequest(`http://localhost/api/bags/quote?inputMint=${validMint}`);
      const res = await getQuote(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 if mint addresses are invalid', async () => {
      const req = new NextRequest(`http://localhost/api/bags/quote?inputMint=invalid&outputMint=${validMint}&amount=1000`);
      const res = await getQuote(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid inputMint');
    });

    it('should return quote successfully', async () => {
      const mockQuote = {
        success: true,
        data: { inputAmount: '1000', outputAmount: '500' },
        requestId: 'test-id'
      };
      vi.mocked(getTradeQuote).mockResolvedValue(mockQuote as any);

      const req = new NextRequest(`http://localhost/api/bags/quote?inputMint=${validMint}&outputMint=${validMint}&amount=1000`);
      const res = await getQuote(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.inputAmount).toBe('1000');
    });

    it('should forward BagsApiError status code', async () => {
      vi.mocked(getTradeQuote).mockRejectedValue(new BagsApiError('Rate limit', 429, 'RATE_LIMIT'));

      const req = new NextRequest(`http://localhost/api/bags/quote?inputMint=${validMint}&outputMint=${validMint}&amount=1000`);
      const res = await getQuote(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe('Rate limit');
    });
  });

  describe('POST /api/bags/swap', () => {
    it('should return 400 if userPublicKey is missing', async () => {
      const req = new NextRequest('http://localhost/api/bags/swap', {
        method: 'POST',
        body: JSON.stringify({ quoteResponse: {} })
      });
      const res = await createSwap(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('userPublicKey');
    });

    it('should return swap transaction successfully', async () => {
      const mockTx = {
        success: true,
        data: { swapTransaction: 'base64' },
        requestId: 'test-id'
      };
      vi.mocked(createSwapTransaction).mockResolvedValue(mockTx as any);

      const req = new NextRequest('http://localhost/api/bags/swap', {
        method: 'POST',
        body: JSON.stringify({ 
          quoteResponse: { routePlan: [], slippageBps: 50 }, 
          userPublicKey: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' 
        })
      });
      const res = await createSwap(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.swapTransaction).toBe('base64');
    });
  });
});
