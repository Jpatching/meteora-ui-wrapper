/**
 * Chart + Details Panel
 * Combined right panel for Charting.ag-inspired layout
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { TradingChart, ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
import { useBinData } from '@/lib/hooks/useBinData';
import { useUserPositions } from '@/lib/hooks/useUserPositions';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';
import { Button } from '@/components/ui';
import Link from 'next/link';

export interface ChartDetailsPanelProps {
  pool: Pool;
}

export function ChartDetailsPanel({ pool }: ChartDetailsPanelProps) {
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

  const priceChange = pool.baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Token Header - Very Compact */}
      <div className="px-4 py-3 border-b border-border-light">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {pool.baseAsset.icon && (
              <img
                src={pool.baseAsset.icon}
                alt={pool.baseAsset.symbol}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-foreground">
                  {pool.baseAsset.symbol}
                </h2>
                <span className="text-xs text-foreground-muted">/ SOL</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="text-lg font-bold text-foreground font-mono">
              {pool.baseAsset.usdPrice ? formatUSD(pool.baseAsset.usdPrice, 6) : '$0.00'}
            </div>
            <div className={`text-xs font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
            </div>
          </div>
        </div>

        {/* Quick Stats Row - Compact */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <div className="text-foreground-muted">MCap</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.mcap ? formatUSD(pool.baseAsset.mcap) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted">24h Vol</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.volume24h ? formatUSD(pool.volume24h) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted">Liquidity</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.liquidity ? formatUSD(pool.baseAsset.liquidity) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted">Holders</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.holderCount ? formatNumber(pool.baseAsset.holderCount) : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section - Compact */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <TradingChart
            data={chartDataPoints}
            chartType={chartType}
            interval={interval}
            height={280}
            showVolume={true}
            loading={isLoading}
            onIntervalChange={setInterval}
            onChartTypeChange={setChartType}
            // DLMM-specific props
            binData={isDLMM ? binsAroundActive : undefined}
            showBinHistogram={isDLMM && binsAroundActive.length > 0}
            activeBinPrice={isDLMM && activeBin && typeof activeBin.price === 'number' ? activeBin.price : undefined}
            positionRanges={positionRanges.length > 0 ? positionRanges : undefined}
          />
        </div>

        {/* Social Links - Compact */}
        {(pool.baseAsset.twitter || pool.baseAsset.telegram || pool.baseAsset.website) && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {pool.baseAsset.twitter && (
                <a
                  href={pool.baseAsset.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </a>
              )}
              {pool.baseAsset.telegram && (
                <a
                  href={pool.baseAsset.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  Telegram
                </a>
              )}
              {pool.baseAsset.website && (
                <a
                  href={pool.baseAsset.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* Token Metrics - Compact */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-foreground-muted">Created</span>
              <span className="font-semibold text-foreground">
                {formatTimeAgo(new Date(pool.createdAt))}
              </span>
            </div>
            {pool.baseAsset.stats24h && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-foreground-muted">TXs (24h)</span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatNumber((pool.baseAsset.stats24h.numBuys || 0) + (pool.baseAsset.stats24h.numSells || 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* View on Solscan Link */}
        <div className="px-6 pb-4">
          <a
            href={`https://solscan.io/account/${pool.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2 bg-background-secondary hover:bg-background-tertiary border border-border-light rounded-lg text-center text-sm text-foreground transition-colors"
          >
            View on Solscan →
          </a>
        </div>
      </div>
    </div>
  );
}
