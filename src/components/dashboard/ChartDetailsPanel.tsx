/**
 * Chart + Details Panel
 * Combined right panel for Charting.ag-inspired layout
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { TradingChart, ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { TradingChartPro } from '@/components/charts/TradingChartPro';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
import { useBinData } from '@/lib/hooks/useBinData';

export interface ChartDetailsPanelProps {
  pool: Pool;
  liquidityRange?: { minPrice: number; maxPrice: number } | null;
}

export function ChartDetailsPanel({ pool, liquidityRange }: ChartDetailsPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [interval, setInterval] = useState<TimeInterval>('15m');

  const { data: chartDataPoints, loading: isLoading } = useGeckoTerminalChartData({
    pool,
    interval,
  });

  // Detect pool type
  const poolType = pool.type || (pool.dex === 'Meteora' && pool.baseAsset.launchpad?.includes('dlmm') ? 'dlmm' : 'dbc');
  const isDLMM = poolType === 'dlmm';

  // Fetch bin data for DLMM pools
  const { activeBin, binsAroundActive } = useBinData({
    poolAddress: pool.id,
    enabled: isDLMM,
    refreshInterval: 0, // No auto-refresh for chart
    binRange: 50,
  });

  // Debug log bin data changes
  console.log(`🔍 ChartDetailsPanel - Pool: ${pool.id.slice(0, 8)}, BinStep: ${pool.binStep}, IsDLMM: ${isDLMM}`, {
    binsCount: binsAroundActive.length,
    activeBinPrice: activeBin?.price,
    firstBin: binsAroundActive[0]?.price,
    lastBin: binsAroundActive[binsAroundActive.length - 1]?.price,
  });

  // Build position ranges - ONLY show the liquidity range being configured (not existing positions)
  const positionRanges = isDLMM && liquidityRange
    ? [
        {
          minPrice: liquidityRange.minPrice,
          maxPrice: liquidityRange.maxPrice,
          // BLUE if current price is IN range, RED if OUT of range (charting.ag style)
          color: (() => {
            const currentPrice = pool.baseAsset.usdPrice || 0;
            if (!currentPrice) return '#3b82f6'; // Default blue

            // Check if current price is inside the configured range
            const isInRange = currentPrice >= liquidityRange.minPrice && currentPrice <= liquidityRange.maxPrice;

            console.log('🎨 Chart Range Color:', {
              currentPrice,
              minPrice: liquidityRange.minPrice,
              maxPrice: liquidityRange.maxPrice,
              isInRange,
              color: isInRange ? 'BLUE' : 'RED',
            });

            // Blue if in range, red if out of range
            return isInRange ? '#3b82f6' : '#ef4444';
          })(),
          label: 'Configuring',
        },
      ]
    : [];

  console.log('📊 ChartDetailsPanel positionRanges:', positionRanges);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Chart Section - Full Height */}
      <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
        {/* Chart fills available height */}
        <div className="flex-1 w-full p-4">
          <TradingChartPro
            key={pool.id} // Force re-render when pool changes
            data={chartDataPoints}
            interval={interval}
            height={600}
            loading={isLoading}
            onIntervalChange={setInterval}
            tokenSymbol={pool.baseAsset.symbol}
            tokenName={pool.baseAsset.name}
            currentPrice={pool.baseAsset.usdPrice || 0}
            marketCap={pool.baseAsset.mcap}
            // DLMM-specific overlays
            binData={isDLMM ? binsAroundActive : undefined}
            showBinDistribution={isDLMM && binsAroundActive.length > 0}
            activeBinPrice={isDLMM && activeBin && typeof activeBin.price === 'number' ? activeBin.price : undefined}
            positionRanges={positionRanges.length > 0 ? positionRanges : undefined}
          />
        </div>
      </div>
    </div>
  );
}
