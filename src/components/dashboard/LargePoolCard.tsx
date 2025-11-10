/**
 * Large Pool Card Component
 * Charting.ag-inspired large card with avatar and grid metrics
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';

export interface LargePoolCardProps {
  pool: Pool;
  isSelected?: boolean;
  onClick?: () => void;
}

export function LargePoolCard({ pool, isSelected = false, onClick }: LargePoolCardProps) {
  const { baseAsset } = pool;
  const priceChange = baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  // Determine protocol badge
  const getProtocolBadge = () => {
    if (pool.baseAsset.launchpad === 'met-dbc') return 'DBC';
    if (pool.type === 'dlmm') return 'DLMM';
    if (pool.type === 'damm-v2') return 'DAMM v2';
    if (pool.type === 'damm' || pool.type === 'damm-v1') return 'DAMM v1';
    if (pool.type === 'alpha-vault') return 'ALPHA';
    return 'POOL';
  };

  const protocolBadge = getProtocolBadge();

  return (
    <div
      className={`
        rounded-xl p-4 cursor-pointer transition-all duration-200
        border ${isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border-light hover:border-primary/40 hover:shadow-md bg-background-secondary'
        }
      `}
      onClick={onClick}
    >
      {/* Top Section: Avatar + Token Info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Token Avatar */}
        {baseAsset.icon && (
          <img
            src={baseAsset.icon}
            alt={baseAsset.symbol}
            className="w-14 h-14 rounded-full flex-shrink-0"
          />
        )}

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-foreground truncate">
              {baseAsset.symbol}
            </h3>
            <span className="text-sm text-foreground-muted">
              {baseAsset.name?.length > 15 ? baseAsset.name.slice(0, 15) + '...' : baseAsset.name}
            </span>
          </div>
          <div className="text-xs text-foreground-muted">
            {formatTimeAgo(new Date(pool.createdAt))} •
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
              {protocolBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid - Exact Charting.ag layout */}
      <div className="space-y-2.5 text-sm">
        {/* Row 1: Vol + Market Cap */}
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <div className="text-foreground-muted text-xs mb-0.5">Vol</div>
            <div className="font-semibold font-mono text-foreground">
              {pool.volume24h ? formatUSD(pool.volume24h) : '$0'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs mb-0.5">Market Cap</div>
            <div className="font-semibold font-mono text-foreground">
              {baseAsset.mcap ? formatUSD(baseAsset.mcap) : '$0'}
            </div>
          </div>
        </div>

        {/* Row 2: Liquidity + Holder */}
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <div className="text-foreground-muted text-xs mb-0.5">Liquidity</div>
            <div className="font-semibold font-mono text-foreground">
              {baseAsset.liquidity ? formatUSD(baseAsset.liquidity) : '$0'}
            </div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs mb-0.5">Holder</div>
            <div className="font-semibold font-mono text-foreground">
              {baseAsset.holderCount ? formatNumber(baseAsset.holderCount) : '0'}
            </div>
          </div>
        </div>

        {/* Row 3: TXs + (empty for alignment) */}
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <div className="text-foreground-muted text-xs mb-0.5">TXs</div>
            <div className="font-semibold font-mono text-foreground">
              {baseAsset.stats24h
                ? formatNumber((baseAsset.stats24h.numBuys || 0) + (baseAsset.stats24h.numSells || 0))
                : '0'
              }
            </div>
          </div>
          <div></div>
        </div>
      </div>

      {/* Bottom Grid: Top 10, Dev H, Mint, Freeze, Score - Charting.ag style */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border-light text-sm">
        <div>
          <div className="text-foreground-muted text-xs mb-0.5">Top 10</div>
          <div className={`font-bold ${priceChange >= 0 ? 'text-success' : 'text-error'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-foreground-muted text-xs mb-0.5">Dev H</div>
          <div className="font-bold text-foreground">
            {baseAsset.audit?.devBalancePercentage ? `${baseAsset.audit.devBalancePercentage.toFixed(1)}%` : '1.85%'}
          </div>
        </div>
        <div>
          <div className="text-foreground-muted text-xs mb-0.5">Mint</div>
          <div className="font-bold text-error">No</div>
        </div>
        <div>
          <div className="text-foreground-muted text-xs mb-0.5">Freeze</div>
          <div className="font-bold text-error">No</div>
        </div>
        <div>
          <div className="text-foreground-muted text-xs mb-0.5">Score</div>
          <div className={
            !baseAsset.organicScore ? 'font-bold text-error' :
            baseAsset.organicScore >= 70 ? 'font-bold text-success' :
            baseAsset.organicScore >= 40 ? 'font-bold text-warning' :
            'font-bold text-error'
          }>
            {baseAsset.organicScore ? Math.round(baseAsset.organicScore) : '0'}
          </div>
        </div>
      </div>
    </div>
  );
}
