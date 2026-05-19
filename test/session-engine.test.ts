import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateSmartBagTemplate,
  splitDepositAmount,
  createSmartBagDepositSession 
} from '@/lib/smart-bags/session-engine';
import { SOLANA_TOKENS } from '@/lib/smart-bags/catalog';

describe('Smart Bag Session Engine', () => {
  const mockTemplate = {
    id: 'test-bag',
    title: 'Test Bag',
    description: 'Test Description',
    strategy: 'Test Strategy',
    metricLabel: 'Test Metric',
    metricValue: '10%',
    risk: 'Medium' as const,
    maxSlippageBps: 100,
    rebalanceThresholdBps: 500,
    assets: [
      { ...SOLANA_TOKENS.SOL, allocationBps: 4000 },
      { ...SOLANA_TOKENS.USDC, allocationBps: 6000 },
    ],
  };

  describe('validateSmartBagTemplate', () => {
    it('should not throw for 10000 bps', () => {
      expect(() => validateSmartBagTemplate(mockTemplate)).not.toThrow();
    });

    it('should throw for incorrect bps', () => {
      const invalidTemplate = {
        ...mockTemplate,
        assets: [{ ...SOLANA_TOKENS.SOL, allocationBps: 5000 }]
      };
      expect(() => validateSmartBagTemplate(invalidTemplate)).toThrow('allocations must total 100%');
    });
  });

  describe('splitDepositAmount', () => {
    it('should correctly split amount by bps', () => {
      const splits = splitDepositAmount('1000000', mockTemplate, 6);
      
      expect(splits).toHaveLength(2);
      expect(splits[0].targetSymbol).toBe('SOL');
      expect(splits[0].inputAmount).toBe('400000');
      expect(splits[1].targetSymbol).toBe('USDC');
      expect(splits[1].inputAmount).toBe('600000');
    });

    it('should handle remainder in the last asset', () => {
      const template3 = {
        ...mockTemplate,
        assets: [
          { ...SOLANA_TOKENS.SOL, allocationBps: 3333 },
          { ...SOLANA_TOKENS.USDC, allocationBps: 3333 },
          { ...SOLANA_TOKENS.USDT, allocationBps: 3334 },
        ]
      };
      const splits = splitDepositAmount('100', template3, 6);
      
      expect(splits[0].inputAmount).toBe('33');
      expect(splits[1].inputAmount).toBe('33');
      expect(splits[2].inputAmount).toBe('34'); // 100 - 33 - 33
      
      const total = splits.reduce((sum, s) => sum + BigInt(s.inputAmount), BigInt(0));
      expect(total).toBe(BigInt(100));
    });
  });

  describe('createSmartBagDepositSession', () => {
    it('should create a valid draft session', () => {
      const session = createSmartBagDepositSession({
        template: mockTemplate,
        walletAddress: 'user-pubkey',
        inputToken: SOLANA_TOKENS.USDC,
        inputAmount: '1.0',
        slippageBps: 50
      });

      expect(session.status).toBe('draft');
      expect(session.bagId).toBe('test-bag');
      expect(session.allocationSplits).toHaveLength(2);
      expect(session.inputAmountBaseUnits).toBe('1000000'); // 1.0 USDC (6 decimals)
    });

    it('should throw if slippage exceeds bag limit', () => {
      expect(() => createSmartBagDepositSession({
        template: mockTemplate,
        walletAddress: 'user-pubkey',
        inputToken: SOLANA_TOKENS.USDC,
        inputAmount: '1.0',
        slippageBps: 200 // exceeds 100 bps
      })).toThrow('Slippage exceeds this bag\'s 1.00% limit');
    });
  });
});
