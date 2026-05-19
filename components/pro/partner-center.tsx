'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { 
  Briefcase, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Settings,
  Shield
} from 'lucide-react';
import { formatBaseUnits } from '@/lib/smart-bags/session-engine';
import telemetry from '@/lib/telemetry';

export function PartnerCenter() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [stats, setStats] = useState<{ claimedFees: string; unclaimedFees: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [opStatus, setOpStatus] = useState<'idle' | 'generating' | 'simulating' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [opError, setOpError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const fetchStats = useCallback(async (isInitial = false) => {
    if (!publicKey) return;
    
    if (!isInitial) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bags/partner/stats?partner=${publicKey.toBase58()}`);
      const json = await response.json();
      if (json.success) {
        setStats(json.data);
      } else {
        // Stats might not exist if config is not created
        setStats(null);
        if (json.code !== 'HTTP_404') {
           setError(json.error || 'Failed to fetch partner stats');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicKey]);

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      if (connected && publicKey) {
        setIsLoading(true);
        await fetchStats(true);
      } else {
        setStats(null);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [connected, publicKey, fetchStats]);

  const handlePartnerOp = async (type: 'claim' | 'setup') => {
    if (!publicKey || !signTransaction) return;

    setOpStatus('generating');
    setOpError(null);
    setTxSignature(null);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/bags/partner/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner: publicKey.toBase58(), type })
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to generate transactions');

      const txs = json.data;
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

      for (const txData of txs) {
        setOpStatus('simulating');
        const transaction = VersionedTransaction.deserialize(Buffer.from(txData.tx, 'base64'));
        const simulation = await connection.simulateTransaction(transaction);
        
        const simulationDurationMs = Date.now() - startTime;
        if (simulation.value.err) {
          telemetry.trackSolanaSimulation({
            success: false,
            durationMs: simulationDurationMs,
            error: JSON.stringify(simulation.value.err),
            action: `partner-${type}`
          });
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }

        telemetry.trackSolanaSimulation({
          success: true,
          durationMs: simulationDurationMs,
          computeUnits: simulation.value.unitsConsumed || 0,
          action: `partner-${type}`
        });

        setOpStatus('signing');
        const signedTx = await signTransaction(transaction);

        setOpStatus('confirming');
        const signature = await connection.sendTransaction(signedTx, {
          maxRetries: 3,
          skipPreflight: true,
          preflightCommitment: 'confirmed'
        });
        setTxSignature(signature);
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        const confirmationDurationMs = Date.now() - startTime;

        if (confirmation.value.err) {
           telemetry.trackSolanaConfirmation({
            signature,
            durationMs: confirmationDurationMs,
            status: 'failed',
            error: JSON.stringify(confirmation.value.err),
            action: `partner-${type}`
          });
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        telemetry.trackSolanaConfirmation({
          signature,
          durationMs: confirmationDurationMs,
          status: 'confirmed',
          action: `partner-${type}`
        });
      }

      setOpStatus('success');
      setTimeout(() => {
        setOpStatus('idle');
        fetchStats();
      }, 3000);

    } catch (err: any) {
      console.error('Partner Op error:', err);
      setOpStatus('error');
      setOpError(err.message || 'An unexpected error occurred');
    }
  };

  if (!connected) return null;

  const unclaimedSol = stats ? parseFloat(formatBaseUnits(stats.unclaimedFees, 9)) : 0;
  const claimedSol = stats ? parseFloat(formatBaseUnits(stats.claimedFees, 9)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-accentPrimary" />
            Partner Center
          </h3>
          <p className="text-white/50 text-sm mt-1">Revenue reporting and configuration for Bags partners.</p>
        </div>
        <button 
          onClick={() => { setIsRefreshing(true); fetchStats(); }}
          disabled={isLoading || isRefreshing}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="glass-card p-6 bg-accentPrimary/5 border-accentPrimary/20">
          <div className="text-sm text-accentPrimary/80 mb-2 flex items-center gap-2 font-bold">
            <TrendingUp className="w-4 h-4" /> Unclaimed Revenue
          </div>
          <div className="text-3xl font-display font-bold text-white">
            {isLoading && !isRefreshing ? '---' : `${unclaimedSol.toFixed(4)} SOL`}
          </div>
          <div className="text-xs text-white/40 mt-2">Available to withdraw immediately</div>
          
          <button
            onClick={() => handlePartnerOp('claim')}
            disabled={opStatus !== 'idle' || unclaimedSol === 0}
            className="mt-6 w-full bg-accentPrimary hover:bg-accentSecondary disabled:bg-white/5 text-deepNavy font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            {opStatus !== 'idle' && opStatus !== 'success' && opStatus !== 'error' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Withdraw Fees'
            )}
          </button>
        </div>

        {/* Lifetime Stats */}
        <div className="glass-card p-6">
          <div className="text-sm text-white/50 mb-2">Lifetime Claimed</div>
          <div className="text-2xl font-bold text-white">
            {isLoading && !isRefreshing ? '---' : `${claimedSol.toFixed(4)} SOL`}
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-sm">
             <span className="text-white/50">Partner Wallet</span>
             <span className="font-mono text-white/80">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
          </div>
        </div>

        {/* Partner Config */}
        <div className="glass-card p-6 border-white/10">
          <div className="text-sm text-white/50 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Partner Configuration
          </div>
          {stats ? (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Configured & Active</span>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-white/40">Initialize your partner configuration to start earning fees.</p>
              <button
                onClick={() => handlePartnerOp('setup')}
                disabled={opStatus !== 'idle'}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {opStatus === 'generating' || opStatus === 'simulating' ? (
                   <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                   <>Initialize Config</>
                )}
              </button>
            </div>
          )}
          
          <div className="mt-6 flex items-center gap-2 text-[10px] text-white/30 uppercase font-bold tracking-tighter">
            <Shield className="w-3 h-3" /> Non-Custodial Claim
          </div>
        </div>
      </div>

      {/* Operation Status Overlay (Small) */}
      {(opStatus === 'error' || opStatus === 'success' || txSignature) && (
        <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             {opStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
             ) : opStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
             ) : (
                <Loader2 className="w-5 h-5 text-accentPrimary animate-spin" />
             )}
             <div>
               <div className="text-sm font-bold text-white">
                 {opStatus === 'success' ? 'Operation successful!' : opStatus === 'error' ? 'Operation failed' : 'Processing...'}
               </div>
               {opError && <p className="text-xs text-red-400/80 line-clamp-1">{opError}</p>}
               {txSignature && (
                 <a href={`https://solscan.io/tx/${txSignature}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accentPrimary hover:underline flex items-center gap-1">
                   View on Solscan <ExternalLink className="w-2 h-2" />
                 </a>
               )}
             </div>
           </div>
           {opStatus === 'error' && (
             <button onClick={() => setOpStatus('idle')} className="text-xs text-white/50 hover:text-white underline">Dismiss</button>
           )}
        </div>
      )}
    </div>
  );
}
