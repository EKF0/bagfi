'use client';

import dynamic from 'next/dynamic';

const WalletProviders = dynamic(() => import('./providers').then(mod => mod.Providers), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0B132B]" />
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
