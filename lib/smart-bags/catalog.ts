import type { SmartBagTemplate, TokenInfo } from './session-engine';

export const SOLANA_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    icon: 'S',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    icon: 'U',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    icon: 'T',
  },
  JUP: {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    icon: 'J',
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    icon: 'B',
  },
  JITOSOL: {
    symbol: 'JitoSOL',
    name: 'Jito Staked SOL',
    mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    decimals: 9,
    icon: 'J',
  },
  PYTH: {
    symbol: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    icon: 'P',
  },
  DRIFT: {
    symbol: 'DRIFT',
    name: 'Drift Protocol',
    mint: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
    decimals: 6,
    icon: 'D',
  },
  JTO: {
    symbol: 'JTO',
    name: 'Jito',
    mint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
    decimals: 9,
    icon: 'J',
  },
  WIF: {
    symbol: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    icon: 'W',
  },
} satisfies Record<string, TokenInfo>;

export const DEPOSIT_TOKENS = [
  SOLANA_TOKENS.SOL,
  SOLANA_TOKENS.USDC,
] satisfies TokenInfo[];

export const SMART_BAGS: SmartBagTemplate[] = [
  {
    id: 'solana-blue-chip',
    title: 'Solana Blue Chip Bag',
    description: 'A balanced portfolio of Solana\'s most liquid and established assets, combining native SOL with top-tier infrastructure and liquid staking.',
    strategy: 'Index-weighted core',
    metricLabel: 'Rebalance',
    metricValue: '5% drift',
    risk: 'Medium',
    maxSlippageBps: 50,
    rebalanceThresholdBps: 500,
    assets: [
      { ...SOLANA_TOKENS.SOL, allocationBps: 4000 },
      { ...SOLANA_TOKENS.JITOSOL, allocationBps: 3000 },
      { ...SOLANA_TOKENS.JUP, allocationBps: 2000 },
      { ...SOLANA_TOKENS.USDC, allocationBps: 1000 },
    ],
  },
  {
    id: 'solana-defi-growth',
    title: 'Solana DeFi Growth Bag',
    description: 'Focused on high-velocity DeFi protocols and infrastructure assets driving the Solana on-chain economy.',
    strategy: 'Aggressive ecosystem',
    metricLabel: 'Max slippage',
    metricValue: '1.00%',
    risk: 'High',
    maxSlippageBps: 100,
    rebalanceThresholdBps: 700,
    assets: [
      { ...SOLANA_TOKENS.JUP, allocationBps: 3000 },
      { ...SOLANA_TOKENS.PYTH, allocationBps: 2000 },
      { ...SOLANA_TOKENS.DRIFT, allocationBps: 2000 },
      { ...SOLANA_TOKENS.SOL, allocationBps: 2000 },
      { ...SOLANA_TOKENS.JTO, allocationBps: 1000 },
    ],
  },
  {
    id: 'stable-reserve',
    title: 'Stable Reserve Bag',
    description: 'A conservative basket of primary stablecoins on Solana, with a modest SOL sleeve for network fees and upside exposure.',
    strategy: 'Capital preservation',
    metricLabel: 'Max slippage',
    metricValue: '0.25%',
    risk: 'Low',
    maxSlippageBps: 25,
    rebalanceThresholdBps: 300,
    assets: [
      { ...SOLANA_TOKENS.USDC, allocationBps: 6000 },
      { ...SOLANA_TOKENS.USDT, allocationBps: 3000 },
      { ...SOLANA_TOKENS.SOL, allocationBps: 1000 },
    ],
  },
];

export function getSmartBagTemplate(id: string) {
  return SMART_BAGS.find((bag) => bag.id === id);
}
