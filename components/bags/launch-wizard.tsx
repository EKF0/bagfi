'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { 
  Rocket, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Eye,
  Coins,
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import telemetry from '@/lib/telemetry';

type WizardStep = 'metadata' | 'fee-share' | 'preview' | 'launch' | 'success';

interface Participant {
  wallet: string;
  bps: number;
}

export function LaunchWizard() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [step, setStep] = useState<WizardStep>('metadata');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [tokenMint, setTokenMint] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [feeConfigSignature, setFeeConfigSignature] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
    imageUrl: '',
    initialBuy: '0'
  });

  const [participants, setParticipants] = useState<Participant[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addParticipant = () => {
    setParticipants(prev => [...prev, { wallet: '', bps: 0 }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string | number) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalBps = participants.reduce((sum, p) => sum + p.bps, 0);

  const nextStep = () => {
    if (step === 'metadata') setStep('fee-share');
    else if (step === 'fee-share') setStep('preview');
    else if (step === 'preview') setStep('launch');
  };

  const prevStep = () => {
    if (step === 'fee-share') setStep('metadata');
    else if (step === 'preview') setStep('fee-share');
    else if (step === 'launch') setStep('preview');
  };

  const handleCreateMetadata = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bags/creator/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          walletAddress: publicKey.toBase58() 
        })
      });

      const json = await response.json();
      if (json.success) {
        setMetadataUri(json.data.metadataUri);
        setStep('fee-share');
      } else {
        throw new Error(json.error || 'Failed to create metadata');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!publicKey || !signTransaction || !metadataUri) return;

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

      // 1. Launch Token
      const launchResponse = await fetch('/api/bags/creator/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          creator: publicKey.toBase58(),
          metadataUri,
          initialBuyAmount: (parseFloat(formData.initialBuy) * 1e9).toString()
        })
      });

      const launchJson = await launchResponse.json();
      if (!launchJson.success) throw new Error(launchJson.error || 'Failed to generate launch transaction');

      const { tx, tokenMint: launchedMint } = launchJson.data;
      const transaction = VersionedTransaction.deserialize(Buffer.from(tx, 'base64'));
      
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendTransaction(signedTx, {
        maxRetries: 3,
        skipPreflight: true,
        preflightCommitment: 'confirmed'
      });
      setTxSignature(signature);
      setTokenMint(launchedMint);
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      telemetry.trackSolanaConfirmation({
        signature,
        durationMs: Date.now() - startTime,
        status: 'confirmed',
        action: 'token-launch'
      });

      // 2. Configure Fee Sharing (if participants exist)
      if (participants.length > 0) {
        try {
          const feeResponse = await fetch('/api/bags/creator/fee-share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creator: publicKey.toBase58(),
              tokenMint: launchedMint,
              participants
            })
          });

          const feeJson = await feeResponse.json();
          if (feeJson.success) {
            const feeTxs = feeJson.data;
            for (const txData of feeTxs) {
              const feeTx = VersionedTransaction.deserialize(Buffer.from(txData.tx, 'base64'));
              const signedFeeTx = await signTransaction(feeTx);
              const feeSig = await connection.sendTransaction(signedFeeTx, {
                maxRetries: 3,
                preflightCommitment: 'confirmed'
              });
              setFeeConfigSignature(feeSig);
              await connection.confirmTransaction(feeSig, 'confirmed');
            }
          }
        } catch (feeErr) {
          console.error('Fee share config failed, but token was launched:', feeErr);
          // Don't fail the whole flow if only fee share config failed
        }
      }

      setStep('success');

    } catch (err: any) {
      console.error('Launch error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center">
         <Rocket className="w-12 h-12 text-white/20 mb-6" />
         <h3 className="text-2xl font-bold mb-4">Connect Wallet to Start</h3>
         <p className="text-white/50 max-w-md mb-8">You must connect your Solana wallet to use the Creator Lab and launch tokens.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Steps Indicator */}
      <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        <StepDot status={step === 'metadata' ? 'active' : 'completed'} label="Metadata" />
        <div className="h-px bg-white/10 flex-1 min-w-[20px]" />
        <StepDot status={step === 'fee-share' ? 'active' : step === 'metadata' ? 'pending' : 'completed'} label="Fee Share" />
        <div className="h-px bg-white/10 flex-1 min-w-[20px]" />
        <StepDot status={step === 'preview' ? 'active' : (step === 'metadata' || step === 'fee-share') ? 'pending' : 'completed'} label="Preview" />
        <div className="h-px bg-white/10 flex-1 min-w-[20px]" />
        <StepDot status={step === 'launch' ? 'active' : (step === 'success' ? 'completed' : 'pending')} label="Launch" />
      </div>

      <div className="glass-card p-8 min-h-[400px] flex flex-col">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="text-sm text-red-200/80">{error}</div>
          </div>
        )}

        {step === 'metadata' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Token Name</label>
                <input 
                  name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="e.g. BagFi Alpha"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accentPrimary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Symbol</label>
                <input 
                  name="symbol" value={formData.symbol} onChange={handleInputChange}
                  placeholder="e.g. BAG"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accentPrimary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Description</label>
              <textarea 
                name="description" value={formData.description} onChange={handleInputChange}
                placeholder="Tell the community about your token..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accentPrimary/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Image URL</label>
                <input 
                  name="imageUrl" value={formData.imageUrl} onChange={handleInputChange}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accentPrimary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Twitter (Optional)</label>
                <input 
                  name="twitter" value={formData.twitter} onChange={handleInputChange}
                  placeholder="@handle"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accentPrimary/50"
                />
              </div>
            </div>

            <button 
              onClick={handleCreateMetadata}
              disabled={isLoading || !formData.name || !formData.symbol}
              className="mt-4 w-full bg-accentPrimary hover:bg-accentSecondary disabled:bg-white/5 text-deepNavy font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next: Configure Economics <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 'fee-share' && (
          <div className="space-y-6">
            <div>
               <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                 <Users className="w-5 h-5 text-accentPrimary" />
                 Fee Share Configuration
               </h3>
               <p className="text-sm text-white/40 mb-6">Distribute launch-related fees between multiple stakeholder wallets. Total must not exceed 100%.</p>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {participants.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-white/30">Wallet Address</label>
                    <input 
                      value={p.wallet} 
                      onChange={(e) => updateParticipant(idx, 'wallet', e.target.value)}
                      placeholder="Solana Address"
                      className="w-full bg-transparent text-sm text-white outline-none font-mono"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-white/30">Allocation %</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        value={p.bps / 100}
                        onChange={(e) => updateParticipant(idx, 'bps', Math.round(parseFloat(e.target.value) * 100))}
                        className="w-full bg-transparent text-sm text-white outline-none font-bold"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeParticipant(idx)} className="mt-4 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={addParticipant}
              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Stakeholder
            </button>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
               <span className="text-sm text-white/40">Total Allocated</span>
               <span className={`font-bold ${(totalBps > 10000) ? 'text-red-400' : 'text-accentPrimary'}`}>
                 {(totalBps / 100).toFixed(2)}%
               </span>
            </div>

            <div className="flex gap-4">
               <button onClick={prevStep} className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl">Back</button>
               <button 
                  onClick={nextStep}
                  disabled={totalBps > 10000}
                  className="flex-1 bg-accentPrimary hover:bg-accentSecondary disabled:bg-white/5 text-deepNavy font-bold py-4 rounded-xl transition-all"
               >
                 Review Launch
               </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
               <div className="w-24 h-24 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center">
                 {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" alt="" /> : <Rocket className="w-10 h-10 text-white/10" />}
               </div>
               <div>
                  <h3 className="text-2xl font-bold">{formData.name}</h3>
                  <p className="text-accentPrimary font-mono font-bold">${formData.symbol}</p>
                  <p className="text-white/50 text-sm mt-2 line-clamp-2">{formData.description}</p>
               </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">Fee Sharing</span>
                  <span className="text-white font-medium">{participants.length} stakeholders ({(totalBps / 100).toFixed(2)}%)</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">Network</span>
                  <span className="text-white">Solana Mainnet</span>
               </div>
               <div className="pt-4 border-t border-white/5">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Initial Buy (Optional)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      name="initialBuy" value={formData.initialBuy} onChange={handleInputChange}
                      placeholder="0.0"
                      className="bg-transparent text-3xl font-display font-medium outline-none w-full"
                    />
                    <span className="text-xl font-bold text-white/30">SOL</span>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
              <button onClick={prevStep} className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl">Back</button>
              <button 
                onClick={nextStep}
                className="flex-1 bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Proceed to Launch <Rocket className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'launch' && (
          <div className="space-y-8 flex flex-col items-center justify-center flex-1 text-center py-10">
             <div className="w-20 h-20 bg-accentPrimary/10 text-accentPrimary rounded-full flex items-center justify-center animate-pulse mb-6">
                <Rocket className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-2xl font-bold mb-2">Confirm Launch</h3>
                <p className="text-white/50 max-w-sm mx-auto">
                  You are about to launch <strong>${formData.symbol}</strong>. 
                  This will trigger two transactions: Token Creation and Fee Configuration.
                </p>
             </div>

             <div className="w-full bg-white/5 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Initial Liquidity</span>
                   <span className="text-accentPrimary font-bold">{formData.initialBuy} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Fee Structure</span>
                   <span className="text-white font-medium">{participants.length > 0 ? 'Custom Share' : 'Default'}</span>
                </div>
             </div>

             <div className="w-full flex gap-4">
               <button onClick={prevStep} disabled={isLoading} className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl disabled:opacity-50">Cancel</button>
               <button 
                onClick={handleLaunch}
                disabled={isLoading}
                className="flex-1 bg-accentPrimary hover:bg-accentSecondary text-deepNavy font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign & Broadcast Launch</>}
              </button>
             </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-8 flex flex-col items-center justify-center flex-1 text-center py-10">
             <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-3xl font-display font-bold mb-2">Token Launched!</h3>
                <p className="text-white/50 max-w-sm mx-auto mb-8">
                  Your token <strong>${formData.symbol}</strong> has been successfully broadcast and configured.
                </p>
             </div>

             <div className="w-full space-y-3 text-left">
                <a 
                  href={`https://solscan.io/token/${tokenMint}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                     <Coins className="w-5 h-5 text-accentPrimary" />
                     <div className="text-left">
                        <div className="text-xs text-white/40 uppercase font-bold">Token Mint</div>
                        <div className="text-sm font-mono text-white/80">{tokenMint?.slice(0, 8)}...{tokenMint?.slice(-8)}</div>
                     </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-accentPrimary" />
                </a>

                <a 
                  href={`https://solscan.io/tx/${txSignature}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                     <Settings2 className="w-5 h-5 text-accentPrimary" />
                     <div className="text-left">
                        <div className="text-xs text-white/40 uppercase font-bold">Launch Transaction</div>
                        <div className="text-sm font-mono text-white/80">{txSignature?.slice(0, 8)}...{txSignature?.slice(-8)}</div>
                     </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-accentPrimary" />
                </a>
             </div>

             <button 
                onClick={() => {
                  setStep('metadata');
                  setFormData({
                    name: '', symbol: '', description: '', twitter: '', telegram: '', website: '', imageUrl: '', initialBuy: '0'
                  });
                  setParticipants([]);
                }}
                className="mt-6 text-accentPrimary hover:underline font-bold text-sm"
              >
                Launch Another Token
              </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ status, label }: { status: 'pending' | 'active' | 'completed', label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
        status === 'active' ? 'bg-accentPrimary scale-125 shadow-[0_0_10px_rgba(72,202,228,0.5)]' :
        status === 'completed' ? 'bg-green-400' :
        'bg-white/10'
      }`} />
      <span className={`text-[10px] uppercase font-bold tracking-tighter ${
        status === 'active' ? 'text-white' : 'text-white/30'
      }`}>{label}</span>
    </div>
  );
}
