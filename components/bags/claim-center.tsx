'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { 
  Gift, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  RefreshCw,
  Coins
} from 'lucide-react';
import { formatBaseUnits } from '@/lib/smart-bags/session-engine';
import type { ClaimablePosition } from '@/lib/bags/client';
import { useCallback } from 'react';

export function ClaimCenter() {
  const { connected, publicKey } = useWallet();
  const [positions, setPositions] = useState<ClaimablePosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPositions = useCallback(async (isInitial = false) => {
    if (!publicKey) return;
    
    if (!isInitial) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bags/claim?userPublicKey=${publicKey.toBase58()}`);
      const json = await response.json();
      if (json.success) {
        setPositions(json.data.positions || []);
      } else {
        throw new Error(json.error || 'Failed to fetch claimable positions');
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
        // Set loading state in a way that doesn't trigger sync warning if possible,
        // or just rely on the async call inside.
        setIsLoading(true);
        await fetchPositions(true);
      } else {
        setPositions([]);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [connected, publicKey, fetchPositions]);

  if (!connected) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-accentPrimary/10 text-accentPrimary rounded-full flex items-center justify-center mb-6">
          <Gift className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Claim Your Earnings</h3>
        <p className="text-white/60 max-w-md">
          Connect your Solana wallet to view and claim accumulated fees from your Bags ecosystem tokens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Gift className="w-6 h-6 text-accentPrimary" />
            Claim Center
          </h2>
          <p className="text-white/50 text-sm mt-1">Manage and withdraw your earned fees from Bags tokens.</p>
        </div>
        <button 
          onClick={() => { setIsRefreshing(true); fetchPositions(); }}
          disabled={isLoading || isRefreshing}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-sm text-red-200/80">{error}</div>
        </div>
      )}

      {isLoading && !isRefreshing ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-10 h-10 text-accentPrimary animate-spin" />
        </div>
      ) : positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positions.map((position, idx) => (
            <ClaimPositionCard key={`${position.tokenMint}-${idx}`} position={position} onClaimed={fetchPositions} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <p className="text-white/40 italic text-lg">No claimable fee positions found for this wallet.</p>
          <p className="text-white/30 text-sm mt-2">Earned fees will appear here once they are distributed.</p>
        </div>
      )}
    </div>
  );
}

function ClaimPositionCard({ position, onClaimed }: { position: ClaimablePosition, onClaimed: () => void }) {
  const { publicKey, signTransaction } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'generating' | 'simulating' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!publicKey || !signTransaction) return;

    setIsClaiming(true);
    setClaimStatus('generating');
    setClaimError(null);

    try {
      // 1. Generate transactions
      const genResponse = await fetch('/api/bags/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeClaimer: publicKey.toBase58(),
          tokenMint: position.tokenMint,
          virtualPoolAddress: position.virtualPoolAddress,
          dammV2Position: position.dammPositionInfo?.position,
          dammV2Pool: position.dammPositionInfo?.pool,
          dammV2PositionNftAccount: position.dammPositionInfo?.positionNftAccount,
          tokenAMint: position.dammPositionInfo?.tokenAMint,
          tokenBMint: position.dammPositionInfo?.tokenBMint,
          tokenAVault: position.dammPositionInfo?.tokenAVault,
          tokenBVault: position.dammPositionInfo?.tokenBVault,
          claimVirtualPoolFees: Boolean(position.virtualPoolAddress),
          claimDammV2Fees: Boolean(position.dammPositionInfo?.position),
          isCustomFeeVault: position.isCustomFeeVault,
          feeShareProgramId: position.programId,
          customFeeVaultClaimerA: position.customFeeVaultClaimerA,
          customFeeVaultClaimerB: position.customFeeVaultClaimerB,
          customFeeVaultClaimerSide: position.customFeeVaultClaimerSide
        })
      });

      const genJson = await genResponse.json();
      if (!genJson.success) throw new Error(genJson.error || 'Failed to generate transactions');

      const txs = genJson.data; // Array of { tx, blockhash }
      
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

      // For simplicity, we process them one by one
      for (const txData of txs) {
        // 2. Simulate
        setClaimStatus('simulating');
        const transaction = VersionedTransaction.deserialize(Buffer.from(txData.tx, 'base64'));
        const simulation = await connection.simulateTransaction(transaction);
        if (simulation.value.err) throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);

        // 3. Sign
        setClaimStatus('signing');
        const signedTx = await signTransaction(transaction);

        // 4. Send & Confirm
        setClaimStatus('confirming');
        const signature = await connection.sendTransaction(signedTx, {
          maxRetries: 3,
          skipPreflight: true,
          preflightCommitment: 'confirmed'
        });
        setTxSignature(signature);
        
        await connection.confirmTransaction(signature, 'confirmed');
      }

      setClaimStatus('success');
      setTimeout(() => {
        onClaimed();
      }, 3000);

    } catch (err: any) {
      console.error('Claim error:', err);
      setClaimStatus('error');
      setClaimError(err.message || 'An unexpected error occurred during claim');
    } finally {
      setIsClaiming(false);
    }
  };

  const amountSol = parseFloat(formatBaseUnits(position.totalClaimableLamportsUserShare.toString(), 9));

  return (
    <div className="glass-card p-6 flex flex-col h-full border-accentPrimary/10 hover:border-accentPrimary/30 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accentPrimary/5 border border-accentPrimary/20 rounded-2xl flex items-center justify-center text-accentPrimary group-hover:scale-110 transition-transform">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-white">{position.tokenSymbol || position.tokenMint.slice(0, 4) + '...'}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 uppercase tracking-tighter">Mint: {position.tokenMint.slice(0, 8)}...</span>
              <a href={`https://solscan.io/token/${position.tokenMint}`} target="_blank" rel="noopener noreferrer" className="text-accentPrimary opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-bold text-accentPrimary">
            {amountSol.toFixed(4)} <span className="text-sm">SOL</span>
          </div>
          <div className="text-xs text-white/40">Claimable Earnings</div>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        {claimStatus === 'success' ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <div className="text-sm font-medium">Claim Successful!</div>
          </div>
        ) : claimStatus === 'error' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col gap-1">
             <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                <AlertCircle className="w-4 h-4" /> Claim Failed
             </div>
             <p className="text-[10px] text-red-200/60 line-clamp-2">{claimError}</p>
             <button onClick={handleClaim} className="text-xs text-accentPrimary underline mt-1 text-left">Try Again</button>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isClaiming || amountSol === 0}
            className="w-full bg-accentPrimary hover:bg-accentSecondary disabled:bg-white/5 text-deepNavy font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="capitalize">{claimStatus}...</span>
              </>
            ) : (
              <>Claim {amountSol.toFixed(4)} SOL</>
            )}
          </button>
        )}
        
        {txSignature && (
          <a 
            href={`https://solscan.io/tx/${txSignature}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-white/30 hover:text-accentPrimary flex items-center justify-center gap-1 transition-colors"
          >
            View receipt on Solscan <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
