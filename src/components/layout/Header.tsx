'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNetwork, NetworkType } from '@/contexts/NetworkContext';
import { Select, Logo } from '@/components/ui';
import { SearchDropdown } from '@/components/dashboard/SearchDropdown';

interface HeaderProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchResults?: {
    tokens: any[];
    pools: any[];
  };
  isSearching?: boolean;
  onTokenClick?: (token: any) => void;
  onPoolClick?: (pool: any) => void;
}

export function Header({
  searchTerm = '',
  onSearchChange,
  searchResults = { tokens: [], pools: [] },
  isSearching = false,
  onTokenClick,
  onPoolClick
}: HeaderProps) {
  const { publicKey } = useWallet();
  const { network, setNetwork } = useNetwork();
  const [mounted, setMounted] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show dropdown when search term exists and has results
  useEffect(() => {
    setShowSearchDropdown(searchTerm.length >= 2);
  }, [searchTerm, searchResults]);

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
        <div className="flex-1 max-w-md mx-8 relative">
          <div className="relative" ref={searchContainerRef}>
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
              className="w-full pl-10 pr-10 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Dropdown - uses portal to render at body level */}
          <SearchDropdown
            isOpen={showSearchDropdown}
            searchTerm={searchTerm}
            tokens={searchResults.tokens}
            pools={searchResults.pools}
            isLoading={isSearching}
            onClose={() => setShowSearchDropdown(false)}
            onTokenClick={(token) => {
              onTokenClick?.(token);
              setShowSearchDropdown(false);
            }}
            onPoolClick={(pool) => {
              onPoolClick?.(pool);
              setShowSearchDropdown(false);
            }}
            searchInputRef={searchContainerRef}
          />
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
              className="!bg-background-secondary !border !border-border-light !text-foreground hover:!border-foreground-muted !transition-colors"
              style={{
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
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-background-secondary border border-border-light text-foreground h-[40px] min-w-[140px] flex items-center justify-center">
              Select Wallet
            </div>
          </>
        )}
      </div>
    </header>
  );
}
