'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pool } from '@/lib/jupiter/types';
import { useRelatedPools } from '@/lib/hooks/useRelatedPools';
import { TokenIcon } from '@/components/ui/TokenIcon';

interface PoolListSidebarProps {
  currentPool: Pool;
  network: 'devnet' | 'mainnet-beta';
}

type FilterType = 'all' | 'dlmm' | 'dyn2' | 'pump';

export function PoolListSidebar({ currentPool, network }: PoolListSidebarProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [displayCount, setDisplayCount] = useState(5); // Track how many to show
  const { pools, loading } = useRelatedPools({ currentPool, network, limit: 100 });

  // Filter pools by protocol
  const filteredPools = pools.filter((pool) => {
    if (filter === 'all') return true;
    if (filter === 'dlmm') return pool.type === 'dlmm';
    if (filter === 'dyn2') return pool.type === 'damm-v2';
    if (filter === 'pump') return pool.type === 'pump'; // Placeholder
    return true;
  });

  // Show pools up to displayCount (pagination style)
  const displayPools = filteredPools.slice(0, displayCount);
  const hasMore = filteredPools.length > displayCount;

  // Reset displayCount when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setDisplayCount(5); // Reset to initial count
  };

  // Load 5 more pools
  const loadMore = () => {
    setDisplayCount(prev => prev + 5);
  };

  const formatNumber = (num: number | undefined) => {
    if (!num || isNaN(num)) return '$0';
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return '$0';
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-800/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light">
        <h3 className="text-sm font-semibold text-white">Pools</h3>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-border-light">
        <div className="flex gap-2">
          {[
            { key: 'all' as FilterType, label: 'All' },
            { key: 'dlmm' as FilterType, label: 'DLMM' },
            { key: 'dyn2' as FilterType, label: 'DYN2' },
            { key: 'pump' as FilterType, label: 'PUMP' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pool List - Fixed height scrollable container (charting.ag style) */}
      <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-500">No related pools found</p>
          </div>
        ) : (
          <div>
            {displayPools.map((pool) => {
              const isActive = pool.id === currentPool.id;

              return (
                <button
                  key={pool.id}
                  onClick={() => router.push(`/pool/${pool.id}`)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-background-secondary transition-colors border-l-2 ${
                    isActive
                      ? 'bg-background-secondary border-primary'
                      : 'border-transparent'
                  }`}
                >
                  {/* Token Icons */}
                  <div className="flex items-center -space-x-1 flex-shrink-0">
                    <TokenIcon
                      src={pool.baseAsset.icon}
                      symbol={pool.baseAsset.symbol}
                      size="sm"
                    />
                    {pool.quoteAsset && (
                      <TokenIcon
                        src={pool.quoteAsset.icon}
                        symbol={pool.quoteAsset.symbol}
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Pool Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate">
                        {pool.baseAsset.symbol}-{pool.quoteAsset?.symbol || 'USDC'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          pool.type === 'dlmm'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {pool.type === 'dlmm' ? 'DLMM' : 'DYN2'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>TVL: {formatNumber(pool.baseAsset.liquidity || 0)}</span>
                      <span>24h Vol: {formatNumber(pool.volume24h || 0)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  {!isActive && (
                    <svg
                      className="w-4 h-4 text-gray-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Load More Button (Pagination style) */}
            {hasMore && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadMore();
                }}
                className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-background-secondary transition-colors border-t border-border-light"
              >
                Load More ({filteredPools.length - displayCount} remaining) →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
