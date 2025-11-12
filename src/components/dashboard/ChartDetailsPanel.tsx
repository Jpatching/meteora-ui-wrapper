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
import { useUserPositions } from '@/lib/hooks/useUserPositions';
import { useWallet } from '@solana/wallet-adapter-react';

export interface ChartDetailsPanelProps {
  pool: Pool;
  liquidityRange?: { minPrice: number; maxPrice: number } | null;
}

export function ChartDetailsPanel({ pool, liquidityRange }: ChartDetailsPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [interval, setInterval] = useState<TimeInterval>('15m');
  const { publicKey } = useWallet();

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

  // Fetch user positions to show on chart
  const { data: allPositions } = useUserPositions();

  // Build position ranges from user's positions + liquidity range being configured
  const positionRanges = isDLMM
    ? [
        // Add liquidity range being configured (RED - most important, shown on top)
        ...(liquidityRange ? [{
          minPrice: liquidityRange.minPrice,
          maxPrice: liquidityRange.maxPrice,
          color: '#ef4444', // Red color for active configuration
          label: 'Configuring',
        }] : []),
        // Add existing user positions (Purple - existing positions)
        ...(publicKey && allPositions
          ? allPositions
              .filter(p => p.poolAddress === pool.id)
              .map(p => ({
                minPrice: p.lowerBinId,
                maxPrice: p.upperBinId,
                color: '#8b5cf6', // Purple for existing positions
              }))
          : []),
      ]
    : [];

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
