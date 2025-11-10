/**
 * Pool Table Component
 * Charting.ag-inspired layout with comprehensive trader info
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { PoolMetadataDisplay } from './PoolMetadataDisplay';
import { TokenIcon } from '@/components/ui/TokenIcon';

export interface PoolTableProps {
  pools: Pool[];
  onPoolClick: (pool: Pool) => void;
  sortBy?: 'volume' | 'liquidity';
  onSortChange?: (sort: 'volume' | 'liquidity') => void;
}

export function PoolTable({ pools, onPoolClick, sortBy, onSortChange }: PoolTableProps) {
  const SortableHeader = ({
    label,
    sortKey
  }: {
    label: string;
    sortKey: 'volume' | 'liquidity';
  }) => (
    <th
      className="text-right py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors select-none group"
      onClick={() => onSortChange?.(sortKey)}
    >
      <div className="flex items-center gap-1 justify-end">
        <span>{label}</span>
        <svg
          className={`w-3 h-3 transition-opacity ${sortBy === sortKey ? 'opacity-100 text-primary' : 'opacity-40 group-hover:opacity-70'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          suppressHydrationWarning
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" suppressHydrationWarning />
        </svg>
      </div>
    </th>
  );

  const getProtocolBadge = (pool: Pool): { label: string; color: string } => {
    // Charting.ag style - border only with white text, no fill
    if (pool.baseAsset.launchpad === 'met-dbc') return { label: 'DBC', color: 'border border-orange-500/50 text-white' };
    if (pool.type === 'dlmm') return { label: 'DLMM', color: 'border border-orange-500/50 text-white' };
    if (pool.type === 'damm-v2') return { label: 'DYN2', color: 'border border-orange-500/50 text-white' };
    if (pool.type === 'damm-v1' || pool.type === 'damm') return { label: 'DYN1', color: 'border border-orange-500/50 text-white' };
    if (pool.type === 'alpha-vault') return { label: 'ALPHA', color: 'border border-orange-500/50 text-white' };
    return { label: 'POOL', color: 'border border-gray-500/50 text-white' };
  };

  const getQuoteTokenInfo = (pool: Pool): { logo: string; symbol: string } => {
    // Detect quote token from pool data
    // First check quoteAsset if available
    if (pool.quoteAsset?.symbol) {
      const symbol = pool.quoteAsset.symbol.toUpperCase();
      if (symbol === 'USDC') {
        return { logo: '/usdc-logo.png', symbol: 'USDC' };
      }
      if (symbol === 'SOL' || symbol === 'WSOL') {
        return { logo: '/sol-logo.png', symbol: 'SOL' };
      }
      // Return first letter for unknown tokens
      return { logo: '', symbol };
    }

    // Fallback: check pool ID and mint addresses
    const quoteMint = pool.quoteAsset?.id?.toLowerCase() || '';
    const baseAssetLaunchpad = pool.baseAsset?.launchpad || '';

    // USDC mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
    if (quoteMint.includes('epjf') || quoteMint.includes('usdc')) {
      return { logo: '/usdc-logo.png', symbol: 'USDC' };
    }

    // Default to SOL for Solana-based pools
    return { logo: '/sol-logo.png', symbol: 'SOL' };
  };

  const getTimeAgo = (createdAt: string): string => {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const diffMs = now - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'New';
  };

  const formatCompact = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr className="text-[10px] text-foreground-muted/60 border-b border-border-light/30 uppercase tracking-wider">
            <th className="text-left py-2 px-2 font-medium">Pair</th>
            <SortableHeader label="TVL" sortKey="liquidity" />
            <SortableHeader label="Volume" sortKey="volume" />
            <th className="text-right py-2 px-2 font-medium">Fees</th>
            <th className="text-right py-2 px-2 font-medium">Fee/TV</th>
            <th className="text-right py-2 px-2 font-medium">24h</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => {
            const protocol = getProtocolBadge(pool);
            const quoteToken = getQuoteTokenInfo(pool);
            const priceChange = pool.baseAsset.stats24h?.priceChange || 0;
            const isPositive = priceChange >= 0;
            const timeAgo = getTimeAgo(pool.createdAt);

            // Calculate Fee/TV ratio (24h fees / TVL) - represents daily yield
            const tvl = pool.baseAsset.liquidity || 0;
            const volume24h = pool.volume24h || 0;
            const estimatedFees = volume24h * 0.003; // Assume 0.3% fee
            const feeTVRatio = tvl > 0 ? (estimatedFees / tvl) * 100 : 0;

            return (
              <tr
                key={pool.id}
                onClick={() => onPoolClick(pool)}
                className="border-b border-border-light/20 hover:bg-background-secondary/30 cursor-pointer transition-colors"
              >
                {/* Pair Column - Charting.ag exact style */}
                <td className="py-4 px-2">
                  <div className="flex items-center gap-3">
                    {/* Token Icons - Overlapping circles - LARGER */}
                    <div className="flex items-center -space-x-2.5 flex-shrink-0">
                      <TokenIcon
                        src={pool.baseAsset.icon}
                        symbol={pool.baseAsset.symbol}
                        size="lg"
                        className="border-2 border-background"
                      />
                      <TokenIcon
                        src={pool.quoteAsset?.icon || quoteToken.logo}
                        symbol={pool.quoteAsset?.symbol || quoteToken.symbol}
                        size="lg"
                        className="border-2 border-background"
                      />
                    </div>

                    {/* Pool Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Meteora Logo Icon */}
                        <img
                          src="/meteora.png"
                          alt="Meteora"
                          className="w-5 h-5 rounded-full flex-shrink-0"
                        />
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${protocol.color}`}>
                          {protocol.label}
                        </span>
                        <span className="font-semibold text-sm text-foreground/90 truncate">
                          {pool.baseAsset.symbol}-{pool.quoteAsset?.symbol || quoteToken.symbol}
                        </span>
                      </div>
                      <div>
                        <PoolMetadataDisplay meteoraData={(pool as any).meteoraData} />
                      </div>
                    </div>
                  </div>
                </td>

                {/* TVL Column */}
                <td className="py-4 px-2 text-right">
                  <div className="font-medium text-sm font-mono text-foreground-muted/80">
                    {formatCompact(tvl)}
                  </div>
                </td>

                {/* Volume Column */}
                <td className="py-4 px-2 text-right">
                  <div className="font-medium text-sm font-mono text-foreground-muted/80">
                    {formatCompact(volume24h)}
                  </div>
                </td>

                {/* Fees Column */}
                <td className="py-4 px-2 text-right">
                  <div className="font-medium text-sm font-mono text-foreground-muted/80">
                    {formatCompact(estimatedFees)}
                  </div>
                </td>

                {/* Fee/TV Ratio Column */}
                <td className="py-4 px-2 text-right">
                  <div className={`font-medium text-sm ${feeTVRatio > 0.1 ? 'text-emerald-400/80' : 'text-foreground-muted/60'}`}>
                    {feeTVRatio.toFixed(2)}%
                  </div>
                </td>

                {/* 24h Change Column with arrow */}
                <td className="py-4 px-2 text-right">
                  <div className={`font-medium text-sm flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                    <span>{isPositive ? '+' : ''}{priceChange.toFixed(2)}%</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      {isPositive ? (
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pools.length === 0 && (
        <div className="text-center py-12 text-foreground-muted">
          No pools found
        </div>
      )}
    </div>
  );
}
