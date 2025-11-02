'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNetwork, NetworkType } from '@/contexts/NetworkContext';
import { Select, Logo } from '@/components/ui';

export function Header() {
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
        <Logo size="md" />
        <div className="h-6 w-px bg-border"></div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      </div>

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
                <option value="localnet">Localnet</option>
                <option value="mainnet-beta">Mainnet Beta</option>
              </select>
            </div>

            {/* Network Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary rounded-lg border border-border">
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${
                    network === 'mainnet-beta'
                      ? 'bg-error'
                      : network === 'devnet'
                      ? 'bg-warning'
                      : 'bg-info'
                  } animate-pulse`}
                ></div>
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
