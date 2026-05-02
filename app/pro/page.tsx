import { Header } from '@/components/header';
import { ProDashboard } from '@/components/pro/pro-dashboard';

export default function ProPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <ProDashboard />
      </main>
    </div>
  );
}
