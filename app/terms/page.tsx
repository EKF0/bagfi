import { Header } from '@/components/header';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-deepNavy">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using BagFi (the &quot;Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Non-Custodial Nature</h2>
            <p>
              BagFi is a non-custodial interface for the Solana blockchain and the Bags.fm ecosystem. We do not hold, manage, or have access to your private keys or funds. All transactions are authorized by you through your independent wallet provider and executed directly on-chain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Risk Disclosure</h2>
            <p>
              Digital assets and decentralized finance (DeFi) involve significant risks:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Volatility: Token prices can fluctuate wildly and rapidly.</li>
              <li>Smart Contract Risk: Underlying protocols (Bags, Jupiter, etc.) may have undiscovered vulnerabilities.</li>
              <li>Permanent Loss: You may lose 100% of the funds you interact with via the Platform.</li>
              <li>Network Latency: Solana network congestion may delay or fail transactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. No Financial Advice</h2>
            <p>
              The content and tools provided on BagFi, including &quot;Smart Bags&quot; and &quot;Pro Analytics,&quot; are for informational purposes only. They do not constitute financial, investment, or legal advice. You are solely responsible for your own investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Modification of Platform</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the Platform or any part of its features at any time without notice. We are not liable for any loss resulting from such actions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BAGFI AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
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
