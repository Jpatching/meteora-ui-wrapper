/**
 * Token Header Bar
 * Shows token info above the chart
 */

'use client';

import { Pool } from '@/lib/jupiter/types';

export interface TokenHeaderBarProps {
  pool: Pool;
}

export function TokenHeaderBar({ pool }: TokenHeaderBarProps) {
  const { baseAsset } = pool;
  const priceChange = baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-background border border-border-light rounded-t-xl">
      {/* Token Icon */}
      {baseAsset.icon && (
        <img
          src={baseAsset.icon}
          alt={baseAsset.symbol}
          className="w-12 h-12 rounded-full"
        />
      )}

      {/* Token Name */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground">
          {baseAsset.symbol}-SOL
        </h2>
        <p className="text-sm text-foreground-muted">{baseAsset.name}</p>
      </div>

      {/* Price Info */}
      <div className="text-right">
        <div className="text-2xl font-bold text-foreground font-mono">
          ${baseAsset.usdPrice ? baseAsset.usdPrice.toFixed(6) : '0.000000'}
        </div>
        <div className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
