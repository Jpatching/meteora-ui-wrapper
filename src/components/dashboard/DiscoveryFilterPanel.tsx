/**
 * Discovery Filter Panel
 * Smart filters, quick actions, and market insights for the Discover page
 */

'use client';

import Link from 'next/link';
import { Pool } from '@/lib/jupiter/types';
import { formatUSD, formatNumber } from '@/lib/format/number';

type ProtocolFilter = 'all' | 'dlmm' | 'damm' | 'dbc' | 'alpha';
type AgeFilter = '24h' | '7d' | '30d' | 'all';
type PerformanceFilter = 'gainers' | 'volume' | 'new' | 'liquidity' | 'none';

export interface DiscoveryFilterPanelProps {
  pools: Pool[];
  protocolFilter: ProtocolFilter;
  ageFilter: AgeFilter;
  performanceFilter: PerformanceFilter;
  onProtocolFilterChange: (filter: ProtocolFilter) => void;
  onAgeFilterChange: (filter: AgeFilter) => void;
  onPerformanceFilterChange: (filter: PerformanceFilter) => void;
}

export function DiscoveryFilterPanel({
  pools,
  protocolFilter,
  ageFilter,
  performanceFilter,
  onProtocolFilterChange,
  onAgeFilterChange,
  onPerformanceFilterChange,
}: DiscoveryFilterPanelProps) {

  // Calculate market stats
  const totalPools = pools.length;
  const total24hVolume = pools.reduce((sum, pool) => sum + (pool.volume24h || 0), 0);
  const totalLiquidity = pools.reduce((sum, pool) => sum + (pool.baseAsset.liquidity || 0), 0);

  // Protocol breakdown
  const dlmmCount = pools.filter(p => p.type === 'dlmm').length;
  const dammCount = pools.filter(p => p.type === 'damm' || p.type === 'damm-v1' || p.type === 'damm-v2').length;
  const dbcCount = pools.filter(p => p.baseAsset.launchpad === 'met-dbc').length;

  return (
    <div className="h-full overflow-y-auto bg-background border-r border-border-light">
      <div className="p-4 space-y-6">

        {/* Quick Create Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">🚀</span>
            Create New Pool
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dlmm/create-pool">
              <button className="w-full px-3 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all">
                DLMM
              </button>
            </Link>
            <Link href="/damm-v2/create-balanced">
              <button className="w-full px-3 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-sm font-medium transition-all">
                DAMM
              </button>
            </Link>
            <Link href="/dbc/create-pool">
              <button className="w-full px-3 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all">
                DBC
              </button>
            </Link>
            <Link href="/alpha-vault/create">
              <button className="w-full px-3 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-sm font-medium transition-all">
                Alpha
              </button>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-light"></div>

        {/* Discovery Filters */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">🔍</span>
            Filter Pools
          </h3>

          {/* Protocol Filter */}
          <div className="mb-4">
            <label className="text-xs text-foreground-muted mb-2 block">Protocol</label>
            <div className="space-y-1.5">
              {(['all', 'dlmm', 'damm', 'dbc', 'alpha'] as ProtocolFilter[]).map((filter) => (
                <label key={filter} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="protocol"
                    checked={protocolFilter === filter}
                    onChange={() => onProtocolFilterChange(filter)}
                    className="w-4 h-4 text-primary border-border-light focus:ring-primary focus:ring-2"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {filter === 'all' ? 'All Protocols' : filter.toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Age Filter */}
          <div className="mb-4">
            <label className="text-xs text-foreground-muted mb-2 block">Pool Age</label>
            <div className="grid grid-cols-2 gap-2">
              {(['24h', '7d', '30d', 'all'] as AgeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => onAgeFilterChange(filter)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    ageFilter === filter
                      ? 'bg-primary text-white'
                      : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary hover:text-foreground'
                  }`}
                >
                  {filter === 'all' ? 'All Time' : filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Performance Filter */}
          <div>
            <label className="text-xs text-foreground-muted mb-2 block">Performance</label>
            <div className="space-y-1.5">
              {([
                { value: 'gainers', label: '📈 Top Gainers', emoji: '📈' },
                { value: 'volume', label: '💰 High Volume', emoji: '💰' },
                { value: 'new', label: '🆕 New Launches', emoji: '🆕' },
                { value: 'liquidity', label: '💧 High Liquidity', emoji: '💧' },
                { value: 'none', label: '○ None', emoji: '' },
              ] as const).map((filter) => (
                <label key={filter.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="performance"
                    checked={performanceFilter === filter.value}
                    onChange={() => onPerformanceFilterChange(filter.value)}
                    className="w-4 h-4 text-primary border-border-light focus:ring-primary focus:ring-2"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {filter.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-light"></div>

        {/* Market Snapshot */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Market Snapshot
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-foreground-muted">Total Pools</span>
              <span className="text-sm font-bold text-foreground font-mono">{totalPools}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-foreground-muted">24h Volume</span>
              <span className="text-sm font-bold text-success font-mono">
                {formatUSD(total24hVolume)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-foreground-muted">Total Liquidity</span>
              <span className="text-sm font-bold text-primary font-mono">
                {formatUSD(totalLiquidity)}
              </span>
            </div>

            {/* Protocol Breakdown */}
            <div className="pt-3 border-t border-border-light">
              <p className="text-xs text-foreground-muted mb-2">By Protocol</p>
              <div className="space-y-2">
                {dlmmCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${(dlmmCount / totalPools) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-foreground w-16 text-right">
                      DLMM {dlmmCount}
                    </span>
                  </div>
                )}
                {dammCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-secondary h-full"
                        style={{ width: `${(dammCount / totalPools) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-foreground w-16 text-right">
                      DAMM {dammCount}
                    </span>
                  </div>
                )}
                {dbcCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${(dbcCount / totalPools) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-foreground w-16 text-right">
                      DBC {dbcCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-light"></div>

        {/* Getting Started */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span>
            New to MetaTools?
          </h3>
          <div className="space-y-2">
            <Link href="/getting-started">
              <button className="w-full text-left px-3 py-2 rounded-lg bg-background-secondary hover:bg-background-tertiary text-sm text-foreground transition-colors flex items-center gap-2">
                <span>→</span>
                <span>Getting Started Guide</span>
              </button>
            </Link>
            <a
              href="https://docs.meteora.ag"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left px-3 py-2 rounded-lg bg-background-secondary hover:bg-background-tertiary text-sm text-foreground transition-colors flex items-center gap-2"
            >
              <span>→</span>
              <span>Documentation</span>
            </a>
            <Link href="/analytics/pools">
              <button className="w-full text-left px-3 py-2 rounded-lg bg-background-secondary hover:bg-background-tertiary text-sm text-foreground transition-colors flex items-center gap-2">
                <span>→</span>
                <span>View Analytics</span>
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
