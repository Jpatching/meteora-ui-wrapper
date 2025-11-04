/**
 * Pair List Panel - Right panel showing all pool pairs
 * Displays each specific pool separately (not aggregated)
 */

'use client';

import { useState, useMemo } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui';

interface PairListPanelProps {
  pools: Pool[];
  isLoading: boolean;
}

type TimeFrame = '1H' | '2H' | '4H' | '8H' | '24H';
type ProtocolFilter = 'all' | 'dlmm' | 'dbc' | 'damm';

export function PairListPanel({ pools, isLoading }: PairListPanelProps) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<TimeFrame>('24H');
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'tvl' | 'fee/tvl' | 'apr'>('volume');
  const [showUSDCOnly, setShowUSDCOnly] = useState(false);

  // Filter pools
  const filteredPools = useMemo(() => {
    let filtered = pools;

    // Filter by protocol
    if (protocolFilter !== 'all') {
      filtered = filtered.filter(pool => {
        if (protocolFilter === 'dlmm') return pool.type === 'dlmm';
        if (protocolFilter === 'dbc') return pool.baseAsset.launchpad === 'met-dbc';
        if (protocolFilter === 'damm') return pool.type === 'damm' || pool.type === 'damm-v2';
        return true;
      });
    }

    // Filter for USDC pairs
    if (showUSDCOnly) {
      filtered = filtered.filter(pool =>
        pool.baseAsset.symbol.includes('USDC') ||
        pool.baseAsset.name.toLowerCase().includes('usdc')
      );
    }

    return filtered;
  }, [pools, protocolFilter, showUSDCOnly]);

  // Sort pools
  const sortedPools = useMemo(() => {
    return [...filteredPools].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return (b.volume24h || 0) - (a.volume24h || 0);
        case 'tvl':
          return (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0);
        case 'fee/tvl':
          // Calculate fee/TVL ratio
          const aRatio = (a.volume24h || 0) / (a.baseAsset.liquidity || 1);
          const bRatio = (b.volume24h || 0) / (b.baseAsset.liquidity || 1);
          return bRatio - aRatio;
        case 'apr':
          // Estimate APR from fee earnings if available
          return 0; // Placeholder for now
        default:
          return 0;
      }
    });
  }, [filteredPools, sortBy]);

  const formatNumber = (num: number | undefined) => {
    if (!num) return '$0';
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const calculateFeeToTvlRatio = (pool: Pool) => {
    const tvl = pool.baseAsset.liquidity || 1;
    const volume = pool.volume24h || 0;
    // Assume 0.3% fee average
    const fees = volume * 0.003;
    const ratio = (fees / tvl) * 100;
    return ratio.toFixed(2);
  };

  const getProtocolBadge = (pool: Pool) => {
    if (pool.type === 'dlmm') return { label: 'DLMM', variant: 'info' as const };
    if (pool.baseAsset.launchpad === 'met-dbc') return { label: 'DBC', variant: 'success' as const };
    if (pool.type === 'damm' || pool.type === 'damm-v2') return { label: 'DAMM', variant: 'warning' as const };
    return { label: 'OTHER', variant: 'default' as const };
  };

  const handlePairClick = (pool: Pool) => {
    router.push(`/pool/${pool.id}`);
  };

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border-light">
        <h2 className="text-lg font-semibold text-white mb-4">Pairs</h2>

        {/* Filters Row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Timeframe Filters */}
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

          {/* USDC Filter */}
          <button
            onClick={() => setShowUSDCOnly(!showUSDCOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showUSDCOnly
                ? 'bg-secondary text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            USDC Only
          </button>
        </div>

        {/* Protocol Filter */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {(['all', 'dlmm', 'dbc', 'damm'] as ProtocolFilter[]).map((protocol) => (
            <button
              key={protocol}
              onClick={() => setProtocolFilter(protocol)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                protocolFilter === protocol
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {protocol}
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
          <option value="fee/tvl">Fee/TVL Ratio</option>
          <option value="apr">APR</option>
        </select>
      </div>

      {/* Pool List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading pairs...</p>
          </div>
        ) : sortedPools.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No pairs found
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {sortedPools.map((pool) => {
              const protocolBadge = getProtocolBadge(pool);

              return (
                <button
                  key={pool.id}
                  onClick={() => handlePairClick(pool)}
                  className="w-full p-4 hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Pair Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {pool.baseAsset.icon ? (
                      <img
                        src={pool.baseAsset.icon}
                        alt={pool.baseAsset.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
                        {pool.baseAsset.symbol.slice(0, 2)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">
                          {pool.baseAsset.symbol}-SOL
                        </h3>
                        <Badge variant={protocolBadge.variant} className="text-[10px] px-1.5 py-0.5">
                          {protocolBadge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">
                        Pool {pool.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">TVL: </span>
                      <span className="text-white font-medium">
                        {formatNumber(pool.baseAsset.liquidity)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Volume: </span>
                      <span className="text-white font-medium">
                        {formatNumber(pool.volume24h)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Fee/TVL: </span>
                      <span className="text-success font-medium">
                        {calculateFeeToTvlRatio(pool)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Fee: </span>
                      <span className="text-warning font-medium">
                        {pool.type === 'dlmm' ? '0.01-1%' : '0.3%'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
