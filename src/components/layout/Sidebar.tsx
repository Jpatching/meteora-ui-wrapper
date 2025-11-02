'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

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
    title: 'Navigation',
    items: [
      { name: 'Dashboard', href: '/', icon: '🏠' },
      { name: 'Analytics', href: '/analytics', icon: '📊' },
    ],
  },
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
    title: 'Settings',
    items: [
      { name: 'RPC Configuration', href: '/settings/rpc', icon: '🔧' },
      { name: 'Generate Keypair', href: '/settings/keypair', icon: '🔑' },
      { name: 'Airdrop SOL', href: '/settings/airdrop', icon: '🪂' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Determine which section should be expanded based on current path
  const getActiveSectionFromPath = (path: string): string => {
    if (path === '/' || path === '/analytics') return 'Navigation';
    if (path.startsWith('/dlmm')) return 'DLMM';
    if (path.startsWith('/damm-v2')) return 'DAMM v2';
    if (path.startsWith('/damm-v1')) return 'DAMM v1';
    if (path.startsWith('/dbc')) return 'DBC';
    if (path.startsWith('/alpha-vault')) return 'Alpha Vault';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Navigation';
  };

  const activeSection = getActiveSectionFromPath(pathname);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([activeSection])
  );

  // Update expanded section when route changes
  useEffect(() => {
    const newActiveSection = getActiveSectionFromPath(pathname);
    setExpandedSections(new Set([newActiveSection]));
  }, [pathname]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  return (
    <aside className="w-64 border-r border-border bg-background-secondary/50 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/metatools-logo.png"
            alt="MetaTools Logo"
            width={48}
            height={48}
            className="flex-shrink-0"
            priority
          />
          <div>
            <h1 className="text-2xl font-bold gradient-text">MetaTools</h1>
            <p className="text-xs text-foreground-muted mt-0.5">Meteora Protocol Suite</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((section) => {
          const isExpanded = expandedSections.has(section.title);

          return (
            <div key={section.title} className="space-y-1">
              {/* Section Header - Clickable to expand/collapse */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-background-tertiary font-ui"
              >
                <span>{section.title}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Section Items - Collapsible */}
              {isExpanded && (
                <div className="space-y-1 pl-2">
                  {section.items.map((item, index) => {
                    const isActive = pathname === item.href;

                    // Unique gradient for each item based on index
                    const gradients = [
                      'from-cyan-500/20 to-blue-500/20',
                      'from-pink-500/20 to-orange-500/20',
                      'from-purple-500/20 to-pink-500/20',
                      'from-blue-500/20 to-cyan-500/20',
                      'from-orange-500/20 to-red-500/20',
                      'from-green-500/20 to-cyan-500/20',
                      'from-yellow-500/20 to-orange-500/20',
                    ];
                    const gradient = gradients[index % gradients.length];

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          group flex items-center gap-3 px-3 py-2 rounded-lg
                          text-sm font-medium transition-all duration-200 font-accent
                          ${
                            isActive
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                          }
                        `}
                      >
                        {/* Animated icon container */}
                        <div className={`
                          relative w-8 h-8 rounded-lg flex items-center justify-center
                          bg-gradient-to-br ${gradient}
                          group-hover:scale-110 transition-transform duration-200
                          ${isActive ? 'animate-pulse' : ''}
                        `}>
                          <span className="text-lg relative z-10">{item.icon}</span>
                          {/* Glow effect on hover */}
                          <div className={`
                            absolute inset-0 rounded-lg bg-gradient-to-br ${gradient}
                            blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          `} />
                        </div>

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
              )}
            </div>
          );
        })}
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
