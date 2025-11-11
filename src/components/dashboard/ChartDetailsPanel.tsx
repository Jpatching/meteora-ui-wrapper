/**
 * Chart + Details Panel
 * Combined right panel for Charting.ag-inspired layout
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { TradingChart, ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { TradingChartPro } from '@/components/charts/TradingChartPro';
import { LiquidityChartOverlay } from '@/components/charts/LiquidityChartOverlay';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
import { useBinData } from '@/lib/hooks/useBinData';
import { useUserPositions } from '@/lib/hooks/useUserPositions';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';
import { Button } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

export interface ChartDetailsPanelProps {
  pool: Pool;
}

export function ChartDetailsPanel({ pool }: ChartDetailsPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [interval, setInterval] = useState<TimeInterval>('15m');
  const [showLiquidityOverlay, setShowLiquidityOverlay] = useState(false);
  const { publicKey } = useWallet();
  const router = useRouter();

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

  // Build position ranges from user's positions
  const positionRanges = isDLMM && publicKey
    ? allPositions
        ?.filter(p => p.poolAddress === pool.id)
        .map(p => ({
          minPrice: p.lowerBinId,  // Using bin IDs as price proxies
          maxPrice: p.upperBinId,
          color: '#8b5cf6', // Purple color for position ranges
        })) || []
    : [];

  // Handle add liquidity from chart overlay
  const handleAddLiquidity = (minPrice: number, maxPrice: number, amount: number) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Navigate to add liquidity page with pre-filled params
    const params = new URLSearchParams({
      pool: pool.id,
      minPrice: minPrice.toString(),
      maxPrice: maxPrice.toString(),
      amount: amount.toString(),
    });

    toast.success(`Navigating to add liquidity with $${amount} in range $${minPrice.toFixed(6)} - $${maxPrice.toFixed(6)}`);
    router.push(`/dlmm/seed-lfg?${params.toString()}`);
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = (positionId: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    toast.success(`Navigating to remove liquidity for position ${positionId.slice(0, 8)}...`);
    router.push(`/dlmm/claim-and-close?position=${positionId}`);
  };

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

          {/* Liquidity Chart Overlay */}
          {isDLMM && showLiquidityOverlay && (
            <LiquidityChartOverlay
              poolAddress={pool.id}
              poolType={poolType as 'dlmm'}
              binData={binsAroundActive}
              activeBinPrice={activeBin && typeof activeBin.price === 'number' ? activeBin.price : undefined}
              currentPrice={pool.baseAsset.usdPrice || 0}
              tokenXSymbol={pool.baseAsset.symbol}
              tokenYSymbol={pool.quoteAsset?.symbol || 'USDC'}
              onAddLiquidity={handleAddLiquidity}
              onRemoveLiquidity={handleRemoveLiquidity}
            />
          )}
        </div>

        {/* Liquidity Overlay Toggle Button - Below Chart */}
        {isDLMM && (
          <div className="px-4 pb-4 -mt-2 relative z-50">
            <button
              onClick={() => setShowLiquidityOverlay(!showLiquidityOverlay)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showLiquidityOverlay
                  ? 'bg-primary text-white shadow-lg shadow-primary/50'
                  : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary border border-border-light'
              }`}
              title={showLiquidityOverlay ? 'Hide Liquidity Controls' : 'Show Liquidity Controls'}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {showLiquidityOverlay ? 'Liquidity' : 'Add LP'}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
