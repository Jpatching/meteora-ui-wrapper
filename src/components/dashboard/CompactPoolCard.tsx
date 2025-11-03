/**
 * Compact Pool Card Component
 * Charting.ag-style pool card for the dashboard
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { Badge } from '@/components/ui';

export interface CompactPoolCardProps {
  pool: Pool;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CompactPoolCard({ pool, isSelected = false, onClick }: CompactPoolCardProps) {
  const { baseAsset } = pool;
  const priceChange = baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  // Determine protocol badge
  const getProtocolBadge = () => {
    if (pool.baseAsset.launchpad === 'met-dbc') return 'DBC';
    // TODO: Add logic to detect DLMM/DAMM from pool data
    return 'DLMM';
  };

  const protocolBadge = getProtocolBadge();

  // Format large numbers
  const formatNumber = (num: number | undefined) => {
    if (!num) return '$0';
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-200
        border ${isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border-light hover:border-primary/50 hover:scale-[1.01]'
        }
      `}
      onClick={onClick}
    >
      {/* Token Icon */}
      {baseAsset.icon && (
        <img
          src={baseAsset.icon}
          alt={baseAsset.symbol}
          className="w-12 h-12 rounded-full flex-shrink-0"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Symbol + Protocol Badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground truncate">
              {baseAsset.symbol}-SOL
            </span>
            <Badge variant="info" className="text-xs px-1.5 py-0.5">
              {protocolBadge}
            </Badge>
          </div>
        </div>

        {/* Row 2: Volume + Market Cap */}
        <div className="flex items-center gap-4 text-xs text-foreground-muted">
          <span>Vol: {formatNumber(pool.volume24h)}</span>
          <span>MCap: {formatNumber(baseAsset.mcap)}</span>
        </div>

        {/* Row 3: Price Change */}
        <div className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
