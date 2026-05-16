'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ClipboardList, Loader2, Send, Shield, Wallet, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { DEPOSIT_TOKENS } from '@/lib/smart-bags/catalog';
import {
  allocationLabel,
  attachQuoteSnapshots,
  attachReceipts,
  createDirectQuoteSnapshot,
  createSmartBagDepositSession,
  formatBaseUnits,
  saveSmartBagSession,
  type SmartBagDepositSession,
  type SmartBagQuoteSnapshot,
  type SmartBagRoutePlanStep,
  type SmartBagSessionReceipt,
  type SmartBagTemplate,
  type TokenInfo,
} from '@/lib/smart-bags/session-engine';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  bag: SmartBagTemplate;
}

interface TradeQuoteData {
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: SmartBagRoutePlanStep[];
  [key: string]: unknown;
}

interface SwapTransactionData {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

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

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function quoteSnapshotId(splitId: string) {
  return `${splitId}_quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function receiptId(snapshotId: string) {
  return `${snapshotId}_receipt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DepositModal({ isOpen, onClose, bag }: DepositModalProps) {
  const { connected, publicKey, signTransaction } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const [amount, setAmount] = useState('');
  const [inputTokenSymbol, setInputTokenSymbol] = useState(DEPOSIT_TOKENS[0].symbol);
  const [slippageBps, setSlippageBps] = useState(Math.min(50, bag.maxSlippageBps));
  const [isPreparing, setIsPreparing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [session, setSession] = useState<SmartBagDepositSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const inputToken = useMemo<TokenInfo>(() => {
    return DEPOSIT_TOKENS.find((token) => token.symbol === inputTokenSymbol) || DEPOSIT_TOKENS[0];
  }, [inputTokenSymbol]);

  if (!isOpen) return null;

  const resetSession = () => {
    setSession(null);
    setSessionError(null);
  };

  const prepareSession = async () => {
    if (!walletAddress) return;

    setIsPreparing(true);
    setSessionError(null);

    try {
      const draftSession = createSmartBagDepositSession({
        template: bag,
        walletAddress,
        inputToken,
        inputAmount: amount,
        slippageBps,
      });

      const quoteSnapshots: SmartBagQuoteSnapshot[] = [];

      for (const split of draftSession.allocationSplits) {
        if (split.inputAmount === '0') {
          continue;
        }

        if (split.targetMint === inputToken.mint) {
          quoteSnapshots.push(createDirectQuoteSnapshot({ session: draftSession, split }));
          continue;
        }

        const quoteParams = new URLSearchParams({
          inputMint: inputToken.mint,
          outputMint: split.targetMint,
          amount: split.inputAmount,
          slippageBps: slippageBps.toString(),
          userPublicKey: walletAddress,
        });

        const quoteEnvelope = await readEnvelope<TradeQuoteData>(
          await fetch(`/api/bags/quote?${quoteParams.toString()}`)
        );

        const quoteData = quoteEnvelope.data as TradeQuoteData;
        const swapEnvelope = await readEnvelope<SwapTransactionData>(
          await fetch('/api/bags/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteResponse: quoteData,
              userPublicKey: walletAddress,
              wrapAndUnwrapSol: true,
            }),
          })
        );

        const swapData = swapEnvelope.data as SwapTransactionData;

        quoteSnapshots.push({
          id: quoteSnapshotId(split.id),
          splitId: split.id,
          targetSymbol: split.targetSymbol,
          inputMint: inputToken.mint,
          outputMint: split.targetMint,
          inputAmount: quoteData.inputAmount,
          outputAmount: quoteData.outputAmount,
          otherAmountThreshold: quoteData.otherAmountThreshold,
          slippageBps: quoteData.slippageBps,
          priceImpactPct: quoteData.priceImpactPct,
          routePlan: quoteData.routePlan,
          swapTransaction: swapData.swapTransaction,
          lastValidBlockHeight: swapData.lastValidBlockHeight,
          prioritizationFeeLamports: swapData.prioritizationFeeLamports,
          computeUnitLimit: swapData.computeUnitLimit,
          requestId: quoteEnvelope.requestId || swapEnvelope.requestId,
          createdAt: new Date().toISOString(),
          status: 'quoted',
        });
      }

      const quotedSession = attachQuoteSnapshots(draftSession, quoteSnapshots);
      setSession(quotedSession);
      saveSmartBagSession(quotedSession);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to prepare deposit session.');
    } finally {
      setIsPreparing(false);
    }
  };

  const executeSession = async () => {
    if (!session || !signTransaction) return;

    setIsExecuting(true);
    setSessionError(null);

    const receipts: SmartBagSessionReceipt[] = [];
    let activeSession: SmartBagDepositSession = { ...session, status: 'signing' };

    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );

      for (const snapshot of session.quoteSnapshots) {
        if (snapshot.status === 'direct' || !snapshot.swapTransaction) {
          receipts.push({
            id: receiptId(snapshot.id),
            quoteSnapshotId: snapshot.id,
            targetSymbol: snapshot.targetSymbol,
            targetMint: snapshot.outputMint,
            status: 'skipped',
            signedAt: new Date().toISOString(),
          });

          activeSession = attachReceipts(activeSession, receipts);
          setSession(activeSession);
          saveSmartBagSession(activeSession);
          continue;
        }

        try {
          const transaction = VersionedTransaction.deserialize(base64ToBytes(snapshot.swapTransaction));
          const simulation = await connection.simulateTransaction(transaction, {
            replaceRecentBlockhash: true,
            sigVerify: false,
          });

          if (simulation.value.err) {
            throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
          }

          const signedTransaction = await signTransaction(transaction);
          const signature = await connection.sendTransaction(signedTransaction, {
            maxRetries: 3,
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          const receipt: SmartBagSessionReceipt = {
            id: receiptId(snapshot.id),
            quoteSnapshotId: snapshot.id,
            targetSymbol: snapshot.targetSymbol,
            targetMint: snapshot.outputMint,
            status: 'signed',
            signature,
            signedAt: new Date().toISOString(),
          };

          receipts.push(receipt);
          activeSession = attachReceipts(activeSession, receipts);
          setSession(activeSession);
          saveSmartBagSession(activeSession);

          await connection.confirmTransaction(signature, 'confirmed');
          receipt.status = 'confirmed';
          receipt.confirmedAt = new Date().toISOString();

          activeSession = attachReceipts(activeSession, receipts);
          setSession(activeSession);
          saveSmartBagSession(activeSession);
        } catch (error) {
          receipts.push({
            id: receiptId(snapshot.id),
            quoteSnapshotId: snapshot.id,
            targetSymbol: snapshot.targetSymbol,
            targetMint: snapshot.outputMint,
            status: 'failed',
            signedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Transaction failed.',
          });

          activeSession = attachReceipts(activeSession, receipts);
          setSession(activeSession);
          saveSmartBagSession(activeSession);
          throw error;
        }
      }
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to execute deposit session.');
    } finally {
      setIsExecuting(false);
    }
  };

  const canPrepare = Boolean(connected && walletAddress && amount && !isPreparing && !isExecuting);
  const canExecute = Boolean(session && session.status === 'quoted' && signTransaction && !isExecuting);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surfaceCard border border-surfaceCardBorder w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden shadow-accentPrimary/10 max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold font-display px-1 text-white">Deposit to {bag.title}</h2>
            <p className="text-sm text-white/50 px-1 mt-1">{bag.strategy} with wallet-reviewed Solana swaps</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex gap-2 mb-6 h-2 rounded-full overflow-hidden">
            {bag.assets.map((asset, index) => {
              const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];
              return (
                <div
                  key={asset.symbol}
                  style={{ width: `${asset.allocationBps / 100}%` }}
                  className={`h-full ${colors[index % colors.length]}`}
                  title={`${asset.symbol} ${allocationLabel(asset.allocationBps)}`}
                />
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-2xl p-4 transition-colors focus-within:border-accentPrimary/50 shadow-inner">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-white/50">Amount to deposit</span>
                <span className="text-sm font-medium text-white/50 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Balance: --
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    resetSession();
                  }}
                  className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10 min-w-0"
                />
                <select
                  value={inputTokenSymbol}
                  onChange={(event) => {
                    setInputTokenSymbol(event.target.value);
                    resetSession();
                  }}
                  className="bg-surfaceCard px-3 py-2 rounded-xl border border-surfaceCardBorder min-w-[112px] text-white font-semibold outline-none"
                >
                  {DEPOSIT_TOKENS.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 min-w-[190px]">
              <label className="block text-sm font-medium text-white/50 mb-2">Slippage cap</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={(slippageBps / 100).toFixed(2)}
                  min={0.01}
                  max={bag.maxSlippageBps / 100}
                  step={0.01}
                  onChange={(event) => {
                    const nextBps = Math.round(Number(event.target.value) * 100);
                    setSlippageBps(Math.max(1, Math.min(bag.maxSlippageBps, nextBps || 1)));
                    resetSession();
                  }}
                  className="w-24 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md px-3 py-2 text-white outline-none"
                />
                <span className="text-white/50">%</span>
              </div>
              <div className="text-xs text-white/40 mt-2">Max {(bag.maxSlippageBps / 100).toFixed(2)}%</div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 text-sm">
            {bag.assets.map((asset) => (
              <div key={asset.symbol} className="flex justify-between gap-4">
                <span className="text-white/60">{asset.symbol}</span>
                <span className="text-white">{allocationLabel(asset.allocationBps)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-white/5">
              <span className="text-white/60">Rebalance drift</span>
              <span className="text-white">{(bag.rebalanceThresholdBps / 100).toFixed(2)}%</span>
            </div>
          </div>

          <button
            onClick={prepareSession}
            disabled={!canPrepare}
            className="mt-6 w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-accentPrimary flex justify-center items-center gap-2"
          >
            {isPreparing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Preparing session...</>
            ) : !connected ? (
              'Connect Wallet'
            ) : !amount ? (
              'Enter amount'
            ) : (
              <><ClipboardList className="w-5 h-5" /> Prepare Deposit Session</>
            )}
          </button>

          {sessionError && (
            <div className="mt-4 p-4 tracking-tight rounded-xl bg-red-500/10 border border-red-500/20 text-red-200/90 text-sm font-medium flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="break-words">{sessionError}</div>
            </div>
          )}

          {session && (
            <div className="mt-6 border border-accentPrimary/15 bg-accentPrimary/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-accentPrimary/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">Session {session.status}</h3>
                  <p className="text-xs text-white/50 font-mono">{session.id}</p>
                </div>
                <span className="text-xs font-medium text-accentPrimary">
                  {session.quoteSnapshots.length} quote snapshots
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {session.quoteSnapshots.map((snapshot) => {
                  const split = session.allocationSplits.find((item) => item.id === snapshot.splitId);
                  return (
                    <div key={snapshot.id} className="p-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{snapshot.targetSymbol}</div>
                          <div className="text-white/50">
                            {split ? allocationLabel(split.allocationBps) : '--'} target
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">
                            {formatBaseUnits(snapshot.otherAmountThreshold, split?.targetDecimals || inputToken.decimals)} min
                          </div>
                          <div className="text-white/50">
                            {snapshot.status === 'direct' ? 'No swap needed' : `${Number(snapshot.priceImpactPct || 0).toFixed(2)}% impact`}
                          </div>
                        </div>
                      </div>
                      {snapshot.lastValidBlockHeight && (
                        <div className="mt-2 text-xs text-white/40">
                          Valid until block {snapshot.lastValidBlockHeight.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {session.receipts.length > 0 && (
                <div className="border-t border-white/5 p-4 space-y-3">
                  {session.receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-start gap-3 text-sm">
                      <CheckCircle className={`w-4 h-4 mt-0.5 ${receipt.status === 'failed' ? 'text-red-400' : 'text-green-400'}`} />
                      <div className="min-w-0">
                        <div className="text-white">{receipt.targetSymbol} {receipt.status}</div>
                        {receipt.signature && (
                          <div className="text-xs font-mono text-white/50 truncate">
                            {receipt.signature}
                          </div>
                        )}
                        {receipt.error && <div className="text-xs text-red-200/80">{receipt.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 border-t border-white/5">
                <button
                  onClick={executeSession}
                  disabled={!canExecute}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isExecuting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Signing session...</>
                  ) : session.status === 'confirmed' ? (
                    <><CheckCircle className="w-5 h-5" /> Session Complete</>
                  ) : (
                    <><Shield className="w-5 h-5" /> Simulate, Sign & Send</>
                  )}
                </button>
                {session.status === 'quoted' && (
                  <p className="text-xs text-white/40 text-center mt-3 flex justify-center items-center gap-1">
                    <Send className="w-3 h-3" /> Each swap is simulated before wallet signature.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
