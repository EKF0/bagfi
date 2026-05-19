import { Header } from '@/components/header';
import { BagCard } from '@/components/bags/bag-card';
import { SMART_BAGS } from '@/lib/smart-bags/catalog';
import { ShieldCheck } from 'lucide-react';

export default function BagsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="mb-12 max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-4">Smart Bags</h1>
          <p className="text-lg text-white/60 leading-relaxed mb-6">
            Thematic Solana portfolios with explicit allocation targets, bounded slippage, quote snapshots, and wallet-reviewed execution for every deposit.
          </p>
          
          <div className="bg-accentPrimary/5 border border-accentPrimary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 bg-accentPrimary/10 text-accentPrimary rounded-full flex items-center justify-center shrink-0">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Non-Custodial & Transparent</h4>
              <p className="text-sm text-white/50">
                BagFi is 100% non-custodial. We never touch your private keys or hold your funds. Every transaction is simulated and requires your explicit approval in your own Solana wallet before execution.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SMART_BAGS.map(bag => (
            <BagCard key={bag.id} {...bag} />
          ))}
        </div>
      </main>
    </div>
  );
}
