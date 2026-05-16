'use client';

import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useWallet } from '@solana/wallet-adapter-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  '#48CAE4', // Primary Accent
  '#0077B6', // Tertiary Accent
  '#00B4D8', // Secondary
  '#90E0EF', // Light blue
  '#023E8A', // Deep blue
  '#1C2541', // Surface
];

export function AssetAllocation() {
  const { connected } = useWallet();
  const { balances, totalValueUsd, isLoading } = useWalletBalances();

  const topAsset = useMemo(() => {
    if (balances.length === 0) return null;
    const top = balances[0]; // already sorted by valueUsd descending
    const pct = totalValueUsd > 0 ? Math.round((top.valueUsd / totalValueUsd) * 100) : 0;
    return { symbol: top.symbol, pct };
  }, [balances, totalValueUsd]);

  const data = useMemo(() => {
    return {
      labels: balances.map((b) => b.symbol),
      datasets: [
        {
          data: balances.map((b) => b.valueUsd),
          backgroundColor: balances.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: '#0B132B',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [balances]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#ffffff',
          font: {
            family: 'var(--font-inter)',
            size: 13
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: '#1C2541',
        titleFont: { family: 'var(--font-inter)', size: 14 },
        bodyFont: { family: 'var(--font-inter)', size: 14 },
        padding: 12,
        borderColor: '#3A506B',
        borderWidth: 1,
        callbacks: {
          label: function(context: { label?: string; parsed?: number }) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null && context.parsed !== undefined) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
            }
            return label;
          }
        }
      }
    }
  };

  if (!connected) {
    return (
      <div className="glass-card p-6 min-h-[300px] flex items-center justify-center opacity-50">
        <p className="text-white/50 text-sm">Connect wallet to view allocation</p>
      </div>
    );
  }

  if (isLoading && balances.length === 0) {
    return (
      <div className="glass-card p-6 min-h-[300px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accentPrimary" />
        <span className="text-white/40 text-sm">Loading allocation…</span>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="glass-card p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-white/40 text-sm">No assets to display</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full min-h-[300px] flex flex-col">
      <h3 className="font-display text-lg font-semibold mb-6">Asset Allocation</h3>
      <div className="relative flex-1 w-full flex items-center justify-center">
        <div className="w-full h-full min-h-[220px]">
          <Doughnut data={data} options={options} />
        </div>
        {/* Center text */}
        {topAsset && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-24">
            <div className="text-center">
              <span className="block text-white/50 text-xs font-medium">Top Asset</span>
              <span className="block font-display text-xl font-bold">{topAsset.symbol}</span>
              <span className="block text-accentPrimary text-sm">{topAsset.pct}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
