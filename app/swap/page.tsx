import { Header } from '@/components/header';
import { SwapTerminal } from '@/components/swap/swap-terminal';

export default function SwapPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 flex justify-center items-start">
        <SwapTerminal />
      </main>
    </div>
  );
}