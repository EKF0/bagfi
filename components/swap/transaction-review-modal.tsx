'use client';

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, Route, Zap, Clock, Shield } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import telemetry from '@/lib/telemetry';

interface TransactionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: {
    inputAmount: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: string;
    routePlan: Array<{
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
    }>;
    swapTransaction?: string;
    lastValidBlockHeight?: number;
    prioritizationFeeLamports?: number;
    computeUnitLimit?: number;
  };
  fromToken: string;
  toToken: string;
  fromDecimals: number;
  toDecimals: number;
  payAmount: string;
}

export function TransactionReviewModal({
  isOpen,
  onClose,
  quoteData,
  fromToken,
  toToken,
  fromDecimals,
  toDecimals,
  payAmount
}: TransactionReviewModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  // Format amount from base units
  const formatAmount = (amount: string, decimals: number) => {
    return (Number(amount) / 10 ** decimals).toFixed(decimals > 6 ? 4 : 2);
  };

  // Format price impact
  const priceImpact = parseFloat(quoteData.priceImpactPct);
  const priceImpactColor = priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-amber-400' : 'text-green-400';

  // Handle simulation
  const handleSimulate = async () => {
    if (!quoteData.swapTransaction || !publicKey) return;
    
    setIsSimulating(true);
    setSimulationResult('idle');
    setSimulationError(null);
    const startTime = Date.now();
    
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );
      
      // Deserialize transaction
      const transactionBuffer = Buffer.from(quoteData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Simulate transaction
      const simulation = await connection.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        sigVerify: false,
      });
      
      const durationMs = Date.now() - startTime;
      
      if (simulation.value.err) {
        const errorMsg = JSON.stringify(simulation.value.err);
        setSimulationError(errorMsg);
        setSimulationResult('error');
        
        telemetry.trackSolanaSimulation({
          success: false,
          durationMs,
          logs: simulation.value.logs || [],
          error: errorMsg,
          action: 'swap'
        });
      } else {
        setSimulationResult('success');
        telemetry.trackSolanaSimulation({
          success: true,
          durationMs,
          computeUnits: simulation.value.unitsConsumed || 0,
          action: 'swap'
        });
        
        // Log simulation details
        console.log('Simulation logs:', simulation.value.logs);
        console.log('Compute units consumed:', simulation.value.unitsConsumed);
      }
      
    } catch (err: any) {
      console.error('Simulation error:', err);
      const durationMs = Date.now() - startTime;
      const errorMsg = err.message || 'Transaction simulation failed';
      setSimulationResult('error');
      setSimulationError(errorMsg);
      
      telemetry.trackSolanaSimulation({
        success: false,
        durationMs,
        error: errorMsg,
        action: 'swap'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle sign and send
  const handleSignAndSend = async () => {
    if (!quoteData.swapTransaction || !publicKey || !signTransaction) return;
    
    setIsSigning(true);
    const startTime = Date.now();
    
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );
      
      // Deserialize transaction
      const transactionBuffer = Buffer.from(quoteData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Sign transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendTransaction(signedTransaction, {
        maxRetries: 3,
        skipPreflight: true, // We already simulated
        preflightCommitment: 'confirmed'
      });
      
      setTxSignature(signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      const durationMs = Date.now() - startTime;

      if (confirmation.value.err) {
        const errorMsg = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
        
        telemetry.trackSolanaConfirmation({
          signature,
          durationMs,
          status: 'failed',
          error: errorMsg,
          action: 'swap'
        });
        
        throw new Error(errorMsg);
      }

      setIsConfirmed(true);
      telemetry.trackSolanaConfirmation({
        signature,
        durationMs,
        status: 'confirmed',
        action: 'swap'
      });
      
      telemetry.trackSwapTransaction(fromToken, toToken, payAmount, true, signature);
      
    } catch (err: any) {
      console.error('Transaction error:', err);
      const durationMs = Date.now() - startTime;
      setSimulationResult('error');
      setSimulationError(err.message || 'Transaction failed');
      
      telemetry.trackSolanaConfirmation({
        signature: txSignature || 'unknown',
        durationMs,
        status: 'failed',
        error: err.message,
        action: 'swap'
      });

      telemetry.trackSwapTransaction(fromToken, toToken, payAmount, false, undefined, err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0B132B] border border-surfaceCardBorder w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold font-display text-white">Review Transaction</h2>
            <p className="text-sm text-white/50 mt-1">Verify all details before signing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Route Plan */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-accentPrimary" />
              <span className="text-sm font-medium text-white">Route Plan</span>
            </div>
            <div className="space-y-2">
              {quoteData.routePlan.map((step, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">{index + 1}.</span>
                    <span className="text-white/70">{step.swapInfo.label}</span>
                  </div>
                  <span className="text-white/50">{step.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">You Pay</span>
              <span className="text-white font-medium">
                {formatAmount(quoteData.inputAmount, fromDecimals)} {fromToken}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">You Receive (min)</span>
              <span className="text-white font-medium">
                {formatAmount(quoteData.otherAmountThreshold, toDecimals)} {toToken}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Expected Output</span>
              <span className="text-white font-medium">
                {formatAmount(quoteData.outputAmount, toDecimals)} {toToken}
              </span>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Risk Metrics</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Price Impact</span>
              <span className={`font-medium ${priceImpactColor}`}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Slippage Tolerance</span>
              <span className="text-white font-medium">{(quoteData.slippageBps / 100).toFixed(2)}%</span>
            </div>
            {quoteData.prioritizationFeeLamports && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/50 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Priority Fee
                </span>
                <span className="text-white font-medium">
                  {quoteData.prioritizationFeeLamports / 1e9} SOL
                </span>
              </div>
            )}
            {quoteData.computeUnitLimit && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/50 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Compute Limit
                </span>
                <span className="text-white font-medium">
                  {quoteData.computeUnitLimit.toLocaleString()} CU
                </span>
              </div>
            )}
            {quoteData.lastValidBlockHeight && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/50 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Valid Until Block
                </span>
                <span className="text-white font-medium">
                  {quoteData.lastValidBlockHeight.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Simulation Result */}
          {simulationResult !== 'idle' && (
            <div className={`rounded-xl p-4 ${
              simulationResult === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {simulationResult === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-medium text-green-200">Simulation Successful</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-medium text-red-200">Simulation Failed</span>
                  </>
                )}
              </div>
              {simulationError && (
                <p className="text-xs text-red-200/80">{simulationError}</p>
              )}
            </div>
          )}

          {/* Transaction Success */}
          {txSignature && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-200">
                  {isConfirmed ? 'Transaction Confirmed!' : 'Transaction Sent!'}
                </span>
              </div>
              <p className="text-xs text-green-200/80 font-mono break-all">
                Signature: {txSignature}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/5 space-y-3">
          {!txSignature ? (
            <>
              <button
                onClick={handleSimulate}
                disabled={isSimulating || !quoteData.swapTransaction}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSimulating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Simulating...</>
                ) : simulationResult === 'success' ? (
                  <><CheckCircle className="w-5 h-5" /> Simulated Successfully</>
                ) : (
                  <><Shield className="w-5 h-5" /> Simulate Transaction</>
                )}
              </button>
              
              <button
                onClick={handleSignAndSend}
                disabled={isSigning || !quoteData.swapTransaction || simulationResult !== 'success'}
                className="w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
              >
                {isSigning ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing...</>
                ) : (
                  <><Shield className="w-5 h-5" /> Sign & Send Transaction</>
                )}
              </button>
              
              {simulationResult !== 'success' && (
                <p className="text-xs text-amber-400 text-center">
                  Please simulate the transaction before signing
                </p>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
