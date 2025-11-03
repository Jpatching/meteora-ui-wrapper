'use client';

import { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { TransactionHistoryProvider } from '@/contexts/TransactionHistoryContext';
import { ReferralProvider } from '@/contexts/ReferralContext';
import { WalletProvider } from './WalletProvider';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (reduced API hammering)
      gcTime: 10 * 60 * 1000,    // Garbage collect after 10 min
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnMount: false,       // Don't refetch if data exists
      retry: 1,                    // Retry once (not twice)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function ReferralWrapper({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  return (
    <ReferralProvider walletAddress={publicKey?.toBase58()}>
      {children}
    </ReferralProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <WalletProvider>
          <ReferralWrapper>
            <TransactionHistoryProvider>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: '#1a1a27',
                    color: '#f5f5f7',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#1a1a27',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#1a1a27',
                    },
                  },
                }}
              />
            </TransactionHistoryProvider>
          </ReferralWrapper>
        </WalletProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
