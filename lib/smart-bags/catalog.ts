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
} satisfies Record<string, TokenInfo>;

export const DEPOSIT_TOKENS = [
  SOLANA_TOKENS.SOL,
  SOLANA_TOKENS.USDC,
] satisfies TokenInfo[];

export const SMART_BAGS: SmartBagTemplate[] = [
  {
    id: 'solana-core',
    title: 'Solana Core Bag',
    description: 'Core Solana exposure with liquid network, staking, routing, and stable reserve assets.',
    strategy: 'Core allocation',
    metricLabel: 'Rebalance',
    metricValue: '5% drift',
    risk: 'Medium',
    maxSlippageBps: 75,
    rebalanceThresholdBps: 500,
    assets: [
      { ...SOLANA_TOKENS.SOL, allocationBps: 4000 },
      { ...SOLANA_TOKENS.JITOSOL, allocationBps: 2500 },
      { ...SOLANA_TOKENS.JUP, allocationBps: 2000 },
      { ...SOLANA_TOKENS.USDC, allocationBps: 1500 },
    ],
  },
  {
    id: 'bags-liquidity-leaders',
    title: 'Liquidity Leaders Bag',
    description: 'A higher-volatility basket focused on heavily routed Solana trading assets with stablecoin ballast.',
    strategy: 'Liquidity momentum',
    metricLabel: 'Max slippage',
    metricValue: '1.00%',
    risk: 'High',
    maxSlippageBps: 100,
    rebalanceThresholdBps: 700,
    assets: [
      { ...SOLANA_TOKENS.JUP, allocationBps: 3500 },
      { ...SOLANA_TOKENS.BONK, allocationBps: 2500 },
      { ...SOLANA_TOKENS.SOL, allocationBps: 2500 },
      { ...SOLANA_TOKENS.USDC, allocationBps: 1500 },
    ],
  },
  {
    id: 'stable-reserve',
    title: 'Stable Reserve Bag',
    description: 'A conservative Solana stable basket with a modest SOL sleeve for network fee and upside exposure.',
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
