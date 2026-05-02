'use client';

import { useState } from 'react';
import { DepositModal } from './deposit-modal';
import { ArrowRight, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface BagCardProps {
  id: string;
  title: string;
  description: string;
  apy: string;
  tvl: string;
  risk: 'Low' | 'Medium' | 'High';
  assets: { symbol: string; icon: string; allocation: string }[];
}

export function BagCard({ id, title, description, apy, tvl, risk, assets }: BagCardProps) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  return (
    <>
      <div className="glass-card p-6 flex flex-col h-full hover:border-accentPrimary/40 transition-colors">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white mb-1">{title}</h3>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/10 text-white/70">
              {risk} Risk
            </span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-green-400 font-bold">
               <TrendingUp className="w-4 h-4" />
               <span>{apy}</span>
            </div>
            <div className="text-xs text-white/50 mt-1">APY</div>
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
                   <span className="text-white/60">{asset.allocation}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="text-xs text-white/50">TVL</div>
            <div className="font-mono text-sm font-medium">{tvl}</div>
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
           bag={{ id, title, apy, assets }} 
        />
      )}
    </>
  );
}
