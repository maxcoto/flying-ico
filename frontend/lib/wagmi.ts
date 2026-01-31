import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Sepolia testnet configuration
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://eth-sepolia.g.alchemy.com/v2/xIr38p6GdYSjklWQISOO45i19CREhjna';

// Get project ID from environment or use a default
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

