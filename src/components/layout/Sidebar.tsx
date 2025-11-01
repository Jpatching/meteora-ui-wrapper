'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  icon: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Navigation',
    icon: '/navigation-icon.svg',
    items: [
      { name: 'Getting Started', href: '/getting-started' },
      { name: 'Recent Pools', href: '/' },
    ],
  },
  {
    title: 'Analytics',
    icon: '/analytics-icon.svg',
    items: [
      { name: 'Public Pools', href: '/analytics/pools' },
      { name: 'Positions', href: '/analytics/positions' },
      { name: 'Referrals', href: '/analytics/referrals' },
    ],
  },
  {
    title: 'DLMM',
    icon: '/dlmm-icon.svg',
    items: [
      { name: 'Create Pool', href: '/dlmm/create-pool' },
      { name: 'Seed Liquidity (LFG)', href: '/dlmm/seed-lfg' },
      { name: 'Seed Liquidity (Single)', href: '/dlmm/seed-single' },
      { name: 'Set Pool Status', href: '/dlmm/set-status' },
    ],
  },
  {
    title: 'DAMM v2',
    icon: '/damm-v2-icon.svg',
    items: [
      { name: 'Create Balanced Pool', href: '/damm-v2/create-balanced' },
      { name: 'Create One-Sided Pool', href: '/damm-v2/create-one-sided' },
      { name: 'Add Liquidity', href: '/damm-v2/add-liquidity' },
      { name: 'Remove Liquidity', href: '/damm-v2/remove-liquidity' },
      { name: 'Split Position', href: '/damm-v2/split-position' },
      { name: 'Claim Fees', href: '/damm-v2/claim-fees' },
      { name: 'Close Position', href: '/damm-v2/close-position' },
    ],
  },
  {
    title: 'DAMM v1',
    icon: '/damm-v1-icon.svg',
    items: [
      { name: 'Create Pool', href: '/damm-v1/create-pool' },
      { name: 'Lock Liquidity', href: '/damm-v1/lock-liquidity' },
      { name: 'Create Stake2Earn', href: '/damm-v1/create-stake2earn' },
      { name: 'Lock (Stake2Earn)', href: '/damm-v1/lock-stake2earn' },
    ],
  },
  {
    title: 'DBC',
    icon: '/dbc-icon.svg',
    items: [
      { name: 'Create Config', href: '/dbc/create-config' },
      { name: 'Create Pool', href: '/dbc/create-pool' },
      { name: 'Swap', href: '/dbc/swap' },
      { name: 'Claim Fees', href: '/dbc/claim-fees' },
      { name: 'Migrate to DAMM v1', href: '/dbc/migrate-v1' },
      { name: 'Migrate to DAMM v2', href: '/dbc/migrate-v2' },
      { name: 'Transfer Creator', href: '/dbc/transfer-creator' },
    ],
  },
  {
    title: 'Alpha Vault',
    icon: '/alpha-vault-icon.svg',
    items: [{ name: 'Create Vault', href: '/alpha-vault/create' }],
  },
  {
    title: 'Settings',
    icon: '/settings-icon.svg',
    items: [
      { name: 'Transaction History', href: '/settings/transactions' },
      { name: 'RPC Configuration', href: '/settings/rpc' },
      { name: 'Generate Keypair', href: '/settings/keypair' },
      { name: 'Airdrop SOL', href: '/settings/airdrop' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Sidebar collapse state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Determine which section should be expanded based on current path
  const getActiveSectionFromPath = (path: string): string => {
    if (path === '/' || path === '/getting-started') return 'Navigation';
    if (path.startsWith('/analytics')) return 'Analytics';
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

  // Toggle sidebar collapse
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('sidebar_collapsed', String(newValue));
      return newValue;
    });
  };

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
    <aside className={`relative border-r border-border bg-background-secondary/50 backdrop-blur-xl flex flex-col transition-all duration-200 ${isCollapsed ? 'w-20' : 'w-32'}`}>
      {/* Logo Section */}
      <div className="p-2 border-b border-border flex items-center justify-center">
        <Image
          src="/logo.svg"
          alt="MetaTools Logo"
          width={isCollapsed ? 40 : 36}
          height={isCollapsed ? 40 : 36}
          className="transition-all duration-200"
        />
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-background-secondary border border-border flex items-center justify-center hover:bg-primary/10 transition-colors z-10"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 flex flex-col">
        {navigation.map((section) => {
          const isExpanded = expandedSections.has(section.title);

          return (
            <div key={section.title} className="space-y-0.5">
              {/* Section Header - Clickable to expand/collapse */}
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex ${isCollapsed ? 'justify-center items-center' : 'flex-col items-center'} px-2 py-1.5 text-xs font-semibold text-foreground-muted uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-background-tertiary font-ui group`}
                title={isCollapsed ? section.title : undefined}
              >
                {!isCollapsed ? (
                  <>
                    <Image
                      src={section.icon}
                      alt={section.title}
                      width={16}
                      height={16}
                      className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <span className="text-[9px] mt-0.5">{section.title}</span>
                    <svg
                      className={`w-2.5 h-2.5 transition-transform duration-200 mt-0.5 ${
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
                  </>
                ) : (
                  <Image
                    src={section.icon}
                    alt={section.title}
                    width={16}
                    height={16}
                    className="flex-shrink-0 opacity-70"
                  />
                )}
              </button>

              {/* Section Items - Collapsible */}
              {isExpanded && !isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item, index) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          group flex flex-col items-center px-1.5 py-1 rounded-md
                          text-[10px] font-medium transition-all duration-200 font-accent text-center leading-tight
                          ${
                            isActive
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                          }
                        `}
                        title={item.name}
                      >
                        <span className="truncate w-full">{item.name}</span>
                        {item.badge && (
                          <span className="mt-0.5 px-1 py-0.5 text-[8px] font-semibold rounded-full bg-primary/20 text-primary">
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
      <div className="p-2 border-t border-border">
        <div className={`flex ${isCollapsed ? 'justify-center' : 'flex-col items-center gap-0.5'} text-xs text-foreground-muted`}>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
          {!isCollapsed && <span className="text-[9px] text-center">Connected</span>}
        </div>
      </div>
    </aside>
  );
}
