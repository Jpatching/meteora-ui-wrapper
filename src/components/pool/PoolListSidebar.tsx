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

              // Calculate 24h fees (volume * fee)
              const fee24h = (pool.volume24h || 0) * ((pool as any).baseFee || 0.002);
              const feePercentage = ((pool as any).baseFee || 0.002) * 100;
              const binStep = (pool as any).binStep || 0;
              const apr = (pool as any).apr || 0;

              return (
                <button
                  key={pool.id}
                  onClick={() => router.push(`/solana/${pool.baseAsset.id}`)}
                  className={`w-full px-4 py-3 hover:bg-background-secondary transition-colors border-l-2 ${
                    isActive
                      ? 'bg-background-secondary border-primary'
                      : 'border-transparent'
                  }`}
                >
                  <div className="w-full">
                    {/* Header: Pair + Meteora Logo + Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-white">
                        {pool.baseAsset.symbol}-{pool.quoteAsset?.symbol || 'SOL'}
                      </span>
                      {/* Meteora Logo */}
                      <img src="/meteora.png" alt="Meteora" className="w-3.5 h-3.5" />
                      {/* Protocol Badge - Orange Circle */}
                      <span className="flex items-center justify-center w-11 h-4 rounded-full border border-orange-500 text-[9px] font-bold text-white uppercase">
                        {pool.type === 'dlmm' ? 'DLMM' : 'DYN2'}
                      </span>
                    </div>

                    {/* Row 1: TVL | 24h Vol | 24h Fee */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">TVL</div>
                        <div className="text-xs font-semibold text-white">{formatNumber(pool.baseAsset.liquidity || 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">24h Vol</div>
                        <div className="text-xs font-semibold text-white">{formatNumber(pool.volume24h || 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">24h Fee</div>
                        <div className="text-xs font-semibold text-white">{formatNumber(fee24h)}</div>
                      </div>
                    </div>

                    {/* Row 2: Fee | BinStep | APR */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Fee</div>
                        <div className="text-xs font-semibold text-white">{feePercentage.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">BinStep</div>
                        <div className="text-xs font-semibold text-white">{binStep}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">APR</div>
                        <div className="text-xs font-semibold text-success">{apr.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
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
