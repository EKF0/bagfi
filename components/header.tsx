'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Layers } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-surfaceCardBorder bg-deepNavy/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accentPrimary/20 text-accentPrimary">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">BagFi</span>
        </Link>
        <nav className="ml-8 hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-white transition-colors hover:text-accentPrimary">
            Dashboard
          </Link>
          <Link href="/bags" className="text-sm font-medium text-white/70 transition-colors hover:text-accentPrimary">
            Smart Bags
          </Link>
          <Link href="/pro" className="text-sm font-medium text-white/70 transition-colors hover:text-accentPrimary">
            Pro Analytics
          </Link>
          <Link href="/earnings" className="text-sm font-medium text-white/70 transition-colors hover:text-accentPrimary">
            Earnings
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium text-white/70 transition-colors hover:text-accentPrimary">
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <WalletMultiButton className="!bg-accentPrimary !text-deepNavy hover:!bg-accentSecondary font-bold py-2 px-4 rounded-xl transition-all" />
        </div>
      </div>
    </header>
  );
}
