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
  const [showAll, setShowAll] = useState(false);
  const { pools, loading } = useRelatedPools({ currentPool, network, limit: 100 });

  // Filter pools by protocol
  const filteredPools = pools.filter((pool) => {
    if (filter === 'all') return true;
    if (filter === 'dlmm') return pool.type === 'dlmm';
    if (filter === 'dyn2') return pool.type === 'damm-v2';
    if (filter === 'pump') return pool.type === 'pump'; // Placeholder
    return true;
  });

  // Limit to 5 pools by default, show all on expand
  const displayPools = showAll ? filteredPools : filteredPools.slice(0, 5);
  const hasMore = filteredPools.length > 5;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
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
              onClick={() => setFilter(tab.key)}
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
                      <span>Vol: {formatNumber(pool.volume24h || 0)}</span>
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

            {/* View More / View Less Button (Charting.ag style) */}
            {hasMore && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
                className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-background-secondary transition-colors border-t border-border-light"
              >
                {showAll ? '← View Less' : `View All ${filteredPools.length} Pools →`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
