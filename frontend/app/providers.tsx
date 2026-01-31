'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThirdwebProvider } from "thirdweb/react";
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <ThirdwebProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThirdwebProvider>
    </WagmiProvider>
  );
}

