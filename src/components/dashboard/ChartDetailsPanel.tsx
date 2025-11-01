/**
 * Chart + Details Panel
 * Combined right panel for Charting.ag-inspired layout
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { TradingChart, ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
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

  const { data: chartDataPoints, loading: isLoading } = useGeckoTerminalChartData({
    pool,
    interval,
  });

  const priceChange = pool.baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Token Header - Compact */}
      <div className="px-6 py-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {pool.baseAsset.icon && (
              <img
                src={pool.baseAsset.icon}
                alt={pool.baseAsset.symbol}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {pool.baseAsset.symbol}
                </h2>
                <span className="text-sm text-foreground-muted">/ SOL</span>
              </div>
              <p className="text-xs text-foreground-secondary">
                {pool.baseAsset.name}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground font-mono">
              {pool.baseAsset.usdPrice ? formatUSD(pool.baseAsset.usdPrice, 6) : '$0.00'}
            </div>
            <div className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <div className="text-foreground-muted text-xs mb-1">MCap</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.mcap ? formatUSD(pool.baseAsset.mcap) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs mb-1">24h Vol</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.volume24h ? formatUSD(pool.volume24h) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs mb-1">Liquidity</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.liquidity ? formatUSD(pool.baseAsset.liquidity) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs mb-1">Holders</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.baseAsset.holderCount ? formatNumber(pool.baseAsset.holderCount) : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <TradingChart
            data={chartDataPoints}
            chartType={chartType}
            interval={interval}
            height={400}
            showVolume={true}
            loading={isLoading}
            onIntervalChange={setInterval}
            onChartTypeChange={setChartType}
          />
        </div>

        {/* Social Links */}
        {(pool.baseAsset.twitter || pool.baseAsset.telegram || pool.baseAsset.website) && (
          <div className="px-6 pb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Social Links</h4>
            <div className="flex flex-wrap gap-2">
              {pool.baseAsset.twitter && (
                <a
                  href={pool.baseAsset.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* Token Metrics */}
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Token Metrics</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Created</span>
              <span className="font-semibold text-foreground">
                {formatTimeAgo(new Date(pool.createdAt))}
              </span>
            </div>
            {pool.baseAsset.stats24h && (
              <>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">TXs (24h)</span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatNumber((pool.baseAsset.stats24h.numBuys || 0) + (pool.baseAsset.stats24h.numSells || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Buys (24h)</span>
                  <span className="font-semibold text-success font-mono">
                    {formatNumber(pool.baseAsset.stats24h.numBuys || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Sells (24h)</span>
                  <span className="font-semibold text-error font-mono">
                    {formatNumber(pool.baseAsset.stats24h.numSells || 0)}
                  </span>
                </div>
              </>
            )}
            {pool.baseAsset.totalSupply !== undefined && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Total Supply</span>
                <span className="font-semibold text-foreground font-mono">
                  {formatNumber(pool.baseAsset.totalSupply)}
                </span>
              </div>
            )}
            {pool.baseAsset.circSupply !== undefined && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Circulating</span>
                <span className="font-semibold text-foreground font-mono">
                  {formatNumber(pool.baseAsset.circSupply)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <Link href={`/dlmm/seed-liquidity?pool=${pool.id}`}>
            <Button variant="primary" size="lg" className="w-full">
              Add Liquidity
            </Button>
          </Link>
          <a
            href={`https://solscan.io/account/${pool.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="lg" className="w-full">
              View on Solscan
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
