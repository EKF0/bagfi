'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownUp, CheckCircle, ChevronDown, Info, Loader2, Settings, Shield } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import telemetry from '@/lib/telemetry';
import { useBalanceStore } from '@/lib/stores/balance-store';
import { TransactionReviewModal } from '@/components/swap/transaction-review-modal';

type TokenSymbol = 'SOL' | 'USDC' | 'USDT' | 'BONK' | 'JUP';

interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  mint: string;
  decimals: number;
  icon: string;
}

interface RoutePlanStep {
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

interface TradeQuoteData {
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RoutePlanStep[];
}

interface SwapTransactionData {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
}

type ReviewQuoteData = TradeQuoteData & SwapTransactionData;

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

const TOKEN_CONFIGS: Record<TokenSymbol, TokenConfig> = {
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
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    icon: 'B',
  },
  JUP: {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    icon: 'J',
  },
};

const TOKEN_OPTIONS = Object.values(TOKEN_CONFIGS);

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const data = await response.json().catch(() => ({})) as ApiEnvelope<T>;

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed with ${response.status}`);
  }

  if (!data.data) {
    throw new Error('API response did not include data.');
  }

  return data;
}

function decimalToBaseUnits(value: string, decimals: number): string {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a positive decimal amount.');
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  if (fractionPart.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places.`);
  }

  const base = BigInt(10) ** BigInt(decimals);
  const whole = BigInt(wholePart || '0') * base;
  const fraction = BigInt(fractionPart.padEnd(decimals, '0') || '0');
  const amount = whole + fraction;

  if (amount <= BigInt(0)) {
    throw new Error('Amount must be greater than zero.');
  }

  return amount.toString();
}

function formatBaseUnits(amount: string, decimals: number, maxFractionDigits = 6): string {
  try {
    const value = BigInt(amount || '0');
    const base = BigInt(10) ** BigInt(decimals);
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
  } catch {
    return '0';
  }
}

function formatPercent(value: string | number) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

export function SwapTerminal() {
  const { connected, publicKey } = useWallet();
  const triggerRefresh = useBalanceStore((state) => state.triggerRefresh);
  const address = publicKey?.toBase58();

  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [fromToken, setFromToken] = useState<TokenSymbol>('SOL');
  const [toToken, setToToken] = useState<TokenSymbol>('USDC');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isPreparingReview, setIsPreparingReview] = useState(false);
  const [quoteData, setQuoteData] = useState<TradeQuoteData | null>(null);
  const [reviewQuote, setReviewQuote] = useState<ReviewQuoteData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const fromConfig = TOKEN_CONFIGS[fromToken];
  const toConfig = TOKEN_CONFIGS[toToken];

  const routeSummary = useMemo(() => {
    if (!quoteData?.routePlan.length) return 'Direct route';
    const labels = quoteData.routePlan.map((step) => step.swapInfo.label).filter(Boolean);
    return labels.length > 0 ? labels.slice(0, 2).join(' + ') : `${quoteData.routePlan.length} route steps`;
  }, [quoteData]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
        setReceiveAmount('');
        setQuoteData(null);
        setReviewQuote(null);
        setError(null);
        return;
      }

      if (fromToken === toToken) {
        setReceiveAmount('');
        setQuoteData(null);
        setReviewQuote(null);
        setError('Select two different tokens.');
        return;
      }

      setIsFetchingQuote(true);
      setError(null);
      setTxStatus('idle');
      setTxMessage(null);
      setReviewQuote(null);

      try {
        const amountBaseUnits = decimalToBaseUnits(payAmount, fromConfig.decimals);
        telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, false);

        const quoteParams = new URLSearchParams({
          inputMint: fromConfig.mint,
          outputMint: toConfig.mint,
          amount: amountBaseUnits,
          slippageBps: Math.round(slippage * 100).toString(),
        });

        if (address) {
          quoteParams.set('userPublicKey', address);
        }

        const quoteEnvelope = await readEnvelope<TradeQuoteData>(
          await fetch(`/api/bags/quote?${quoteParams.toString()}`)
        );

        const nextQuote = quoteEnvelope.data as TradeQuoteData;
        setQuoteData(nextQuote);
        setReceiveAmount(formatBaseUnits(nextQuote.outputAmount, toConfig.decimals));
        telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, true);
      } catch (err: any) {
        console.error('Quote Error:', err);
        setError(err.message || 'Could not find a valid Bags route.');
        setReceiveAmount('');
        setQuoteData(null);
        setReviewQuote(null);
        telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, false, err);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    const debounceId = setTimeout(fetchQuote, 800);
    return () => clearTimeout(debounceId);
  }, [payAmount, address, fromToken, toToken, slippage, fromConfig.decimals, fromConfig.mint, toConfig.decimals, toConfig.mint]);

  const handleReviewSwap = async () => {
    if (!quoteData || !address) return;

    setIsPreparingReview(true);
    setError(null);
    setTxStatus('idle');
    setTxMessage(null);

    try {
      const swapEnvelope = await readEnvelope<SwapTransactionData>(
        await fetch('/api/bags/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: address,
            wrapAndUnwrapSol: true,
          }),
        })
      );

      const swapData = swapEnvelope.data as SwapTransactionData;
      setReviewQuote({
        ...quoteData,
        ...swapData,
      });
      setIsReviewOpen(true);
    } catch (err: any) {
      console.error('Swap transaction creation failed:', err);
      setTxStatus('error');
      setTxMessage(err.message || 'Could not prepare a reviewable transaction.');
      telemetry.trackSwapTransaction(fromToken, toToken, payAmount, false, undefined, err);
    } finally {
      setIsPreparingReview(false);
    }
  };

  const handleSwapConfirmed = (signature: string) => {
    setTxStatus('success');
    setTxMessage(`Transaction confirmed: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
    triggerRefresh();
  };

  const priceImpact = quoteData ? Number.parseFloat(quoteData.priceImpactPct || '0') : 0;
  const minOutput = quoteData ? formatBaseUnits(quoteData.otherAmountThreshold, toConfig.decimals) : '';
  const canReview = Boolean(connected && address && quoteData && payAmount && !isFetchingQuote && !isPreparingReview && !error);

  return (
    <>
      <div className="glass-card w-full max-w-md p-4 sm:p-6 relative overflow-hidden shadow-2xl shadow-accentPrimary/5 border border-surfaceCardBorder/50 mix-blend-plus-lighter">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold">Swap</h2>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="Swap settings">
            <Settings className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/50">From Token</label>
            <div className="relative">
              <select
                value={fromToken}
                onChange={(event) => setFromToken(event.target.value as TokenSymbol)}
                className="block w-full pl-3 pr-10 py-2 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
              >
                {TOKEN_OPTIONS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/50">To Token</label>
            <div className="relative">
              <select
                value={toToken}
                onChange={(event) => setToToken(event.target.value as TokenSymbol)}
                className="block w-full pl-3 pr-10 py-2 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
              >
                {TOKEN_OPTIONS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-white/50">Slippage Tolerance</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={slippage}
              min={0.1}
              max={50}
              step={0.1}
              onChange={(event) => setSlippage(Math.max(0.1, Math.min(50, parseFloat(event.target.value) || 0.1)))}
              className="w-24 pl-3 py-1.5 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
            />
            <span className="text-xs text-white/50">%</span>
          </div>
        </div>

        <div className="space-y-2 relative">
          <div className="bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-2xl p-4 transition-colors focus-within:border-accentPrimary/50 shadow-inner">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-white/50">You pay</span>
              <span className="text-sm font-medium text-white/50">Balance: --</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10 min-w-0"
              />
              <div className="flex justify-between items-center gap-2 bg-surfaceCard px-3 py-2 rounded-xl border border-surfaceCardBorder whitespace-nowrap min-w-[120px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {fromConfig.icon}
                  </div>
                  <span className="font-semibold tracking-tight">{fromToken}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex">
            <button
              type="button"
              onClick={() => {
                setFromToken(toToken);
                setToToken(fromToken);
              }}
              className="bg-surfaceCard border-[4px] border-[#0B132B] p-2 rounded-xl hover:bg-surfaceCardBorder transition-transform active:scale-95 text-white/80 hover:text-white shadow-xl"
              aria-label="Swap token direction"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-2xl p-4 shadow-inner">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-white/50">You receive</span>
            </div>
            <div className="flex items-center gap-3">
              {isFetchingQuote ? (
                <div className="flex-1 flex items-center h-[40px]">
                  <Loader2 className="w-5 h-5 animate-spin text-accentPrimary/70" />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="0"
                  value={receiveAmount}
                  readOnly
                  className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10 text-white min-w-0"
                />
              )}
              <div className="flex justify-between items-center gap-2 bg-surfaceCard px-3 py-2 rounded-xl border border-surfaceCardBorder whitespace-nowrap min-w-[120px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {toConfig.icon}
                  </div>
                  <span className="font-semibold tracking-tight">{toToken}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleReviewSwap}
            disabled={!canReview}
            className="w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-accentPrimary hover:shadow-[0_0_20px_rgba(72,202,228,0.4)] disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {!connected
              ? 'Connect Wallet to Swap'
              : isPreparingReview
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Preparing review...</>
                : isFetchingQuote
                  ? 'Finding best route...'
                  : error
                    ? 'Route not available'
                    : !payAmount
                      ? 'Enter an amount'
                      : <><Shield className="w-5 h-5" /> Review & Swap</>}
          </button>
        </div>

        {quoteData && !error && !isFetchingQuote && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-accentPrimary/5 border border-accentPrimary/10 flex flex-col gap-2 text-sm font-medium">
              <div className="flex justify-between items-center gap-4 text-white/70">
                <span>Rate</span>
                <span className="text-white text-right">
                  1 {fromToken} = {(Number(receiveAmount) / Number(payAmount)).toFixed(6)} {toToken}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 text-white/70">
                <span>Minimum received</span>
                <span className="text-white text-right">{minOutput} {toToken}</span>
              </div>
              <div className="flex justify-between items-center gap-4 text-white/70">
                <span>Price impact</span>
                <span className={priceImpact > 5 ? 'text-red-300' : priceImpact > 1 ? 'text-amber-300' : 'text-green-300'}>
                  {formatPercent(priceImpact)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5 gap-4">
                <span className="text-white/50 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> via Bags.fm Routing</span>
                <span className="text-white/50 text-xs text-right">{routeSummary}</span>
              </div>
            </div>

            {(priceImpact > 1 || slippage > 1) && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <h3 className="text-sm font-medium text-red-200 mb-2">Important Risks</h3>
                <div className="space-y-2 text-xs text-red-200/80">
                  {priceImpact > 1 && (
                    <div>
                      Price impact is {formatPercent(priceImpact)}%. You may receive materially less than the quoted output if market conditions change.
                    </div>
                  )}
                  {slippage > 1 && (
                    <div>
                      Slippage tolerance is {slippage.toFixed(2)}%. High slippage can allow a worse execution price.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {txStatus === 'error' && (
          <div className="mt-4 p-4 tracking-tight rounded-xl bg-red-500/10 border border-red-500/20 text-red-200/90 text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="break-words">{txMessage}</div>
          </div>
        )}

        {txStatus === 'success' && (
          <div className="mt-4 p-4 tracking-tight rounded-xl bg-green-500/10 border border-green-500/20 text-green-200/90 text-sm font-medium flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="break-all">{txMessage}</div>
          </div>
        )}

        {error && !isFetchingQuote && payAmount && txStatus !== 'error' && (
          <div className="mt-4 p-4 tracking-tight rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="break-words">
              {error === 'Network Error' ? 'Network error: Please check your connection and try again.' : error}
            </div>
          </div>
        )}
      </div>

      {reviewQuote && (
        <TransactionReviewModal
          key={reviewQuote.swapTransaction}
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setReviewQuote(null);
          }}
          onConfirmed={handleSwapConfirmed}
          quoteData={reviewQuote}
          fromToken={fromToken}
          toToken={toToken}
          fromDecimals={fromConfig.decimals}
          toDecimals={toConfig.decimals}
          payAmount={payAmount}
        />
      )}
    </>
  );
}
