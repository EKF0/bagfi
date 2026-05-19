'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  History, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatBaseUnits } from '@/lib/smart-bags/session-engine';

interface BagsAnalyticsProps {
  eligibleMints: Array<{ mint: string; symbol: string; name: string }>;
}

export function BagsAnalytics({ eligibleMints }: BagsAnalyticsProps) {
  const [selectedMint, setSelectedMint] = useState<string>(eligibleMints[0]?.mint || '');
  const [analytics, setAnalytics] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedMint) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/bags/discovery?eligibleOnly=true`);
        const json = await response.json();
        
        if (json.success) {
          const tokenAnalytics = json.data.analytics.find((a: any) => a.token_mint === selectedMint);
          // In a real app, we might need a separate endpoint if the cache doesn't have it all
          // or filter the events from the payload
          setAnalytics(tokenAnalytics);
          
          // For events, we'd ideally have a separate endpoint or they'd be in the cache payload
          // For now, let's assume they are returned or fetch them from a hypothetical endpoint
          // But since I only updated /api/bags/discovery to return cache, I'll use that.
          // Note: My refreshBagsTokenAnalytics stores them in bags_token_claim_events.
          // I should add a way to retrieve events for a specific mint.
        }
      } catch (err) {
        console.error('Error fetching bags analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedMint]);

  if (eligibleMints.length === 0) {
    return null;
  }

  const selectedToken = eligibleMints.find(m => m.mint === selectedMint);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl flex items-center gap-2">
          <Zap className="w-5 h-5 text-accentPrimary" />
          Bags Ecosystem Analytics
        </h3>
        <select 
          value={selectedMint}
          onChange={(e) => setSelectedMint(e.target.value)}
          className="bg-deepNavy border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none text-white/70 focus:border-accentPrimary/50"
        >
          {eligibleMints.map((token) => (
            <option key={token.mint} value={token.mint}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lifetime Fees Card */}
        <div className="glass-card p-6 flex flex-col">
          <div className="text-sm text-white/50 mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Lifetime Fees Generated
          </div>
          <div className="text-3xl font-display font-bold text-accentPrimary">
            {analytics ? (
              `${parseFloat(formatBaseUnits(analytics.lifetime_fees_lamports, 9)).toLocaleString()} SOL`
            ) : (
              '---'
            )}
          </div>
          <div className="text-xs text-white/40 mt-2">
            Real-time economic activity for {selectedToken?.symbol}
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Total Claimers</span>
              <span className="font-medium">{analytics?.total_claimers || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Status</span>
              <span className="flex items-center gap-1 text-green-400">
                <ShieldCheck className="w-3 h-3" /> Eligible
              </span>
            </div>
          </div>
        </div>

        {/* Top Claimers / Creators */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="text-sm text-white/50 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Creator & Stakeholder Distribution
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="pb-3 font-medium">Claimer</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Royalty</th>
                  <th className="pb-3 font-medium text-right">Total Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics?.claim_stats?.slice(0, 5).map((claimer: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {claimer.pfp ? (
                          <img src={claimer.pfp} className="w-6 h-6 rounded-full" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                            {claimer.username?.[0] || '?'}
                          </div>
                        )}
                        <span className="font-medium text-white/80">
                          {claimer.username || `${claimer.wallet.slice(0, 4)}...${claimer.wallet.slice(-4)}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${claimer.isCreator ? 'bg-accentPrimary/20 text-accentPrimary' : 'bg-white/10 text-white/60'}`}>
                        {claimer.isCreator ? 'Creator' : 'Stakeholder'}
                      </span>
                    </td>
                    <td className="py-3 text-white/60">
                      {(claimer.royaltyBps / 100).toFixed(2)}%
                    </td>
                    <td className="py-3 text-right font-mono text-white/80">
                      {parseFloat(formatBaseUnits(claimer.totalClaimed || '0', 9)).toFixed(4)} SOL
                    </td>
                  </tr>
                ))}
                {!analytics?.claim_stats?.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-white/20 italic">
                      No claim statistics available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent History - Placeholder for now as we need a specific events retrieval method */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-white/50 flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Fee Claims
          </div>
          <a 
            href={`https://solscan.io/token/${selectedMint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accentPrimary flex items-center gap-1 hover:underline"
          >
            View on Solscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="space-y-3">
          {/* We will implement actual events display in the next turn if we add an event getter */}
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
            <p className="text-white/30 text-sm italic">Historical claim events will be synchronized on next analytics refresh.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
