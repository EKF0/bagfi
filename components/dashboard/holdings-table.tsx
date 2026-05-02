'use client';

import { useAccount } from 'wagmi';
import { ArrowUpDown } from 'lucide-react';

const MOCK_HOLDINGS = [
  { id: 1, symbol: 'ETH', name: 'Ethereum', balance: '2.5', valueUSD: 6500, chain: 'Ethereum', chainColor: 'bg-blue-600' },
  { id: 2, symbol: 'USDC', name: 'USD Coin', balance: '4200.00', valueUSD: 4200, chain: 'Arbitrum', chainColor: 'bg-indigo-500' },
  { id: 3, symbol: 'ARB', name: 'Arbitrum', balance: '1250', valueUSD: 1100, chain: 'Arbitrum', chainColor: 'bg-indigo-500' },
  { id: 4, symbol: 'OP', name: 'Optimism', balance: '340', valueUSD: 650.75, chain: 'Optimism', chainColor: 'bg-red-500' },
];

export function HoldingsTable() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-surfaceCardBorder/50">
        <h3 className="font-display text-lg font-semibold">Detailed Holdings</h3>
      </div>
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
            {MOCK_HOLDINGS.map((asset) => (
              <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accentPrimary/20 flex items-center justify-center text-xs font-bold text-accentPrimary">
                      {asset.symbol[0]}
                    </div>
                    <div>
                      <div className="font-medium text-white">{asset.symbol}</div>
                      <div className="text-white/50 text-xs">{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-white/80 font-medium">
                  {asset.balance}
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  ${asset.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${asset.chainColor}`}></div>
                    <span className="text-white/70">{asset.chain}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
