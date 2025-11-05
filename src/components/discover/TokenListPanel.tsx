/**
 * Token List Panel - Left panel showing all tokens
 * Displays tokens from all pools with aggregated metrics
 */

'use client';

import { useState, useMemo } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui';

interface TokenListPanelProps {
  pools: Pool[];
  isLoading: boolean;
}

type TimeFrame = '1H' | '2H' | '4H' | '8H' | '24H';

interface TokenMetrics {
  address: string;
  symbol: string;
  name: string;
  icon?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  tvl: number;
  holders: number;
  poolCount: number; // Number of pools with this token
}

export function TokenListPanel({ pools, isLoading }: TokenListPanelProps) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<TimeFrame>('24H');
  const [sortBy, setSortBy] = useState<'volume' | 'tvl' | 'price' | 'holders'>('volume');

  // Aggregate tokens from all pools
  const tokens = useMemo(() => {
    const tokenMap = new Map<string, TokenMetrics>();

    pools.forEach((pool) => {
      const token = pool.baseAsset;
      const existing = tokenMap.get(token.id);

      if (existing) {
        // Aggregate metrics
        existing.volume24h += pool.volume24h || 0;
        existing.tvl += pool.baseAsset.liquidity || 0;
        existing.poolCount += 1;
      } else {
        // Create new token entry
        tokenMap.set(token.id, {
          address: token.id,
          symbol: token.symbol,
          name: token.name,
          icon: token.icon,
          price: token.usdPrice || 0,
          priceChange24h: token.stats24h?.priceChange || 0,
          volume24h: pool.volume24h || 0,
          tvl: token.liquidity || 0,
          holders: token.holderCount || 0,
          poolCount: 1,
        });
      }
    });

    return Array.from(tokenMap.values());
  }, [pools]);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'tvl':
          return b.tvl - a.tvl;
        case 'price':
          return b.priceChange24h - a.priceChange24h;
        case 'holders':
          return b.holders - a.holders;
        default:
          return 0;
      }
    });
  }, [tokens, sortBy]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const handleTokenClick = (token: TokenMetrics) => {
    // Navigate to pool detail page for the first pool with this token
    const pool = pools.find(p => p.baseAsset.id === token.address);
    if (pool) {
      router.push(`/pool/${pool.id}`);
    }
  };

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border-light">
        <h2 className="text-lg font-semibold text-white mb-4">Tokens</h2>

        {/* Timeframe Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['1H', '2H', '4H', '8H', '24H'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-primary focus:outline-none"
        >
          <option value="volume">Volume</option>
          <option value="tvl">TVL</option>
          <option value="price">Price Change</option>
          <option value="holders">Holders</option>
        </select>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading tokens...</p>
          </div>
        ) : sortedTokens.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No tokens found
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {sortedTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleTokenClick(token)}
                className="w-full p-4 hover:bg-gray-800/50 transition-colors text-left"
              >
                {/* Token Header */}
                <div className="flex items-center gap-3 mb-2">
                  {token.icon ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm truncate">
                        {token.symbol}
                      </h3>
                      <Badge variant="info" className="text-[10px] px-1.5 py-0.5">
                        {token.poolCount} {token.poolCount === 1 ? 'pool' : 'pools'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{token.name}</p>
                  </div>

                  {/* Price Change */}
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${
                      token.priceChange24h >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {token.priceChange24h >= 0 ? '+' : ''}
                      {typeof token.priceChange24h === 'number' ? token.priceChange24h.toFixed(2) : '0.00'}%
                    </div>
                    <div className="text-xs text-gray-400">
                      ${typeof token.price === 'number' ? token.price.toFixed(6) : '0.000000'}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Vol: </span>
                    <span className="text-white font-medium">
                      {formatNumber(token.volume24h)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">TVL: </span>
                    <span className="text-white font-medium">
                      {formatNumber(token.tvl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Holders: </span>
                    <span className="text-white font-medium">
                      {token.holders.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
