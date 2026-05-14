'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

export function AssetAllocation() {
  const { connected } = useWallet();

  const data = useMemo(() => {
    return {
      labels: ['SOL', 'USDC', 'JUP', 'BONK'],
      datasets: [
        {
          data: [6500, 4200, 1100, 650.75],
          backgroundColor: [
            '#48CAE4', // Primary Accent
            '#0077B6', // Tertiary Accent
            '#00B4D8', // Secondary
            '#1C2541', // Surface
          ],
          borderColor: '#0B132B', // Deep Navy border 
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, []);

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
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
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

  return (
    <div className="glass-card p-6 h-full min-h-[300px] flex flex-col">
      <h3 className="font-display text-lg font-semibold mb-6">Asset Allocation</h3>
      <div className="relative flex-1 w-full flex items-center justify-center">
        <div className="w-full h-full min-h-[220px]">
          <Doughnut data={data} options={options} />
        </div>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-24">
          <div className="text-center">
            <span className="block text-white/50 text-xs font-medium">Top Asset</span>
            <span className="block font-display text-xl font-bold">SOL</span>
            <span className="block text-accentPrimary text-sm">52%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
