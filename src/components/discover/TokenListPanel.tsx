/**
 * Token List Panel - Left panel showing all tokens
 * Displays tokens from all pools with aggregated metrics
 * Styled to match charting.ag layout
 */

'use client';

import { useState, useMemo } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
  mcap: number;
  liquidity: number;
  holders: number;
  txCount: number;
  poolCount: number;
  twitter?: string;
  createdAt: string;
  organicScore?: number;
  audit?: {
    mintAuthorityDisabled: boolean | undefined;
    freezeAuthorityDisabled: boolean | undefined;
    topHoldersPercentage: number | undefined;
    devBalancePercentage?: number | undefined;
  };
}

export function TokenListPanel({ pools, isLoading }: TokenListPanelProps) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<TimeFrame>('24H');
  const [sortBy, setSortBy] = useState<'volume' | 'mcap' | 'price' | 'holders'>('volume');

  // Aggregate tokens from all pools
  const tokens = useMemo(() => {
    const tokenMap = new Map<string, TokenMetrics>();

    pools.forEach((pool) => {
      const token = pool.baseAsset;
      const existing = tokenMap.get(token.id);

      if (existing) {
        // Aggregate metrics
        existing.volume24h += pool.volume24h || 0;
        existing.liquidity += pool.baseAsset.liquidity || 0;
        existing.poolCount += 1;
        // Update tx count
        const buys = pool.baseAsset.stats24h?.numBuys || 0;
        const sells = pool.baseAsset.stats24h?.numSells || 0;
        existing.txCount = buys + sells;
      } else {
        // Create new token entry
        const buys = token.stats24h?.numBuys || 0;
        const sells = token.stats24h?.numSells || 0;

        tokenMap.set(token.id, {
          address: token.id,
          symbol: token.symbol,
          name: token.name,
          icon: token.icon,
          price: token.usdPrice || 0,
          priceChange24h: token.stats24h?.priceChange || 0,
          volume24h: pool.volume24h || 0,
          mcap: token.mcap || 0,
          liquidity: token.liquidity || 0,
          holders: token.holderCount || 0,
          txCount: buys + sells,
          poolCount: 1,
          twitter: token.twitter,
          createdAt: pool.createdAt,
          organicScore: token.organicScore,
          audit: token.audit,
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
        case 'mcap':
          return b.mcap - a.mcap;
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

  const formatCount = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const getTokenAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days > 0) {
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days}d ${hours}h`;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes}m`;
  };

  const handleCopyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
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
          <option value="mcap">Market Cap</option>
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
          <div className="divide-y divide-gray-800/50">
            {sortedTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleTokenClick(token)}
                className="w-full p-3 hover:bg-gray-800/30 transition-colors text-left"
              >
                {/* Main Container: Left (Token Info) + Right (Metrics) */}
                <div className="flex items-start gap-3">

                  {/* LEFT SECTION: Icon + Token Info */}
                  <div className="flex items-start gap-2 flex-shrink-0">
                    {/* Token Icon */}
                    {token.icon ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}

                    {/* Token Details */}
                    <div className="flex flex-col">
                      {/* Token Name */}
                      <h3 className="font-bold text-white text-sm mb-0.5">
                        {token.symbol}
                      </h3>

                      {/* Contract Address with Copy */}
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {token.address.slice(0, 3)}...{token.address.slice(-4)}
                        </span>
                        <button
                          onClick={(e) => handleCopyAddress(token.address, e)}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>

                      {/* Token Age & Social Links */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-gray-500">
                          {getTokenAge(token.createdAt)}
                        </span>
                        <span className="text-gray-700">|</span>
                        {token.twitter && (
                          <>
                            <a
                              href={`https://x.com/${token.twitter.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-primary transition-colors"
                            >
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </a>
                            <span className="text-gray-700">|</span>
                          </>
                        )}
                        <a
                          href={`https://solscan.io/token/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SECTION: Metrics in 2 Rows x 5 Columns */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Main Metrics Headers */}
                    <div className="grid grid-cols-5 gap-x-2 text-[9px] text-gray-500 mb-0.5">
                      <div>Vol</div>
                      <div>Market Cap</div>
                      <div>Liquidity</div>
                      <div>Holder</div>
                      <div>TXs</div>
                    </div>

                    {/* Row 2: Main Metrics Values */}
                    <div className="grid grid-cols-5 gap-x-2 text-[11px] text-white font-medium mb-2">
                      <div>{formatNumber(token.volume24h)}</div>
                      <div>{formatNumber(token.mcap)}</div>
                      <div>{formatNumber(token.liquidity)}</div>
                      <div>{formatCount(token.holders)}</div>
                      <div>{formatCount(token.txCount)}</div>
                    </div>

                    {/* Row 3: Security Metrics Headers */}
                    <div className="grid grid-cols-5 gap-x-2 text-[9px] text-gray-500 mb-0.5">
                      <div>Top 10</div>
                      <div>Dev H</div>
                      <div>Mint</div>
                      <div>Freeze</div>
                      <div>Score</div>
                    </div>

                    {/* Row 4: Security Metrics Values */}
                    <div className="grid grid-cols-5 gap-x-2 text-[11px] font-medium">
                      <div className="text-white">
                        {token.audit?.topHoldersPercentage !== undefined
                          ? `${token.audit.topHoldersPercentage.toFixed(2)}%`
                          : '0.00%'}
                      </div>
                      <div className="text-white">
                        {token.audit?.devBalancePercentage !== undefined
                          ? `${token.audit.devBalancePercentage.toFixed(0)}%`
                          : '0%'}
                      </div>
                      <div className={token.audit?.mintAuthorityDisabled === true ? 'text-success' : 'text-warning'}>
                        {token.audit?.mintAuthorityDisabled === true ? 'No' : 'Yes'}
                      </div>
                      <div className={token.audit?.freezeAuthorityDisabled === true ? 'text-success' : 'text-warning'}>
                        {token.audit?.freezeAuthorityDisabled === true ? 'No' : 'Yes'}
                      </div>
                      <div className="text-white">
                        {token.organicScore ? Math.round(token.organicScore) : '0'}
                      </div>
                    </div>
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
