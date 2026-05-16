'use client';

import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowUpDown, Loader2 } from 'lucide-react';

export function HoldingsTable() {
  const { connected } = useWallet();
  const { balances, isLoading } = useWalletBalances();

  if (!connected) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-surfaceCardBorder/50">
        <h3 className="font-display text-lg font-semibold">Detailed Holdings</h3>
      </div>

      {isLoading && balances.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading on-chain balances…</span>
        </div>
      ) : balances.length === 0 ? (
        <div className="p-12 text-center text-white/40 text-sm">
          No holdings found for this wallet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white/50 uppercase bg-surfaceCard/30">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Asset</th>
                <th scope="col" className="px-6 py-4 font-medium">Balance</th>
                <th scope="col" className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group">
                  <div className="flex items-center gap-1">
                    Value (USD)
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-medium">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceCardBorder/50">
              {balances.map((asset) => (
                <tr key={asset.mint} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accentPrimary/20 flex items-center justify-center text-xs font-bold text-accentPrimary">
                        {asset.icon}
                      </div>
                      <div>
                        <div className="font-medium text-white">{asset.symbol}</div>
                        <div className="text-white/50 text-xs">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/80 font-medium">
                    {asset.balanceUi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    ${asset.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                      <span className="text-white/70">Solana</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading && balances.length > 0 && (
        <div className="px-6 py-3 border-t border-surfaceCardBorder/50 flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing…
        </div>
      )}
    </div>
  );
}
