import { Header } from '@/components/header';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>
              BagFi is designed to be privacy-preserving. We do not require account registration or collect personal identification information (PII) such as names, emails, or physical addresses.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Wallet Addresses</strong>: We use your public wallet address to retrieve on-chain data and provide portfolio analytics.</li>
              <li><strong>On-Chain Data</strong>: We process publicly available blockchain data related to your wallet.</li>
              <li><strong>Usage Analytics</strong>: We may collect anonymized technical data (e.g., browser type, simulation success rates) to improve Platform performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Information</h2>
            <p>
              We use the collected information strictly to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Display your portfolio balances and historical performance.</li>
              <li>Coordinate Smart Bag deposit sessions.</li>
              <li>Monitor API health and rate limits.</li>
              <li>Debug technical failures in the transaction flow.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Sharing</h2>
            <p>
              We do not sell your data. We interact with third-party providers (Solana RPCs, Bags.fm API, Supabase) to execute Platform features. These providers only receive the technical data necessary to fulfill your requests (e.g., your public key for a balance check).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookies and Local Storage</h2>
            <p>
              We use browser Local Storage to temporarily save your Smart Bag deposit session progress. This data remains on your device and is not used for tracking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Links</h2>
            <p>
              Our Platform contains links to external sites (e.g., Solscan, Bags.fm, Twitter). We are not responsible for the privacy practices of these external services.
            </p>
          </section>

          <section className="pt-8 border-t border-white/10 text-sm">
            <p>Last updated: May 19, 2026</p>
          </section>
        </div>
      </main>
    </div>
  );
}
