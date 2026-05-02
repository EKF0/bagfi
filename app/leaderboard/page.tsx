import { Header } from '@/components/header';
import { Leaderboard } from '@/components/leaderboard/leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <Leaderboard />
      </main>
    </div>
  );
}
