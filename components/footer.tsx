'use client';

import Link from 'next/link';
import { Layers, Twitter, Github, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-deepNavy border-t border-white/5 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-accentPrimary rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-deepNavy" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-white">BagFi</span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed">
              Consolidated, thematic portfolios for the Solana and Bags.fm ecosystem. Non-custodial, transparent, and built for builders.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/bags" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Smart Bags</Link></li>
              <li><Link href="/swap" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Swap Terminal</Link></li>
              <li><Link href="/pro" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Pro Analytics</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          {/* Creator & Partner */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Ecosystem</h4>
            <ul className="space-y-4">
              <li><Link href="/creator" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Creator Lab</Link></li>
              <li><Link href="/earnings" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Earnings Center</Link></li>
              <li>
                <a href="https://docs.bags.fm" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-accentPrimary transition-colors flex items-center gap-2">
                  Bags API Docs <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Safety */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/terms" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-white/50 hover:text-accentPrimary transition-colors">Privacy Policy</Link></li>
              <li className="flex items-center gap-2 text-xs text-amber-500/60 font-bold bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                Mainnet-Beta Ready
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-white/20">
            &copy; {currentYear} BagFi. Built for the Bags Ecosystem.
          </div>
          <div className="flex items-center gap-6">
            <a href="https://twitter.com/bagfi" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://github.com/bagfi" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
