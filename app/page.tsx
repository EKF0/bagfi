import { Header } from '@/components/header';
import { NetWorth } from '@/components/dashboard/net-worth';
import { AssetAllocation } from '@/components/dashboard/asset-allocation';
import { HoldingsTable } from '@/components/dashboard/holdings-table';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <NetWorth />
          </div>
          <div className="md:col-span-1">
            <AssetAllocation />
          </div>
        </div>
        <div>
          <HoldingsTable />
        </div>
      </main>
    </div>
  );
}
