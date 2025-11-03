'use client';

import { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { TransactionHistoryProvider } from '@/contexts/TransactionHistoryContext';
import { ReferralProvider } from '@/contexts/ReferralContext';
import { WalletProvider } from './WalletProvider';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Data is fresh for 30 seconds
      refetchOnWindowFocus: true,
      retry: 2,
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
