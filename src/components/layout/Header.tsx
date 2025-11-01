'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNetwork, NetworkType } from '@/contexts/NetworkContext';
import { Select, Logo } from '@/components/ui';

interface HeaderProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function Header({ searchTerm = '', onSearchChange }: HeaderProps) {
  const { publicKey } = useWallet();
  const { network, setNetwork } = useNetwork();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-background-secondary/50 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-3">
        <Logo size="md" href="/" />
        <div className="h-6 w-px bg-border"></div>
        <h2 className="text-lg font-bold gradient-text">Dashboard</h2>
      </div>

      {/* Center - Search Bar */}
      {onSearchChange && (
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search tokens and pools..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Right side - network selector and wallet */}
      <div className="flex items-center gap-4">
        {mounted ? (
          <>
            {/* Network Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">Network:</span>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as NetworkType)}
                className="
                  px-3 py-1.5
                  bg-background-tertiary
                  border border-border
                  rounded-lg
                  text-sm text-foreground
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/50
                  cursor-pointer
                "
              >
                <option value="devnet">Devnet</option>
                <option value="mainnet-beta">Mainnet Beta</option>
              </select>
            </div>

            {/* Network Status Indicator - Green when connected */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary rounded-lg border border-border">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              </div>
              <span className="text-sm text-foreground-secondary capitalize">
                {network === 'mainnet-beta' ? 'Mainnet' : network}
              </span>
            </div>

            {/* Wallet Button */}
            <WalletMultiButton
              style={{
                background: publicKey
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                height: '40px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            />
          </>
        ) : (
          <>
            {/* Placeholder during SSR to match initial render */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">Network:</span>
              <div className="px-3 py-1.5 bg-background-tertiary border border-border rounded-lg text-sm text-foreground w-32">
                Loading...
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary rounded-lg border border-border w-24">
              <div className="w-2 h-2 rounded-full bg-info"></div>
              <span className="text-sm text-foreground-secondary">...</span>
            </div>
            <div
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                height: '40px',
                minWidth: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Select Wallet
            </div>
          </>
        )}
      </div>
    </header>
  );
}
