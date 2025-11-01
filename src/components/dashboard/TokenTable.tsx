/**
 * Token Table Component
 * Shows aggregated token data (all pools combined per token)
 */

'use client';

import { formatUSD, formatNumber } from '@/lib/format/number';

export interface TokenData {
  tokenAddress: string;
  symbol: string;
  name: string;
  icon?: string;
  totalVolume24h: number;
  totalLiquidity: number;
  holders: number;
  pools: any[]; // Pool type
  priceChange: number;
}

export interface TokenTableProps {
  tokens: TokenData[];
  onTokenClick: (token: TokenData) => void;
  sortBy?: 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap';
  onSortChange?: (sort: 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap') => void;
}

export function TokenTable({ tokens, onTokenClick, sortBy, onSortChange }: TokenTableProps) {
  const SortableHeader = ({
    label,
    sortKey,
    align = 'right'
  }: {
    label: string;
    sortKey: 'volume' | 'liquidity' | 'holders';
    align?: 'left' | 'right';
  }) => (
    <th
      className={`text-${align} py-3 px-4 font-medium cursor-pointer hover:text-foreground transition-colors select-none group`}
      onClick={() => onSortChange?.(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span>{label}</span>
        <svg
          className={`w-3 h-3 transition-opacity ${sortBy === sortKey ? 'opacity-100 text-primary' : 'opacity-40 group-hover:opacity-70'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-foreground-muted border-b border-border-light">
            <th className="text-left py-3 px-4 font-medium">Token</th>
            <th className="text-right py-3 px-4 font-medium">Pools</th>
            <SortableHeader label="Total TVL" sortKey="liquidity" />
            <SortableHeader label="Total Volume" sortKey="volume" />
            <SortableHeader label="Holders" sortKey="holders" />
            <th className="text-right py-3 px-4 font-medium">24h Change</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const isPositive = token.priceChange >= 0;

            return (
              <tr
                key={token.tokenAddress}
                onClick={() => onTokenClick(token)}
                className="border-b border-border-light hover:bg-background-secondary cursor-pointer transition-colors"
              >
                {/* Token Column */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {token.icon && (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">
                        {token.symbol}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {token.name}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Pools Count */}
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-foreground">
                    {token.pools.length}
                  </div>
                </td>

                {/* Total TVL Column */}
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold font-mono text-foreground">
                    {token.totalLiquidity > 0 ? formatUSD(token.totalLiquidity) : '$0'}
                  </div>
                </td>

                {/* Total Volume Column */}
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold font-mono text-foreground">
                    {token.totalVolume24h > 0 ? formatUSD(token.totalVolume24h) : '$0'}
                  </div>
                </td>

                {/* Holders Column */}
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold font-mono text-foreground">
                    {formatNumber(token.holders)}
                  </div>
                </td>

                {/* 24h Change Column */}
                <td className="py-3 px-4 text-right">
                  <div className={`font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
                    {isPositive ? '+' : ''}{token.priceChange.toFixed(2)}%
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {tokens.length === 0 && (
        <div className="text-center py-12 text-foreground-muted">
          No tokens found
        </div>
      )}
    </div>
  );
}
