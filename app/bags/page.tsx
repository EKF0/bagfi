import { Header } from '@/components/header';
import { BagCard } from '@/components/bags/bag-card';

const SMART_BAGS = [
  {
    id: "l2-bluechip",
    title: "L2 Bluechip Bag",
    description: "A balanced portfolio of the top Layer 2 scaling solutions. Optimized for high yield through localized Aave and Curve markets on Arbitrum and Optimism.",
    apy: "12.4%",
    tvl: "$4.2M",
    risk: "Low" as const,
    assets: [
      { symbol: "ARB", icon: "A", allocation: "35%" },
      { symbol: "OP", icon: "O", allocation: "35%" },
      { symbol: "MATIC", icon: "M", allocation: "30%" }
    ]
  },
  {
    id: "ai-narrative",
    title: "AI Narrative Bag",
    description: "High-growth exposure to the intersection of decentralized AI and compute. Aggregates yield from staking native AI protocol tokens.",
    apy: "24.8%",
    tvl: "$1.8M",
    risk: "High" as const,
    assets: [
      { symbol: "FET", icon: "F", allocation: "40%" },
      { symbol: "RNDR", icon: "R", allocation: "35%" },
      { symbol: "OCEAN", icon: "O", allocation: "25%" }
    ]
  },
  {
    id: "stable-yield",
    title: "Stable Maximizer",
    description: "Delta-neutral strategy auto-compounding stablecoin yields across Aave, Compound, and Curve. Ideal for preserving capital.",
    apy: "8.2%",
    tvl: "$12.5M",
    risk: "Low" as const,
    assets: [
      { symbol: "USDC", icon: "U", allocation: "50%" },
      { symbol: "USDT", icon: "T", allocation: "25%" },
      { symbol: "DAI", icon: "D", allocation: "25%" }
    ]
  }
];

export default function BagsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="mb-12 max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-4">Smart Bags</h1>
          <p className="text-lg text-white/60 leading-relaxed">
            1-click thematic portfolios powered by ERC-4626. Deposit any token and let our Zapper auto-convert and deploy your assets into battle-tested yield strategies.
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
