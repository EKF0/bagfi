'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
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
  Coins
} from 'lucide-react';
import telemetry from '@/lib/telemetry';

type WizardStep = 'metadata' | 'preview' | 'launch' | 'success';

export function LaunchWizard() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [step, setStep] = useState<WizardStep>('metadata');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [tokenMint, setTokenMint] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 'metadata') setStep('preview');
    else if (step === 'preview') setStep('launch');
  };

  const prevStep = () => {
    if (step === 'preview') setStep('metadata');
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
        setStep('preview');
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
      const response = await fetch('/api/bags/creator/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          creator: publicKey.toBase58(),
          metadataUri,
          initialBuyAmount: (parseFloat(formData.initialBuy) * 1e9).toString() // lamports
        })
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to generate launch transaction');

      const { tx, tokenMint, blockhash } = json.data;
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

      // Simulation
      const transaction = VersionedTransaction.deserialize(Buffer.from(tx, 'base64'));
      const simulation = await connection.simulateTransaction(transaction);
      
      const durationMs = Date.now() - startTime;
      if (simulation.value.err) {
        telemetry.trackSolanaSimulation({
          success: false,
          durationMs,
          error: JSON.stringify(simulation.value.err),
          action: 'token-launch'
        });
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      telemetry.trackSolanaSimulation({
        success: true,
        durationMs,
        computeUnits: simulation.value.unitsConsumed || 0,
        action: 'token-launch'
      });

      // Sign & Send
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendTransaction(signedTx, {
        maxRetries: 3,
        skipPreflight: true,
        preflightCommitment: 'confirmed'
      });
      setTxSignature(signature);
      setTokenMint(tokenMint);
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      telemetry.trackSolanaConfirmation({
        signature,
        durationMs: Date.now() - startTime,
        status: 'confirmed',
        action: 'token-launch'
      });

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
      <div className="flex items-center gap-4 mb-10">
        <StepDot status={step === 'metadata' ? 'active' : 'completed'} label="Metadata" />
        <div className="h-px bg-white/10 flex-1" />
        <StepDot status={step === 'preview' ? 'active' : step === 'metadata' ? 'pending' : 'completed'} label="Preview" />
        <div className="h-px bg-white/10 flex-1" />
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next: Review Details <ArrowRight className="w-4 h-4" /></>}
            </button>
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
                  <span className="text-white/40">Metadata Status</span>
                  <span className="flex items-center gap-1 text-green-400 font-medium"><CheckCircle className="w-3 h-3" /> Ready</span>
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
              <button 
                onClick={prevStep}
                className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
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
                  You are about to launch <strong>${formData.symbol}</strong> on Solana. 
                  A transaction will be sent to your wallet for signing.
                </p>
             </div>

             <div className="w-full bg-white/5 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Operation</span>
                   <span className="text-white font-medium">Bags Token Launch</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Initial Liquidity</span>
                   <span className="text-accentPrimary font-bold">{formData.initialBuy} SOL</span>
                </div>
             </div>

             <div className="w-full flex gap-4">
               <button 
                onClick={prevStep}
                disabled={isLoading}
                className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Cancel
              </button>
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
                  Your token <strong>${formData.symbol}</strong> has been successfully broadcast to the Solana network.
                </p>
             </div>

             <div className="w-full space-y-3">
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
