import { describe, it, expect } from 'vitest';
import { scoreBagsTokenCandidate } from '@/lib/bags/risk-scoring';

describe('Bags Risk Scoring', () => {
  const mockLaunch = {
    token_mint: 'mint1',
    name: 'Safe Token',
    symbol: 'SAFE',
    status: 'LAUNCHED',
    image_url: 'https://example.com/img.png',
    metadata_uri: 'https://example.com/meta',
    twitter_url: 'https://twitter.com/safe',
    raw_payload: {}
  };

  const mockPool = {
    token_mint: 'mint1',
    dbc_pool_key: 'pool1',
    damm_v2_pool_key: 'damm1',
    raw_payload: {}
  };

  const mockCreators = [
    { 
      wallet: 'creator1', 
      isCreator: true, 
      royaltyBps: 100, 
      provider: 'twitter', 
      twitterUsername: 'safe_dev' 
    }
  ];

  it('should return high score and eligibility for healthy token', () => {
    const result = scoreBagsTokenCandidate({
      launch: mockLaunch as any,
      pool: mockPool as any,
      creators: mockCreators as any,
      priceImpactPct: 0.5
    });

    expect(result.isEligible).toBe(true);
    expect(result.riskScore).toBeGreaterThan(80);
    expect(result.riskTier).toBe('low');
  });

  it('should reject token with high price impact', () => {
    const result = scoreBagsTokenCandidate({
      launch: mockLaunch as any,
      pool: mockPool as any,
      creators: mockCreators as any,
      priceImpactPct: 6.0 // Above 5% threshold
    });

    expect(result.isEligible).toBe(false);
    expect(result.rejectionReasons).toContain('price_impact_too_high');
  });

  it('should reject token with no pool', () => {
    const result = scoreBagsTokenCandidate({
      launch: mockLaunch as any,
      pool: null,
      creators: mockCreators as any,
      priceImpactPct: null
    });

    expect(result.isEligible).toBe(false);
    expect(result.rejectionReasons).toContain('pool_state_missing');
  });

  it('should warn about high creator royalty', () => {
    const greedyCreators = [
      { 
        wallet: 'creator1', 
        isCreator: true, 
        royaltyBps: 8000, 
        provider: 'twitter', 
        twitterUsername: 'greedy_dev' 
      } // 80% (Threshold is 75%)
    ];
    const result = scoreBagsTokenCandidate({
      launch: mockLaunch as any,
      pool: mockPool as any,
      creators: greedyCreators as any,
      priceImpactPct: 0.5
    });

    expect(result.warnings).toContain('creator_royalty_concentration_high');
  });
});
