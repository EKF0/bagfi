import { Header } from '@/components/header';
import { BagCard } from '@/components/bags/bag-card';
import { SMART_BAGS } from '@/lib/smart-bags/catalog';

export default function BagsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="mb-12 max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-4">Smart Bags</h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Thematic Solana portfolios with explicit allocation targets, bounded slippage, quote snapshots, and wallet-reviewed execution for every deposit.
          </p>
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
