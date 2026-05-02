'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, Medal, MapPin, ExternalLink, Share2 } from 'lucide-react';

const MOCK_LEADERBOARD = [
  { rank: 1, address: 'vitalik.eth', yield: '+42.5%', tvl: '$1.2M', tags: ['DeFi Degen', 'Whale'] },
  { rank: 2, address: '0x742d...44e', yield: '+38.1%', tvl: '$450K', tags: ['L2 Maxi'] },
  { rank: 3, address: 'bagchaser.eth', yield: '+35.2%', tvl: '$89K', tags: ['Early Adopter'] },
  { rank: 4, address: '0x123f...99a', yield: '+31.0%', tvl: '$2.1M', tags: ['Whale'] },
  { rank: 5, address: 'yieldfarmer.eth', yield: '+29.4%', tvl: '$15K', tags: [] },
  { rank: 6, address: '0x999...111', yield: '+28.8%', tvl: '$45K', tags: [] },
];

export function Leaderboard() {
  const { isConnected, address } = useAccount();
  const [isPublic, setIsPublic] = useState(false);

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

       {isConnected && (
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
                 onClick={() => setIsPublic(!isPublic)}
                 className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors \${isPublic ? 'bg-white/10 text-white' : 'bg-accentPrimary text-deepNavy'}`}
               >
                 {isPublic ? 'Make Private' : 'Make Public & Opt-in'}
               </button>
            </div>
         </div>
       )}

       <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-sm text-white/40 uppercase tracking-wider">
                  <th className="p-6 font-medium">Rank</th>
                  <th className="p-6 font-medium">Address / ENS</th>
                  <th className="p-6 font-medium text-right">Lifetime Yield</th>
                  <th className="p-6 font-medium text-right">Portfolio TVL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_LEADERBOARD.map((user, index) => (
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
