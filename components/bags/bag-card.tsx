'use client';

import { useState } from 'react';
import { DepositModal } from './deposit-modal';
import { ArrowRight, RotateCw, AlertTriangle } from 'lucide-react';
import { allocationLabel, type SmartBagTemplate } from '@/lib/smart-bags/session-engine';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useWallet } from '@solana/wallet-adapter-react';

export function BagCard(bag: SmartBagTemplate) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const { connected } = useWallet();
  const { balances } = useWalletBalances();
  const { title, description, metricLabel, metricValue, risk, assets, strategy, maxSlippageBps } = bag;

  // Compute user position for this bag's target mints
  const position = connected && balances.length > 0 ? (() => {
    const held = assets
      .map((asset) => {
        const match = balances.find((b) => b.mint === asset.mint);
        return {
          symbol: asset.symbol,
          targetBps: asset.allocationBps,
          valueUsd: match?.valueUsd ?? 0,
        };
      })
      .filter((item) => item.valueUsd > 0);

    const totalValue = held.reduce((sum, h) => sum + h.valueUsd, 0);
    if (totalValue < 0.01) return null;

    return { held, totalValue };
  })() : null;

  return (
    <>
      <div className="glass-card p-6 flex flex-col h-full hover:border-accentPrimary/40 transition-colors">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white mb-1">{title}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                risk === 'Low' ? 'bg-green-500/10 text-green-400' :
                risk === 'Medium' ? 'bg-blue-500/10 text-blue-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {risk === 'High' && <AlertTriangle className="w-3 h-3" />}
                {risk} Risk
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accentPrimary font-bold">
               <RotateCw className="w-4 h-4" />
               <span>{metricValue}</span>
            </div>
            <div className="text-xs text-white/50 mt-1">{metricLabel}</div>
          </div>
        </div>

        <p className="text-sm text-white/60 mb-6 flex-1">{description}</p>

        <div className="bg-deepNavy/50 rounded-xl p-4 mb-6">
          <div className="text-xs text-white/50 mb-3 uppercase tracking-wider font-bold">Target Allocation</div>
          <div className="space-y-3">
             {assets.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-accentPrimary/20 flex items-center justify-center text-[10px] font-bold text-accentPrimary">
                       {asset.symbol.substring(0, 1)}
                     </div>
                     <span className="font-medium text-white/80">{asset.symbol}</span>
                   </div>
                   <span className="text-white/60">{allocationLabel(asset.allocationBps)}</span>
                </div>
             ))}
          </div>
        </div>

        {/* User position section */}
        {position && (
          <div className="bg-accentPrimary/5 border border-accentPrimary/15 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-accentPrimary/80 uppercase tracking-wider font-bold">Your Position</span>
              <span className="text-sm font-bold text-accentPrimary">
                ${position.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-2">
              {position.held.map((item) => {
                const actualPct = position.totalValue > 0 ? (item.valueUsd / position.totalValue) * 100 : 0;
                const targetPct = item.targetBps / 100;
                const drift = actualPct - targetPct;
                return (
                  <div key={item.symbol} className="flex items-center justify-between text-xs">
                    <span className="text-white/70">{item.symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">{actualPct.toFixed(1)}%</span>
                      <span className={`font-mono ${Math.abs(drift) > bag.rebalanceThresholdBps / 100 ? 'text-amber-400' : 'text-white/30'}`}>
                        {drift >= 0 ? '+' : ''}{drift.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="text-xs text-white/50">{strategy}</div>
            <div className="font-mono text-sm font-medium">{(maxSlippageBps / 100).toFixed(2)}% max slippage</div>
          </div>
          <button 
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-2 bg-accentPrimary hover:bg-accentPrimary/90 text-deepNavy px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            Invest <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isDepositOpen && (
        <DepositModal 
           isOpen={isDepositOpen} 
           onClose={() => setIsDepositOpen(false)} 
           bag={bag} 
        />
      )}
    </>
  );
}
