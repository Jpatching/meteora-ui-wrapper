/**
 * Quick Stats Component
 * Display key pool metrics in a grid
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { Card, CardContent } from '@/components/ui';

export interface QuickStatsProps {
  pool: Pool;
}

export function QuickStats({ pool }: QuickStatsProps) {
  const { baseAsset } = pool;

  const formatNumber = (num: number | undefined) => {
    if (!num) return '$0';
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const stats = [
    { label: 'Volume 24h', value: formatNumber(pool.volume24h) },
    { label: 'Market Cap', value: formatNumber(baseAsset.mcap) },
    { label: 'Holders', value: baseAsset.holderCount?.toLocaleString() || '0' },
    { label: 'Bonding Curve', value: pool.bondingCurve ? `${pool.bondingCurve.toFixed(0)}%` : 'N/A' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border-light">
          <CardContent className="p-3">
            <div className="text-xs text-foreground-muted mb-1">{stat.label}</div>
            <div className="text-lg font-bold text-foreground font-mono">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
