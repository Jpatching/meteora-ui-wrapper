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
import { transformMeteoraPoolToPool } from '@/lib/services/meteoraApi';
import { Pool } from '@/lib/jupiter/types';

export default function DiscoverPage() {
  // Fetch DBC pools from Jupiter Gems API - DISABLED auto-refresh to prevent rapid reloading
  const { data: jupiterData, isLoading: jupiterLoading, error: jupiterError } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: false, // Disabled - manual refresh only
  });

  // Fetch DLMM pools from Meteora API - DISABLED auto-refresh
  const { data: dlmmData, isLoading: dlmmLoading, error: dlmmError } = useDLMMPools({
    refetchInterval: false, // Disabled - manual refresh only
    sortBy: 'volume',
  });

  // Combine DBC pools from Jupiter
  const dbcPools = [
    ...(jupiterData?.recent?.pools || []),
    ...(jupiterData?.aboutToGraduate?.pools || []),
    ...(jupiterData?.graduated?.pools || []),
  ].filter((pool) => pool.baseAsset.launchpad === 'met-dbc');

  // Transform DLMM pools - show ALL pools (don't filter out low volume)
  const dlmmPools = (dlmmData || [])
    .filter(pool => !pool.hide) // Only filter out explicitly hidden pools
    .map(transformMeteoraPoolToPool)
    .slice(0, 200); // Show top 200 pools

  // Combine all Meteora ecosystem pools (DBC + DLMM)
  const ecosystemPools = [...dbcPools, ...dlmmPools];

  // Remove duplicates by pool ID
  const uniquePools = Array.from(
    new Map(ecosystemPools.map(pool => [pool.id, pool])).values()
  );

  // Sort by volume
  const sortedPools = uniquePools.sort((a, b) =>
    (b.volume24h || 0) - (a.volume24h || 0)
  );

  // Independent loading states - don't block on Jupiter API
  const isLoading = dlmmLoading && !dlmmData; // Only block if no DLMM data yet
  const hasError = dlmmError && jupiterError; // Only error if both fail

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto h-[calc(100vh-140px)]">
        {/* Error State - Only show if both APIs fail */}
        {hasError && (
          <div className="text-center py-12">
            <p className="text-error font-medium mb-2">Failed to load pools</p>
            <p className="text-sm text-foreground-muted">
              {dlmmError?.message || jupiterError?.message}
            </p>
          </div>
        )}

        {/* Two-Panel Layout: Tokens | Pairs */}
        {!hasError && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
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
