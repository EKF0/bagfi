export type SmartBagRisk = 'Low' | 'Medium' | 'High';

export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  icon?: string;
}

export interface SmartBagAsset extends TokenInfo {
  allocationBps: number;
}

export interface SmartBagTemplate {
  id: string;
  title: string;
  description: string;
  strategy: string;
  metricLabel: string;
  metricValue: string;
  risk: SmartBagRisk;
  maxSlippageBps: number;
  rebalanceThresholdBps: number;
  assets: SmartBagAsset[];
}

export interface SmartBagAllocationSplit {
  id: string;
  targetSymbol: string;
  targetMint: string;
  targetDecimals: number;
  allocationBps: number;
  inputAmount: string;
  inputAmountUi: string;
}

export interface SmartBagRoutePlanStep {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface SmartBagQuoteSnapshot {
  id: string;
  splitId: string;
  targetSymbol: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: SmartBagRoutePlanStep[];
  swapTransaction?: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  requestId?: string;
  createdAt: string;
  status: 'direct' | 'quoted' | 'error';
  error?: string;
}

export interface SmartBagSessionReceipt {
  id: string;
  quoteSnapshotId: string;
  targetSymbol: string;
  targetMint: string;
  status: 'skipped' | 'signed' | 'confirmed' | 'failed';
  signature?: string;
  signedAt: string;
  confirmedAt?: string;
  error?: string;
}

export interface SmartBagDepositSession {
  id: string;
  type: 'deposit' | 'rebalance';
  bagId: string;
  bagTitle: string;
  walletAddress: string;
  inputToken: TokenInfo;
  inputAmount: string;
  inputAmountBaseUnits: string;
  slippageBps: number;
  maxSlippageBps: number;
  rebalanceThresholdBps: number;
  allocationSplits: SmartBagAllocationSplit[];
  quoteSnapshots: SmartBagQuoteSnapshot[];
  receipts: SmartBagSessionReceipt[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'quoted' | 'signing' | 'confirmed' | 'failed';
}

const STORAGE_KEY = 'bagfi.smartBagSessions.v1';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function pow10(decimals: number) {
  return BigInt(10) ** BigInt(decimals);
}

export function parseDecimalAmount(value: string, decimals: number): string {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a positive decimal amount.');
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  if (fractionPart.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places.`);
  }

  const whole = BigInt(wholePart || '0') * pow10(decimals);
  const fraction = BigInt(fractionPart.padEnd(decimals, '0') || '0');
  const amount = whole + fraction;

  if (amount <= BigInt(0)) {
    throw new Error('Deposit amount must be greater than zero.');
  }

  return amount.toString();
}

export function formatBaseUnits(amount: string, decimals: number, maxFractionDigits = 4): string {
  const value = BigInt(amount || '0');
  const base = pow10(decimals);
  const whole = value / base;
  const fraction = value % base;

  if (fraction === BigInt(0) || maxFractionDigits === 0) {
    return whole.toString();
  }

  const fractionText = fraction
    .toString()
    .padStart(decimals, '0')
    .slice(0, maxFractionDigits)
    .replace(/0+$/, '');

  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

export function allocationLabel(allocationBps: number) {
  return `${(allocationBps / 100).toFixed(allocationBps % 100 === 0 ? 0 : 2)}%`;
}

export function validateSmartBagTemplate(template: SmartBagTemplate) {
  const totalBps = template.assets.reduce((total, asset) => total + asset.allocationBps, 0);
  if (totalBps !== 10000) {
    throw new Error(`${template.title} allocations must total 100%.`);
  }

  if (template.maxSlippageBps < 0 || template.maxSlippageBps > 10000) {
    throw new Error(`${template.title} has an invalid max slippage value.`);
  }
}

export function splitDepositAmount(
  totalAmountBaseUnits: string,
  template: SmartBagTemplate,
  inputDecimals: number
): SmartBagAllocationSplit[] {
  validateSmartBagTemplate(template);

  const totalAmount = BigInt(totalAmountBaseUnits);
  let remaining = totalAmount;

  return template.assets.map((asset, index) => {
    const isLast = index === template.assets.length - 1;
    const inputAmount = isLast
      ? remaining
      : (totalAmount * BigInt(asset.allocationBps)) / BigInt(10000);

    remaining -= inputAmount;

    return {
      id: createId(`split_${asset.symbol.toLowerCase()}`),
      targetSymbol: asset.symbol,
      targetMint: asset.mint,
      targetDecimals: asset.decimals,
      allocationBps: asset.allocationBps,
      inputAmount: inputAmount.toString(),
      inputAmountUi: formatBaseUnits(inputAmount.toString(), inputDecimals),
    };
  });
}

export function createSmartBagDepositSession(params: {
  template: SmartBagTemplate;
  walletAddress: string;
  inputToken: TokenInfo;
  inputAmount: string;
  slippageBps: number;
}): SmartBagDepositSession {
  if (params.slippageBps > params.template.maxSlippageBps) {
    throw new Error(`Slippage exceeds this bag's ${(params.template.maxSlippageBps / 100).toFixed(2)}% limit.`);
  }

  const inputAmountBaseUnits = parseDecimalAmount(params.inputAmount, params.inputToken.decimals);
  const now = new Date().toISOString();

  return {
    id: createId(`sbs_${params.template.id}`),
    type: 'deposit',
    bagId: params.template.id,
    bagTitle: params.template.title,
    walletAddress: params.walletAddress,
    inputToken: params.inputToken,
    inputAmount: params.inputAmount,
    inputAmountBaseUnits,
    slippageBps: params.slippageBps,
    maxSlippageBps: params.template.maxSlippageBps,
    rebalanceThresholdBps: params.template.rebalanceThresholdBps,
    allocationSplits: splitDepositAmount(inputAmountBaseUnits, params.template, params.inputToken.decimals),
    quoteSnapshots: [],
    receipts: [],
    createdAt: now,
    updatedAt: now,
    status: 'draft',
  };
}

export function attachQuoteSnapshots(
  session: SmartBagDepositSession,
  quoteSnapshots: SmartBagQuoteSnapshot[]
): SmartBagDepositSession {
  return {
    ...session,
    quoteSnapshots,
    status: quoteSnapshots.some((snapshot) => snapshot.status === 'error') ? 'failed' : 'quoted',
    updatedAt: new Date().toISOString(),
  };
}

export function attachReceipts(
  session: SmartBagDepositSession,
  receipts: SmartBagSessionReceipt[]
): SmartBagDepositSession {
  const hasFailedReceipt = receipts.some((receipt) => receipt.status === 'failed');
  const isComplete = receipts.length === session.quoteSnapshots.length && !hasFailedReceipt;

  return {
    ...session,
    receipts,
    status: hasFailedReceipt ? 'failed' : isComplete ? 'confirmed' : 'signing',
    updatedAt: new Date().toISOString(),
  };
}

export function createDirectQuoteSnapshot(params: {
  session: SmartBagDepositSession;
  split: SmartBagAllocationSplit;
}): SmartBagQuoteSnapshot {
  return {
    id: createId(`quote_${params.split.targetSymbol.toLowerCase()}`),
    splitId: params.split.id,
    targetSymbol: params.split.targetSymbol,
    inputMint: params.session.inputToken.mint,
    outputMint: params.split.targetMint,
    inputAmount: params.split.inputAmount,
    outputAmount: params.split.inputAmount,
    otherAmountThreshold: params.split.inputAmount,
    slippageBps: params.session.slippageBps,
    priceImpactPct: '0',
    routePlan: [],
    createdAt: new Date().toISOString(),
    status: 'direct',
  };
}

export function saveSmartBagSession(session: SmartBagDepositSession) {
  if (typeof window === 'undefined') return;

  const sessions = loadSmartBagSessions().filter((stored) => stored.id !== session.id);
  sessions.unshift(session);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

export function loadSmartBagSessions(): SmartBagDepositSession[] {
  if (typeof window === 'undefined') return [];

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as SmartBagDepositSession[] : [];
  } catch {
    return [];
  }
}
