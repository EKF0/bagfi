'use client';

import { useState, useEffect } from 'react';
import { ArrowDownUp, Settings, Info, Loader2, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, Connection } from '@solana/web3.js';
import telemetry from '@/lib/telemetry';

export function SwapTerminal() {
  const { connected, publicKey, signTransaction } = useWallet();
  
  const address = publicKey?.toBase58();
  
  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string | null>(null);
  
  // Solana token selectors
  const [fromToken, setFromToken] = useState<'SOL' | 'USDC' | 'USDT' | 'BONK' | 'JUP'>('SOL');
  const [toToken, setToToken] = useState<'SOL' | 'USDC' | 'USDT' | 'BONK' | 'JUP'>('USDC');
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5% default
  const [deadline, setDeadline] = useState<number>(20); // 20 minutes default
  
  // Token decimals mapping for Solana
  const tokenDecimals: Record<string, number> = {
    SOL: 9,
    USDC: 6,
    USDT: 6,
    BONK: 5,
    JUP: 6
  };

  // Token mint addresses (mainnet)
  const tokenMints: Record<string, string> = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
  };
  
  const fromDecimals = tokenDecimals[fromToken] || 9;
  const toDecimals = tokenDecimals[toToken] || 6;

  useEffect(() => {
    const fetchQuote = async () => {
      if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
        setReceiveAmount('');
        setQuoteData(null);
        setError(null);
        return;
      }

      setIsFetchingQuote(true);
      setError(null);
      setTxStatus('idle');
      setTxMessage(null);
      
      try {
        const fromAmountLamports = Math.round(parseFloat(payAmount) * 10 ** fromDecimals).toString();
        
        // Track quote request start
        telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, false);
        
        // Call our server route for quote retrieval
        const url = `/api/quote?fromToken=${fromToken}&toToken=${toToken}&fromAmount=${fromAmountLamports}&fromAddress=${address || ''}&slippage=${slippage}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to fetch route. Route may not be available for this pair.');
        }
        
        const data = await response.json();
        setQuoteData(data);
        
        // Update receive amount from our processed response
        if (data.receiveAmount) {
          setReceiveAmount(data.receiveAmount);
          telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, true);
        } else {
          setReceiveAmount('');
          telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, false, new Error('No receive amount in response'));
        }
      } catch (err: any) {
        console.error('Quote Error:', err);
        setError(err.message || 'Could not find a valid route.');
        setReceiveAmount('');
        setQuoteData(null);
        telemetry.trackQuoteRequest('SOLANA', 'SOLANA', fromToken, toToken, payAmount, false, err);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    const debounceId = setTimeout(fetchQuote, 800);
    return () => clearTimeout(debounceId);
  }, [payAmount, address, fromToken, toToken, slippage, fromDecimals]);

  const handleSwap = async () => {
    if (!quoteData || !address || !publicKey || !signTransaction) return;
    
    setTxStatus('pending');
    setTxMessage('Simulating transaction...');
    
    try {
      // Basic validation that transaction data exists
      if (!quoteData.transactionRequest) {
        throw new Error('Invalid transaction data');
      }
      
      // Track successful simulation
      telemetry.trackTransactionSimulation(true);
      
      setTxMessage('Please confirm the transaction in your wallet...');
      
      // Deserialize the base64 transaction
      const transactionBuffer = Buffer.from(quoteData.transactionRequest, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send the transaction
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );
      
      const signature = await connection.sendTransaction(signedTransaction);
      
      console.log('Tx submitted:', signature);
      setTxStatus('success');
      setTxMessage(`Transaction submitted successfully! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      
      // Track successful swap
      telemetry.trackSwapTransaction(fromToken, toToken, payAmount, true, signature);
    } catch (err: any) {
      console.error('Swap Error:', err);
      setTxStatus('error');
      
      // Track swap failure
      telemetry.trackSwapTransaction(fromToken, toToken, payAmount, false, undefined, err);
      
      if (err.message && err.message.toLowerCase().includes('user rejected')) {
        setTxMessage('Transaction was rejected in your wallet.');
      } else {
        setTxMessage(err.message || 'Transaction failed. Please try again.');
      }
    }
  };
  
  return (
    <div className="glass-card w-full max-w-md p-4 sm:p-6 relative overflow-hidden shadow-2xl shadow-accentPrimary/5 border border-surfaceCardBorder/50 mix-blend-plus-lighter">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold">Swap</h2>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Settings className="w-5 h-5 text-white/70" />
        </button>
      </div>
      
      {/* Token Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/50">From Token</label>
          <div className="relative">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="BONK">BONK</option>
              <option value="JUP">JUP</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/50">To Token</label>
          <div className="relative">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="BONK">BONK</option>
              <option value="JUP">JUP</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>
      
      {/* Slippage and Deadline Controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/50">Slippage Tolerance</label>
          <div className="flex items-center">
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 0.1)))}
              className="w-20 pl-3 py-1.5 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
            />
            <span className="ml-2 text-xs text-white/50">%</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/50">Transaction Deadline</label>
          <div className="flex items-center">
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(Math.max(1, Math.min(120, parseInt(e.target.value) || 20)))}
              className="w-20 pl-3 py-1.5 bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-md text-white focus:outline-none focus:border-accentPrimary/50"
            />
            <span className="ml-2 text-xs text-white/50">min</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 relative">
        {/* Pay Section */}
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
              onChange={(e) => setPayAmount(e.target.value)}
              className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10"
            />
            <button className="flex justify-between items-center gap-2 bg-surfaceCard hover:bg-surfaceCard/80 px-3 py-2 rounded-xl border border-surfaceCardBorder transition-colors whitespace-nowrap min-w-[120px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">S</div>
                <span className="font-semibold tracking-tight">{fromToken}</span>
              </div>
              <ArrowDownUp className="w-3 h-3 text-white/40" />
            </button>
          </div>
        </div>

        {/* Swap Arrow - Absolute centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex">
          <button className="bg-surfaceCard border-[4px] border-[#0B132B] p-2 rounded-xl hover:bg-surfaceCardBorder transition-transform active:scale-95 text-white/80 hover:text-white shadow-xl">
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* Receive Section */}
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
                className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10 text-white"
              />
            )}
            <button className="flex justify-between items-center gap-2 bg-surfaceCard hover:bg-surfaceCard/80 px-3 py-2 rounded-xl border border-surfaceCardBorder transition-colors whitespace-nowrap min-w-[120px]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">U</div>
                <span className="font-semibold tracking-tight">{toToken}</span>
              </div>
              <ArrowDownUp className="w-3 h-3 text-white/40" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={handleSwap}
          disabled={!connected || !payAmount || isFetchingQuote || !!error || txStatus === 'pending'}
          className="w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-accentPrimary hover:shadow-[0_0_20px_rgba(72,202,228,0.4)] disabled:hover:shadow-none"
        >
          {!connected 
            ? 'Connect Wallet to Swap' 
            : txStatus === 'pending'
              ? 'Confirming in Wallet...'
              : isFetchingQuote
                ? 'Finding best route...'
                : error
                  ? 'Route not available'
                  : !payAmount 
                    ? 'Enter an amount' 
                    : 'Review & Swap'}
        </button>
      </div>

      {quoteData && quoteData.estimate && !error && !isFetchingQuote && (
        <>
          <div className="mt-4 p-4 rounded-xl bg-accentPrimary/5 border border-accentPrimary/10 flex flex-col gap-2 text-sm font-medium">
            <div className="flex justify-between items-center text-white/70">
              <span>Rate</span>
              <span className="text-white">1 {fromToken} = {(Number(receiveAmount) / Number(payAmount)).toFixed(4)} {toToken}</span>
            </div>
            <div className="flex justify-between items-center text-white/70">
              <span>Estimated Fee</span>
              <span className="text-white">${Number(quoteData.estimate.feeCosts?.[0]?.amountUSD || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5">
              <span className="text-white/50 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> via Jupiter Routing</span>
            </div>
          </div>
          
          {/* Risk Warnings */}
          <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
            <h3 className="text-sm font-medium text-red-200 mb-2">⚠️ Important Risks</h3>
            <div className="space-y-1 text-xs text-red-200/80">
              {quoteData.estimate.toAmount && quoteData.estimate.toAmountMin && (
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>
                    Price Impact: {((Number(quoteData.estimate.toAmount) - Number(quoteData.estimate.toAmountMin)) / Number(quoteData.estimate.toAmount) * 100).toFixed(2)}%
                    (You will receive at least {quoteData.estimate.toAmountMin} {toToken})
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">•</span>
                <span>
                  You have set slippage tolerance to {slippage}%
                  {slippage > 1 ? 
                    "(High slippage tolerance - you may receive significantly less than expected)" : 
                    "(Normal slippage tolerance)"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      
      {txStatus === 'error' && (
        <div className="mt-4 p-4 tracking-tight rounded-xl bg-red-500/10 border border-red-500/20 text-red-200/90 text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="break-all">{txMessage}</div>
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
  );
}
