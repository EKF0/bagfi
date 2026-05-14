'use client';

import * as React from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { validateEnvironment } from '@/lib/env';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Validate environment variables on client startup
if (typeof window !== 'undefined') {
  validateEnvironment();
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Get network from env
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork;
  
  // Use configured RPC or fallback to cluster API
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
  
  // Supported wallets - import individually to avoid bundling all adapters
  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
