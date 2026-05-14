'use client';

import { useState } from 'react';
import { X, Wallet, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  bag: {
    id: string;
    title: string;
    apy: string;
    assets: { symbol: string; allocation: string }[];
  }
}

export function DepositModal({ isOpen, onClose, bag }: DepositModalProps) {
  const { connected } = useWallet();
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState('');

  if (!isOpen) return null;

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount))) return;
    setIsDepositing(true);
    
    try {
      // In a real implementation we would:
      // 1. Get quote from Jupiter to swap tokenIn to target token (if needed)
      // 2. Sign and send transaction via Solana wallet
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTxHash(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    } catch (error) {
      console.error(error);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surfaceCard border border-surfaceCardBorder w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden shadow-accentPrimary/10">
        
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold font-display px-1 text-white">Deposit to {bag.title}</h2>
            <p className="text-sm text-white/50 px-1 mt-1">1-click Zap-in converts your asset automatically</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="p-6">
          {txHash ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Deposit Successful</h3>
              <p className="text-white/60 text-sm mb-6">Your assets have been deployed into the {bag.title}.</p>
              <div className="bg-black/30 p-3 rounded-lg font-mono text-xs text-white/50 mb-6 truncate">
                Signature: {txHash.slice(0, 8)}...{txHash.slice(-8)}
              </div>
              <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-medium transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Asset Composition line */}
              <div className="flex gap-2 mb-6 h-2 rounded-full overflow-hidden">
                 {bag.assets.map((asset, i) => {
                    const pct = parseInt(asset.allocation);
                    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];
                    return (
                        <div key={asset.symbol} style={{ width: `${pct}%` }} className={`h-full ${colors[i % colors.length]}`} title={`${asset.symbol} ${asset.allocation}`}></div>
                    );
                 })}
              </div>

              <div className="bg-[#0B132B]/80 border border-surfaceCardBorder/30 rounded-2xl p-4 transition-colors focus-within:border-accentPrimary/50 shadow-inner mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-white/50">Amount to deposit</span>
                  <span className="text-sm font-medium text-white/50 flex items-center gap-1"><Wallet className="w-3 h-3" /> Balance: --</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-4xl font-display font-medium outline-none w-full placeholder:text-white/10"
                  />
                  <div className="flex justify-between items-center gap-2 bg-surfaceCard px-3 py-2 rounded-xl border border-surfaceCardBorder min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">S</div>
                      <span className="font-semibold tracking-tight">SOL</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 text-sm mb-6">
                 <div className="flex justify-between">
                    <span className="text-white/60">Expected Return</span>
                    <span className="text-green-400 font-bold">{bag.apy}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-white/60">Platform Fees</span>
                    <span className="text-white">0%</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-white/60">Underlying Vault</span>
                    <span className="text-white">SPL Token Vault</span>
                 </div>
              </div>

              <button 
                onClick={handleDeposit}
                disabled={!connected || !amount || isDepositing}
                className="w-full bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-accentPrimary flex justify-center items-center gap-2"
              >
                {isDepositing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Zapping in...</>
                ) : !connected ? (
                  'Connect Wallet'
                ) : !amount ? (
                  'Enter amount'
                ) : (
                  'Zap & Deposit'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
