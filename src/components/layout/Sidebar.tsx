'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'DLMM',
    items: [
      { name: 'Create Pool', href: '/dlmm/create-pool', icon: '🏊' },
      { name: 'Seed Liquidity (LFG)', href: '/dlmm/seed-lfg', icon: '💧' },
      { name: 'Seed Liquidity (Single)', href: '/dlmm/seed-single', icon: '💦' },
      { name: 'Set Pool Status', href: '/dlmm/set-status', icon: '⚙️' },
    ],
  },
  {
    title: 'DAMM v2',
    items: [
      { name: 'Create Balanced Pool', href: '/damm-v2/create-balanced', icon: '⚖️' },
      { name: 'Create One-Sided Pool', href: '/damm-v2/create-one-sided', icon: '📊' },
      { name: 'Add Liquidity', href: '/damm-v2/add-liquidity', icon: '➕' },
      { name: 'Remove Liquidity', href: '/damm-v2/remove-liquidity', icon: '➖' },
      { name: 'Split Position', href: '/damm-v2/split-position', icon: '✂️' },
      { name: 'Claim Fees', href: '/damm-v2/claim-fees', icon: '💰' },
      { name: 'Close Position', href: '/damm-v2/close-position', icon: '❌' },
    ],
  },
  {
    title: 'DAMM v1',
    items: [
      { name: 'Create Pool', href: '/damm-v1/create-pool', icon: '🏊' },
      { name: 'Lock Liquidity', href: '/damm-v1/lock-liquidity', icon: '🔒' },
      { name: 'Create Stake2Earn', href: '/damm-v1/create-stake2earn', icon: '🌾' },
      { name: 'Lock (Stake2Earn)', href: '/damm-v1/lock-stake2earn', icon: '🔐' },
    ],
  },
  {
    title: 'DBC',
    items: [
      { name: 'Create Config', href: '/dbc/create-config', icon: '📝' },
      { name: 'Create Pool', href: '/dbc/create-pool', icon: '🏊' },
      { name: 'Swap', href: '/dbc/swap', icon: '🔄' },
      { name: 'Claim Fees', href: '/dbc/claim-fees', icon: '💰' },
      { name: 'Migrate to DAMM v1', href: '/dbc/migrate-v1', icon: '⬆️' },
      { name: 'Migrate to DAMM v2', href: '/dbc/migrate-v2', icon: '⬆️' },
      { name: 'Transfer Creator', href: '/dbc/transfer-creator', icon: '👤' },
    ],
  },
  {
    title: 'Alpha Vault',
    items: [{ name: 'Create Vault', href: '/alpha-vault/create', icon: '🏦' }],
  },
  {
    title: 'Analytics & Settings',
    items: [
      { name: 'Analytics Dashboard', href: '/analytics', icon: '📊' },
      { name: 'RPC Configuration', href: '/settings/rpc', icon: '🔧' },
      { name: 'Generate Keypair', href: '/settings/keypair', icon: '🔑' },
      { name: 'Airdrop SOL', href: '/settings/airdrop', icon: '🪂' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-background-secondary/50 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold gradient-text">Meteora Invent</h1>
          <p className="text-xs text-foreground-muted mt-1">Studio UI</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                      }
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          <span>Connected to Solana</span>
        </div>
      </div>
    </aside>
  );
}
