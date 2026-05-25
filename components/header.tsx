'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Layers, Menu, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/bags', label: 'Smart Bags' },
  { href: '/pro', label: 'Pro Analytics' },
  { href: '/earnings', label: 'Earnings' },
  { href: '/creator', label: 'Creator Lab' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile menu on route change during render
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surfaceCardBorder bg-deepNavy/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 z-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accentPrimary/20 text-accentPrimary">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">BagFi</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="ml-8 hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-accentPrimary ${
                    isActive ? 'text-accentPrimary' : 'text-white/70'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Desktop Connect Wallet */}
          <div className="hidden md:block">
            <WalletMultiButton className="!bg-accentPrimary !text-deepNavy hover:!bg-accentSecondary font-bold py-2 px-4 rounded-xl transition-all" />
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden z-50 h-10 w-10 items-center justify-center rounded-xl border border-surfaceCardBorder bg-deepNavy/40 text-white transition-all hover:bg-deepNavy/80 hover:text-accentPrimary focus:outline-none"
            aria-label="Toggle Menu"
          >
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile responsive navigation overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-16 bottom-0 z-40 w-full max-w-[300px] border-l border-surfaceCardBorder bg-deepNavy/95 backdrop-blur-xl md:hidden flex flex-col justify-between p-6 shadow-2xl"
            >
              {/* Navigation Links */}
              <div className="flex flex-col space-y-4 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40 px-2 mb-2">Navigation</p>
                <nav className="flex flex-col space-y-2">
                  {NAV_LINKS.map((link, idx) => {
                    const isActive = pathname === link.href;
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-center justify-between p-3 rounded-xl transition-all border ${
                            isActive
                              ? 'bg-accentPrimary/10 border-accentPrimary/35 text-accentPrimary font-semibold shadow-inner shadow-accentPrimary/5'
                              : 'border-transparent text-white/80 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="text-sm font-medium">{link.label}</span>
                          <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isActive ? 'text-accentPrimary' : 'text-white/30'}`} />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
              </div>

              {/* Wallet Standard Section at Bottom */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.05 + 0.1 }}
                className="flex flex-col space-y-4 border-t border-surfaceCardBorder/60 pt-6 mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40 px-2">Account</p>
                <div className="w-full flex justify-center">
                  <WalletMultiButton className="!bg-accentPrimary !text-deepNavy hover:!bg-accentSecondary font-bold py-3 px-6 rounded-xl transition-all !w-full !flex !justify-center" />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
