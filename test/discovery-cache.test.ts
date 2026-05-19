import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedBagsDiscovery,
  refreshBagsDiscoveryCache 
} from '@/lib/bags/discovery-cache';
import { getTokenLaunchFeed, getBagsPools } from '@/lib/bags/client';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
  
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => mockFrom),
    }))
  };
});

// Mock Bags client
vi.mock('@/lib/bags/client', () => ({
  getTokenLaunchFeed: vi.fn(),
  getBagsPools: vi.fn(),
  getRateLimitStatus: vi.fn(() => ({ remaining: 1000, reset: 0, limit: 1000 })),
  BagsApiError: class extends Error {
    constructor(message: string, public statusCode: number, public code: string) {
      super(message);
    }
  }
}));

describe('Bags Discovery Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  describe('refreshBagsDiscoveryCache', () => {
    it('should fetch and upsert discovery data', async () => {
      vi.mocked(getTokenLaunchFeed).mockResolvedValue({
        success: true,
        data: { launches: [], total: 0 },
        requestId: 'req1',
        rateLimit: { remaining: 1000, reset: 0, limit: 1000 }
      });
      vi.mocked(getBagsPools).mockResolvedValue({
        success: true,
        data: { pools: [], total: 0 },
        requestId: 'req2',
        rateLimit: { remaining: 1000, reset: 0, limit: 1000 }
      });

      const result = await refreshBagsDiscoveryCache({ force: true });

      expect(result.refreshed).toBe(true);
      expect(getTokenLaunchFeed).toHaveBeenCalled();
      expect(getBagsPools).toHaveBeenCalled();
    });
  });
});
