/**
 * Discover Page - Charting.ag-style Two-Panel Pool Explorer
 * Left Panel: Tokens | Right Panel: Pairs
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { TokenListPanel } from '@/components/discover/TokenListPanel';
import { PairListPanel } from '@/components/discover/PairListPanel';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { useDLMMPools } from '@/lib/hooks/useDLMMPools';
import { useDAMMPools } from '@/lib/hooks/useDAMMPools';
import { useDBCPools } from '@/lib/hooks/useDBCPools';
import { transformMeteoraPoolToPool } from '@/lib/services/meteoraApi';
import { transformDAMMPoolToPool } from '@/lib/services/dammApi';
import { transformDBCPoolToPool } from '@/lib/services/dbcApi';
import { enrichPoolsWithMetadata } from '@/lib/services/tokenMetadata';
import { Pool } from '@/lib/jupiter/types';

type TimeFrame = '1h' | '4h' | '12h' | '24h';
type SortBy = 'volume' | 'liquidity' | 'apr' | 'recent';
type PoolTypeFilter = 'all' | 'dlmm' | 'damm' | 'dbc';

export default function DiscoverPage() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
  const [sortBy, setSortBy] = useState<SortBy>('volume');
  const [poolType, setPoolType] = useState<PoolTypeFilter>('all');
  const [enrichedPools, setEnrichedPools] = useState<Pool[]>([]);

  // Fetch DBC pools directly using SDK - DISABLED by default (on-chain is very slow)
  // TODO: Enable when user specifically filters for DBC pools
  const { data: dbcData, isLoading: dbcLoading, error: dbcError } = useDBCPools({
    refetchInterval: false, // Disabled - manual refresh only
    enabled: poolType === 'dbc', // Only fetch when user filters for DBC
  });

  // Fetch DLMM pools from Meteora API - DISABLED auto-refresh
  const { data: dlmmData, isLoading: dlmmLoading, error: dlmmError } = useDLMMPools({
    refetchInterval: false, // Disabled - manual refresh only
    sortBy: sortBy === 'apr' ? 'apr' : sortBy === 'liquidity' ? 'liquidity' : 'volume',
  });

  // Fetch DAMM pools (v1 + v2) from Meteora API - DISABLED auto-refresh
  const { data: dammData, isLoading: dammLoading, error: dammError } = useDAMMPools({
    refetchInterval: false, // Disabled - manual refresh only
    version: 'all', // Fetch both v1 and v2
  });

  // Transform DBC pools from SDK
  const dbcPools = (dbcData || []).map(transformDBCPoolToPool);

  // Transform DLMM pools - apply smart filtering
  const dlmmPools = (dlmmData || [])
    .filter(pool => !pool.hide) // Only filter out explicitly hidden pools
    .filter(pool => pool.trade_volume_24h > 100 || pool.liquidity && parseFloat(pool.liquidity) > 1000) // Min thresholds
    .map(transformMeteoraPoolToPool);

  // Transform DAMM pools
  const dammPools = (dammData || [])
    .map(transformDAMMPoolToPool);

  // Combine all Meteora ecosystem pools (DBC + DLMM + DAMM)
  let ecosystemPools = [...dbcPools, ...dlmmPools, ...dammPools];

  // Apply pool type filter
  if (poolType !== 'all') {
    ecosystemPools = ecosystemPools.filter(pool => pool.type === poolType);
  }

  // Remove duplicates by pool ID
  const uniquePools = Array.from(
    new Map(ecosystemPools.map(pool => [pool.id, pool])).values()
  );

  // Sort based on selected criteria
  const sortedPools = uniquePools.sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return (b.volume24h || 0) - (a.volume24h || 0);
      case 'liquidity':
        return parseFloat(b.baseAsset.liquidity?.toString() || '0') - parseFloat(a.baseAsset.liquidity?.toString() || '0');
      case 'apr':
        return ((b as any).apr || 0) - ((a as any).apr || 0);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Independent loading states - show loading if any source is still loading and has no data
  const isLoading = (dbcLoading && !dbcData) || (dlmmLoading && !dlmmData) || (dammLoading && !dammData);
  const hasError = dbcError && dlmmError && dammError; // Only error if all fail

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto px-4 lg:px-8 pt-6 pb-6">
        {/* Header with Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Discover Pools</h1>
              <p className="text-sm text-gray-400 mt-1">
                {sortedPools.length} pools • Updated live
              </p>
            </div>

            {/* Refresh indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Loading...
              </div>
            )}
          </div>

          {/* Filter Controls - Charting.ag style */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Time Frame Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">TIME:</span>
              <div className="flex gap-1">
                {(['1h', '4h', '12h', '24h'] as TimeFrame[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeFrame(tf)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      timeFrame === tf
                        ? 'bg-primary text-white'
                        : 'bg-background-secondary text-gray-400 hover:bg-background-tertiary'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Pool Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">TYPE:</span>
              <div className="flex gap-1">
                {(['all', 'dlmm', 'damm', 'dbc'] as PoolTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPoolType(type)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      poolType === type
                        ? 'bg-primary text-white'
                        : 'bg-background-secondary text-gray-400 hover:bg-background-tertiary'
                    }`}
                  >
                    {type === 'all' ? 'ALL' : type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">SORT:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-background-secondary text-white border border-border-light hover:bg-background-tertiary transition-colors cursor-pointer"
              >
                <option value="volume">Volume</option>
                <option value="liquidity">Liquidity</option>
                <option value="apr">APR</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State - Only show if all APIs fail */}
        {hasError && (
          <div className="text-center py-12">
            <p className="text-error font-medium mb-2">Failed to load pools</p>
            <p className="text-sm text-foreground-muted">
              {dbcError?.message || dlmmError?.message || dammError?.message}
            </p>
          </div>
        )}

        {/* Two-Panel Layout: Tokens | Pairs */}
        {!hasError && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)] min-h-[600px]">
            {/* Left: Tokens */}
            <TokenListPanel
              pools={sortedPools}
              isLoading={isLoading}
            />

            {/* Right: Pairs */}
            <PairListPanel
              pools={sortedPools}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
