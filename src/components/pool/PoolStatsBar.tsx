'use client';

import { useMemo } from 'react';
import { TokenIcon } from '@/components/ui/TokenIcon';

interface PoolStatsBarProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  currentPrice: number;
  volume24h?: number;
  tvl?: number;
  holders?: number;
  priceChange24h?: number;
  tokenXMint?: string;
  tokenYMint?: string;
}

export function PoolStatsBar({
  tokenXSymbol,
  tokenYSymbol,
  currentPrice,
  volume24h = 0,
  tvl = 0,
  holders,
  priceChange24h = 0,
  tokenXMint,
  tokenYMint,
}: PoolStatsBarProps) {
  // Format large numbers
  const formatNumber = (num: number, decimals = 2): string => {
    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(decimals)}B`;
    } else if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(decimals)}M`;
    } else if (num >= 1_000) {
      return `$${(num / 1_000).toFixed(decimals)}K`;
    }
    return `$${num.toFixed(decimals)}`;
  };

  const priceChangeColor = priceChange24h >= 0 ? 'text-green-400' : 'text-red-400';
  const priceChangeSign = priceChange24h >= 0 ? '+' : '';

  return (
    <div className="h-16 bg-gradient-to-r from-background-secondary via-background-tertiary to-background-secondary border-b border-border-light flex items-center justify-between px-6 shadow-lg">
      {/* Left: Token Pair */}
      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          {tokenXMint && <TokenIcon symbol={tokenXSymbol} size="lg" />}
          {tokenYMint && <TokenIcon symbol={tokenYSymbol} size="lg" />}
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            {tokenXSymbol} / {tokenYSymbol}
          </h1>
          <p className="text-xs text-gray-400">DLMM Pool</p>
        </div>
      </div>

      {/* Center: Price Stats */}
      <div className="flex items-center gap-8">
        {/* Current Price */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 mb-1">Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white font-mono">
              ${currentPrice.toFixed(6)}
            </span>
            <span className={`text-xs font-semibold ${priceChangeColor}`}>
              {priceChangeSign}{priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 mb-1">24h Volume</span>
          <span className="text-lg font-bold text-white">
            {formatNumber(volume24h)}
          </span>
        </div>

        {/* TVL / Market Cap */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 mb-1">TVL</span>
          <span className="text-lg font-bold text-white">
            {formatNumber(tvl)}
          </span>
        </div>

        {/* Holders (if available) */}
        {holders !== undefined && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Holders</span>
            <span className="text-lg font-bold text-white">
              {holders.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Right: Additional Actions */}
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all border border-primary/30">
          Trade on Meteora →
        </button>
      </div>
    </div>
  );
}
