'use client';

import { useState, useEffect } from 'react';
import { ArrowDownUp, Settings, Info, Loader2 } from 'lucide-react';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

export function SwapTerminal() {
  const { isConnected, address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  
  const [payAmount, setPayAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded for Demo: ETH on Mainnet -> USDC on Arbitrum
  const fromChain = 'ETH';
  const toChain = 'ARB';
  const fromToken = 'ETH';
  const toToken = 'USDC';
  const fromDecimals = 18;
  const toDecimals = 6;

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
      
      try {
        const fromAmountWei = parseUnits(payAmount, fromDecimals).toString();
        
        // Li.Fi API Request
        // Note: Using public endpoint without API key can be rate-limited
        const url = `https://li.quest/v1/quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${fromAmountWei}&fromAddress=${address || '0x0000000000000000000000000000000000000000'}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Failed to fetch route');
        }

        const data = await response.json();
        setQuoteData(data);
        
        if (data.estimate && data.estimate.toAmount) {
          const formattedReceive = formatUnits(BigInt(data.estimate.toAmount), toDecimals);
          // show up to 4 decimals
          setReceiveAmount(Number(formattedReceive).toFixed(4));
        } else {
          setReceiveAmount('');
        }
      } catch (err: any) {
        console.error('Quote Error:', err);
        setError(err.message || 'Could not find a valid route.');
        setReceiveAmount('');
        setQuoteData(null);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    const debounceId = setTimeout(fetchQuote, 800);
    return () => clearTimeout(debounceId);
  }, [payAmount, address]);

  const handleSwap = async () => {
    if (!quoteData || !address) return;
    
    try {
      const tx = await sendTransactionAsync({
        to: quoteData.transactionRequest.to,
        data: quoteData.transactionRequest.data,
        value: BigInt(quoteData.transactionRequest.value),
        chainId: quoteData.transactionRequest.chainId,
        gas: BigInt(quoteData.transactionRequest.gasLimit)
      });
      console.log('Tx submitted:', tx);
      alert(`Transaction submitted! Hash: ${tx}`);
    } catch (err) {
      console.error('Swap Error:', err);
      // In production, we would use a toast notification here
      alert('Transaction failed or was rejected.');
    }
  };
  
  return (
    <div className="glass-card w-full max-w-md p-4 sm:p-6 relative overflow-hidden shadow-2xl shadow-accentPrimary/5 border border-surfaceCardBorder/50 mix-blend-plus-lighter">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold">Swap & Bridge</h2>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Settings className="w-5 h-5 text-white/70" />
        </button>
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
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">ETH</div>
                <span className="font-semibold tracking-tight">ETH</span>
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
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">USDC</div>
                <span className="font-semibold tracking-tight">USDC</span>
              </div>
              <ArrowDownUp className="w-3 h-3 text-white/40" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={handleSwap}
          disabled={!isConnected || !payAmount || isFetchingQuote || !!error}
          className="w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-accentPrimary hover:shadow-[0_0_20px_rgba(72,202,228,0.4)] disabled:hover:shadow-none"
        >
          {!isConnected 
            ? 'Connect Wallet to Swap' 
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
        <div className="mt-4 p-4 rounded-xl bg-accentPrimary/5 border border-accentPrimary/10 flex flex-col gap-2 text-sm font-medium">
           <div className="flex justify-between items-center text-white/70">
              <span>Rate</span>
              <span className="text-white">1 ETH = {(Number(formatUnits(BigInt(quoteData.estimate.toAmount), toDecimals)) / Number(payAmount)).toFixed(2)} USDC</span>
           </div>
           <div className="flex justify-between items-center text-white/70">
              <span>Estimated Gas</span>
              <span className="text-white">${Number(quoteData.estimate.gasCosts?.[0]?.amountUSD || 0).toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5">
              <span className="text-white/50 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> via Li.Fi protocol</span>
           </div>
        </div>
      )}
      
      {error && !isFetchingQuote && payAmount && (
         <div className="mt-4 p-3 tracking-tight rounded-xl bg-red-500/10 border border-red-500/20 text-red-200/80 text-sm font-medium">
           {error}
         </div>
      )}
    </div>
  );
}
