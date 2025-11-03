/**
 * Main Dashboard Page
 * Charting.ag-style three-panel layout
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { PoolListPanel } from '@/components/dashboard/PoolListPanel';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { DetailsPanel } from '@/components/dashboard/DetailsPanel';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { Pool } from '@/lib/jupiter/types';

export default function DashboardPage() {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  // Fetch all public pools with 90s polling
  const { data, isLoading, error } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: 90000, // 90 seconds
  });

  // Combine and filter pools for Meteora ecosystem
  const allPools = [
    ...(data?.recent?.pools || []),
    ...(data?.aboutToGraduate?.pools || []),
    ...(data?.graduated?.pools || []),
  ];

  // Filter for Meteora ecosystem (met-dbc, jup-studio) + volume threshold
  const ecosystemPools = allPools.filter((pool) => {
    const launchpad = pool.baseAsset.launchpad;
    const volume = pool.volume24h || 0;

    // Always include Meteora DBC
    if (launchpad === 'met-dbc') return true;

    // Include Jupiter Studio
    if (launchpad === 'jup-studio') return true;

    // Include others only if high volume
    if (volume >= 10000) return true; // $10K minimum

    return false;
  });

  // Remove duplicates by pool ID
  const uniquePools = Array.from(
    new Map(ecosystemPools.map(pool => [pool.id, pool])).values()
  );

  // Sort by volume
  const sortedPools = uniquePools.sort((a, b) =>
    (b.volume24h || 0) - (a.volume24h || 0)
  );

  // Auto-select first pool
  useEffect(() => {
    if (sortedPools.length > 0 && !selectedPool) {
      setSelectedPool(sortedPools[0]);
    }
  }, [sortedPools, selectedPool]);

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto h-[calc(100vh-140px)]">
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-error font-medium mb-2">Failed to load pools</p>
            <p className="text-sm text-foreground-muted">{error.message}</p>
          </div>
        )}

        {/* Three-Panel Layout */}
        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] lg:grid-cols-[380px_1fr_380px] gap-4 h-full">
            {/* Left: Pool List */}
            <PoolListPanel
              pools={sortedPools}
              selectedPoolId={selectedPool?.id}
              onSelectPool={setSelectedPool}
              isLoading={isLoading}
            />

            {/* Center: Chart */}
            <div className="flex flex-col">
              {selectedPool ? (
                <ChartPanel pool={selectedPool} />
              ) : (
                <div className="flex items-center justify-center h-full bg-background border border-border-light rounded-xl">
                  <div className="text-center text-foreground-muted">
                    <div className="text-6xl mb-4">🌊</div>
                    <p>Select a pool to view details</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Details (hidden on mobile/tablet) */}
            <div className="hidden lg:block">
              {selectedPool ? (
                <DetailsPanel pool={selectedPool} />
              ) : (
                <div className="flex items-center justify-center h-full bg-background border border-border-light rounded-xl">
                  <p className="text-foreground-muted">No pool selected</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
