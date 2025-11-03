/**
 * Chart Panel
 * Center panel displaying TradingView-style price chart
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { TradingChart, ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';

export interface ChartPanelProps {
  pool: Pool;
}

export function ChartPanel({ pool }: ChartPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [interval, setInterval] = useState<TimeInterval>('15m');

  // Use GeckoTerminal for chart data (free, Solana DEX aggregator)
  const { data: chartDataPoints, loading: isLoading, currentPrice, priceChange24h } = useGeckoTerminalChartData({
    pool,
    interval,
  });

  const priceChange = pool.baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex flex-col h-full bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Token Header */}
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center gap-3 mb-3">
          {pool.baseAsset.icon && (
            <img
              src={pool.baseAsset.icon}
              alt={pool.baseAsset.symbol}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {pool.baseAsset.symbol}
              </h2>
              <span className="text-sm text-foreground-muted">
                / SOL
              </span>
            </div>
            <p className="text-sm text-foreground-secondary">
              {pool.baseAsset.name}
            </p>
          </div>
        </div>

        {/* Price Stats */}
        <div className="flex items-baseline gap-4">
          <div className="text-3xl font-bold text-foreground font-mono">
            {pool.baseAsset.usdPrice ? formatUSD(pool.baseAsset.usdPrice, 6) : '$0.00'}
          </div>
          <div className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
          <div className="text-sm text-foreground-muted">
            24h
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <div className="text-foreground-muted mb-1">MCap</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.mcap ? formatUSD(pool.baseAsset.mcap) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted mb-1">24h Vol</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.volume24h ? formatUSD(pool.volume24h) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted mb-1">Liquidity</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.liquidity ? formatUSD(pool.baseAsset.liquidity) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted mb-1">Holders</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.holderCount ? formatNumber(pool.baseAsset.holderCount) : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4">
        <TradingChart
          data={chartDataPoints}
          chartType={chartType}
          interval={interval}
          height={500}
          showVolume={true}
          loading={isLoading}
          onIntervalChange={setInterval}
          onChartTypeChange={setChartType}
        />
      </div>

      {/* Additional Stats */}
      <div className="p-4 border-t border-border-light">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-foreground-muted mb-1">Buys (24h)</div>
            <div className="font-semibold text-success">
              {pool.baseAsset.stats24h?.numBuys ? formatNumber(pool.baseAsset.stats24h.numBuys) : '0'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted mb-1">Sells (24h)</div>
            <div className="font-semibold text-error">
              {pool.baseAsset.stats24h?.numSells ? formatNumber(pool.baseAsset.stats24h.numSells) : '0'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted mb-1">Created</div>
            <div className="font-semibold text-foreground">
              {formatTimeAgo(new Date(pool.createdAt))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
