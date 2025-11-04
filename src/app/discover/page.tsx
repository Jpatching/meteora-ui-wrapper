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
  // Fetch DBC pools from Jupiter Gems API with 90s polling
  const { data: jupiterData, isLoading: jupiterLoading, error: jupiterError } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: 90000, // 90 seconds
  });

  // Fetch DLMM pools from Meteora API with 60s polling
  const { data: dlmmData, isLoading: dlmmLoading, error: dlmmError } = useDLMMPools({
    refetchInterval: 60000, // 60 seconds
    sortBy: 'volume',
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 Discover Data Status:', {
      jupiterLoading,
      jupiterError: jupiterError?.message,
      jupiterPools: jupiterData ? Object.keys(jupiterData).length : 0,
      dlmmLoading,
      dlmmError: dlmmError?.message,
      dlmmPools: dlmmData?.length || 0,
    });
  }, [jupiterLoading, jupiterError, jupiterData, dlmmLoading, dlmmError, dlmmData]);

  // Combine DBC pools from Jupiter
  const dbcPools = [
    ...(jupiterData?.recent?.pools || []),
    ...(jupiterData?.aboutToGraduate?.pools || []),
    ...(jupiterData?.graduated?.pools || []),
  ].filter((pool) => pool.baseAsset.launchpad === 'met-dbc');

  // Transform and filter DLMM pools - only show pools with meaningful activity
  const dlmmPools = (dlmmData || [])
    .filter(pool =>
      !pool.hide && // Not hidden
      pool.trade_volume_24h > 0 && // Has trading volume
      parseFloat(pool.liquidity) > 100 // Has at least $100 liquidity
    )
    .map(transformMeteoraPoolToPool)
    .slice(0, 100); // Limit to top 100 pools for performance

  // Debug DLMM pools
  useEffect(() => {
    if (dlmmPools.length > 0) {
      console.log('✅ DLMM Pools Transformed:', dlmmPools.length, 'pools');
      console.log('📊 Sample DLMM Pool:', dlmmPools[0]);
    }
  }, [dlmmPools.length]);

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

  // Log final pool counts
  useEffect(() => {
    console.log('📊 Final Discover Pools:', {
      dbcPools: dbcPools.length,
      dlmmPools: dlmmPools.length,
      total: sortedPools.length,
    });
  }, [dbcPools.length, dlmmPools.length, sortedPools.length]);

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
