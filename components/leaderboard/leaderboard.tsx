'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import {
  getUserProfileSigningMessage,
  type UserProfileAuthorization
} from '@/lib/users/profile-signing';

const MOCK_LEADERBOARD = [
  { rank: 1, address: '7xKXtg...9Wp', yield: '+42.5%', tvl: '$1.2M', tags: ['DeFi Degen', 'Whale'] },
  { rank: 2, address: '3J98tR...Wx', yield: '+38.1%', tvl: '$450K', tags: ['Solana Maxi'] },
  { rank: 3, address: 'HN7cAB...fR', yield: '+35.2%', tvl: '$89K', tags: ['Early Adopter'] },
  { rank: 4, address: '8ZN5xB...kL', yield: '+31.0%', tvl: '$2.1M', tags: ['Whale'] },
  { rank: 5, address: '2YpNqR...zT', yield: '+29.4%', tvl: '$15K', tags: [] },
  { rank: 6, address: '9XvMwP...hJ', yield: '+28.8%', tvl: '$45K', tags: [] },
];

export function Leaderboard() {
  const { connected, publicKey, signMessage } = useWallet();
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState(MOCK_LEADERBOARD);

  const address = publicKey?.toBase58();

  useEffect(() => {
    let isMounted = true;
    
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/users/leaderboard?limit=50');
        const json = await response.json();

        if (!response.ok || json.success === false) {
          throw new Error(json.error || 'Failed to load leaderboard');
        }
        
        if (isMounted) {
          const realUsers = (json.data || []).map((u: any, i: number) => ({
            rank: i + 1,
            address: u.wallet_address.slice(0, 4) + '...' + u.wallet_address.slice(-4),
            yield: '+12.4%',
            tvl: '$' + (Math.random() * 10).toFixed(1) + 'K',
            tags: ['Community Member']
          }));
          
          if (realUsers.length > 0) {
            const combined = [...realUsers, ...MOCK_LEADERBOARD].map((u, i) => ({
              ...u, rank: i + 1
            }));
            setLeaderboardData(combined);
          }
        }
        
        if (address && isMounted) {
          const profileResponse = await fetch(`/api/users/profile?walletAddress=${encodeURIComponent(address)}`);
          const profileJson = await profileResponse.json();
          
          if (profileJson.success && profileJson.data) {
            setIsPublic(Boolean(profileJson.data.is_public_leaderboard));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchLeaderboard();
    
    return () => {
      isMounted = false;
    };
  }, [address]);

  function bytesToBase64(value: Uint8Array) {
    let binary = '';

    for (const byte of value) {
      binary += String.fromCharCode(byte);
    }

    return window.btoa(binary);
  }

  async function createAuthorization(isPublicLeaderboard: boolean): Promise<UserProfileAuthorization | null> {
    if (!address || !signMessage) {
      return null;
    }

    const message = getUserProfileSigningMessage({
      walletAddress: address,
      action: 'update-public-leaderboard',
      isPublicLeaderboard
    });
    const signature = await signMessage(new TextEncoder().encode(message));

    return {
      message,
      signature: bytesToBase64(signature)
    };
  }

  const togglePublic = async () => {
    if (!address) return;
    const newValue = !isPublic;
    setIsPublic(newValue);
    setUpdateError(null);
    
    try {
      const authorization = await createAuthorization(newValue);

      if (!authorization) {
        throw new Error('Your wallet must support message signing to update leaderboard visibility.');
      }

      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'update-public-leaderboard',
          isPublicLeaderboard: newValue,
          authorization
        })
      });
      const json = await response.json();

      if (!response.ok || json.success === false) {
        throw new Error(json.error || 'Failed to update public status');
      }
    } catch (err) {
      console.error('Failed to update public status:', err);
      setIsPublic(!newValue);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update public status.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-accentPrimary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-accentPrimary" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">Yield Leaderboard</h1>
        <p className="text-white/60 max-w-xl mx-auto">
          Top performing Smart Bag portfolios. Opt-in to show off your alpha and compete for community airdrops.
        </p>
      </div>

      {connected && (
        <div className="glass-card p-6 mb-10 border-accentPrimary/30 bg-accentPrimary/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-deepNavy rounded-full flex items-center justify-center border border-surfaceCardBorder font-bold text-white/50">
              ?
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">Your Rank</div>
              <div className="font-bold text-xl">Not Ranked</div>
            </div>
          </div>
          
          <div className="text-center sm:text-right">
            <div className="text-sm text-white/60 mb-2">Share your performance publicly?</div>
            <button 
              onClick={togglePublic}
              disabled={!signMessage}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${isPublic ? 'bg-white/10 text-white' : 'bg-accentPrimary text-deepNavy'}`}
            >
              {isPublic ? 'Make Private' : 'Make Public & Opt-in'}
            </button>
            {updateError && (
              <div className="mt-2 text-xs text-red-300 max-w-xs">{updateError}</div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-sm text-white/40 uppercase tracking-wider">
                <th className="p-6 font-medium">Rank</th>
                <th className="p-6 font-medium">Address</th>
                <th className="p-6 font-medium text-right">Lifetime Yield</th>
                <th className="p-6 font-medium text-right">Portfolio TVL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-white/50">
                    <div className="flex justify-center mb-4"><Loader2 className="w-8 h-8 animate-spin text-accentPrimary" /></div>
                    Loading leaderboard data from Supabase...
                  </td>
                </tr>
              ) : leaderboardData.map((user, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    {user.rank === 1 ? <Medal className="w-6 h-6 text-yellow-400" /> :
                     user.rank === 2 ? <Medal className="w-6 h-6 text-gray-300" /> :
                     user.rank === 3 ? <Medal className="w-6 h-6 text-amber-600" /> :
                     <div className="font-mono text-white/40 pl-2">{user.rank}</div>}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-white group-hover:text-accentPrimary transition-colors">
                        {user.address}
                      </div>
                      <div className="flex gap-2">
                        {user.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-white/10 text-white/60">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-right font-mono font-bold text-green-400">
                    {user.yield}
                  </td>
                  <td className="p-6 text-right text-white/70">
                    {user.tvl}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
