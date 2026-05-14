'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Lock, Crown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { db } from '@/lib/database';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ProDashboard() {
  const { connected, publicKey } = useWallet();
  const [isPro, setIsPro] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const address = publicKey?.toBase58();

  useEffect(() => {
    let isMounted = true;
    
    const checkProStatus = async () => {
      if (!connected || !address) {
        if (isMounted) {
          setIsPro(false);
          setIsChecking(false);
        }
        return;
      }

      try {
        setIsChecking(true);
        const existingUser = await db.users.findByWalletAddress(address);
        
        if (isMounted) {
          if (!existingUser) {
            await db.users.createUser(address, false);
            setIsPro(false);
          } else {
            setIsPro(!!existingUser.is_pro);
          }
        }
      } catch (err) {
        console.error('Error fetching pro status:', err);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkProStatus();

    return () => {
      isMounted = false;
    };
  }, [connected, address]);

  const handleMintPro = async () => {
    if (!address) return;
    
    try {
      setIsChecking(true);
      await db.users.updateProStatus(address, true);
      setIsPro(true);
    } catch (err) {
      console.error('Error upgrading to pro', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-accentPrimary/10 text-accentPrimary rounded-2xl flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-display font-bold mb-4">Connect Wallet</h2>
        <p className="text-white/60 max-w-md">
          Please connect your Solana wallet to access BagFi Pro Analytics and Historical Data.
        </p>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
        <div className="w-16 h-16 bg-accentPrimary/10 text-accentPrimary rounded-2xl flex items-center justify-center mb-6">
          <Crown className="w-8 h-8 opacity-50" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Verifying Pro Status...</h2>
        <p className="text-white/60">Checking for BagFi Genesis NFT or active subscription.</p>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-8 transform -rotate-12">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">
          Unlock BagFi Pro
        </h2>
        <p className="text-lg text-white/70 mb-8 leading-relaxed">
          Get access to advanced portfolio analytics, historical IL tracking, auto-rebalancing strategies, and priority routing.
        </p>
        
        <div className="grid sm:grid-cols-2 gap-4 w-full mb-10 text-left">
          <div className="glass-card p-5 border-amber-500/20">
            <div className="font-bold mb-1 text-white">Historical PnL</div>
            <div className="text-sm text-white/50">Track your portfolio against SOL/BTC benchmarks over time.</div>
          </div>
          <div className="glass-card p-5 border-amber-500/20">
            <div className="font-bold mb-1 text-white">Impermanent Loss Tracker</div>
            <div className="text-sm text-white/50">Real-time alerts and projections for your LP positions.</div>
          </div>
        </div>

        <button 
          onClick={handleMintPro}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-deepNavy font-bold py-4 px-12 rounded-xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95"
        >
          Mint Pro Pass (0.5 SOL)
        </button>
        <p className="mt-4 text-xs text-white/40">Demo Mode: Button will instantly grant access.</p>
      </div>
    );
  }

  // Pro Dashboard Content
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'My Portfolio',
        data: [10000, 11500, 10800, 13200, 14500, 13900, 16400],
        borderColor: '#48CAE4',
        backgroundColor: 'rgba(72, 202, 228, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'SOL Benchmark',
        data: [10000, 10500, 9800, 11000, 10500, 11200, 12500],
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderDash: [5, 5],
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            Pro Analytics <Crown className="w-6 h-6 text-amber-400" />
          </h1>
          <p className="text-white/60 mt-1">Advanced insights for your aggregated BagFi portfolio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-accentPrimary/20 bg-accentPrimary/5">
          <div className="text-sm text-accentPrimary mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Alpha Generated</div>
          <div className="text-3xl font-display font-bold">+24.5%</div>
          <div className="text-xs text-white/50 mt-2">vs. Holding SOL</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-white/50 mb-2">Est. Impermanent Loss</div>
          <div className="text-3xl font-display font-bold text-white">-$142.50</div>
          <div className="text-xs text-white/50 mt-2">Across 3 LP Positions</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-white/50 mb-2">Harvested Yield</div>
          <div className="text-3xl font-display font-bold text-green-400">+$1,240.00</div>
          <div className="text-xs text-white/50 mt-2">Lifetime Auto-Compounding</div>
        </div>
      </div>

      <div className="glass-card p-6 min-h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Performance vs Benchmark</h3>
          <select className="bg-deepNavy border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none text-white/70">
            <option>All Time</option>
            <option>1Y</option>
            <option>30D</option>
          </select>
        </div>
        <div className="flex-1 relative w-full h-[300px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="glass-card p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Risk Advisory (Pro)</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
            <span className="text-white/70">Kamino (Solana) Utilization Rate Spiked</span>
            <span className="text-red-400 font-medium">High Risk</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
            <span className="text-white/70">Solana Bluechip Bag Composition Drift</span>
            <span className="text-amber-400 font-medium">Rebalance Suggested</span>
          </div>
        </div>
      </div>
    </div>
  );
}
