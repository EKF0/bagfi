'use client';

import { useAccount, useBalance, useEnsName } from 'wagmi';
import { formatUnits } from 'viem';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function NetWorth() {
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  
  // Simulated mocked data since we are just aggregating
  // In a real app, this would use a hook fetching from the indexer
  const isLoading = false;
  const totalValue = 12450.75;
  const dayChange = 450.20;
  const dayChangePct = +3.4;

  if (!isConnected) {
    return (
      <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center min-h-[240px] text-center">
        <div className="h-12 w-12 rounded-full bg-surfaceCardBorder/50 flex items-center justify-center mb-4 text-white/50">
          <Wallet className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Welcome to BagFi</h2>
        <p className="text-white/60 max-w-md">Connect your wallet to view your fragmented balances unified in one place.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 md:p-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Wallet className="w-48 h-48 text-accentPrimary transform translate-x-1/4 -translate-y-1/4" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-white/60 mb-1">Total Net Worth</p>
            <div className="flex items-end gap-3">
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-sm font-medium mb-1.5">
                <TrendingUp className="h-4 w-4" />
                <span>{dayChangePct}%</span>
              </div>
            </div>
            <p className="text-sm text-green-400/80 mt-1">
              +${dayChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-surfaceCardBorder/50 pt-4 mt-auto">
          <div className="flex -space-x-2">
            <ChainBadge bg="bg-blue-600" title="Ethereum" />
            <ChainBadge bg="bg-indigo-500" title="Arbitrum" />
            <ChainBadge bg="bg-red-500" title="Optimism" />
            <ChainBadge bg="bg-blue-400" title="Base" />
          </div>
          <span className="text-sm text-white/60">Across 4 networks</span>
        </div>
      </div>
    </div>
  );
}

function ChainBadge({ bg, title }: { bg: string; title: string }) {
  return (
    <div className={`h-8 w-8 rounded-full border-2 border-deepNavy flex items-center justify-center ${bg}`} title={title}>
      {/* Placeholder for chain icons */}
    </div>
  );
}
