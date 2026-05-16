'use client';

import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2, TrendingUp, Wallet } from 'lucide-react';

export function NetWorth() {
  const { connected } = useWallet();
  const { totalValueUsd, isLoading, fetchedAt } = useWalletBalances();

  if (!connected) {
    return (
      <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center min-h-[240px] text-center">
        <div className="h-12 w-12 rounded-full bg-surfaceCardBorder/50 flex items-center justify-center mb-4 text-white/50">
          <Wallet className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Welcome to BagFi</h2>
        <p className="text-white/60 max-w-md">Connect your Solana wallet to view your fragmented balances unified in one place.</p>
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
              {isLoading && totalValueUsd === 0 ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-accentPrimary" />
                  <span className="text-white/40 text-lg">Loading balances…</span>
                </div>
              ) : (
                <>
                  <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                    ${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h1>
                  <div className="flex items-center gap-1 bg-white/5 text-white/40 px-2.5 py-1 rounded-full text-sm font-medium mb-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span>--</span>
                  </div>
                </>
              )}
            </div>
            {/* Day change requires historical snapshots — available after SOL6 */}
            <p className="text-sm text-white/30 mt-1">
              Daily change available after history tracking is enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-surfaceCardBorder/50 pt-4 mt-auto">
          <div className="flex -space-x-2">
            <ChainBadge bg="bg-gradient-to-br from-purple-500 to-blue-500" title="Solana" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">On Solana</span>
            {isLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-white/30" />
            )}
            {fetchedAt && !isLoading && (
              <span className="text-xs text-white/25">
                Updated {new Date(fetchedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChainBadge({ bg, title }: { bg: string; title: string }) {
  return (
    <div className={`h-8 w-8 rounded-full border-2 border-deepNavy flex items-center justify-center ${bg}`} title={title}>
      <span className="text-xs font-bold text-white">S</span>
    </div>
  );
}
