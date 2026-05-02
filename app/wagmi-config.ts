import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
} from 'wagmi/chains';

export const wagmiAdapter = getDefaultConfig({
  appName: 'BagFi',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bagfi-project-id-placeholder',
  chains: [mainnet, arbitrum, optimism, base],
  ssr: true, 
});
