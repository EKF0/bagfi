import { Header } from '@/components/header';
import { LaunchWizard } from '@/components/bags/launch-wizard';
import { Beaker, ShieldAlert } from 'lucide-react';

export default function CreatorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="mb-12 max-w-4xl">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-accentPrimary/10 text-accentPrimary rounded-2xl flex items-center justify-center">
                <Beaker className="w-6 h-6" />
             </div>
             <h1 className="font-display text-4xl font-bold tracking-tight">Creator Lab</h1>
          </div>
          <p className="text-lg text-white/60 leading-relaxed mb-8">
            Launch your own Bags ecosystem token with custom metadata and initial liquidity. 
            All launches are non-custodial and occur directly on the Solana blockchain.
          </p>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shrink-0">
               <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Advanced Feature: Use with Caution</h4>
              <p className="text-sm text-white/50">
                Token launching involves economic risk and technical responsibility. Ensure your metadata is accurate and you understand the fee share mechanics before broadcasting your launch.
              </p>
            </div>
          </div>
        </div>
        
        <LaunchWizard />
      </main>
    </div>
  );
}
