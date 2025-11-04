/**
 * Pool Statistics Panel - Displays key pool metrics
 */

'use client';

import { Pool } from '@/lib/jupiter/types';

interface PoolStatisticsPanelProps {
  pool: Pool;
}

export function PoolStatisticsPanel({ pool }: PoolStatisticsPanelProps) {
  const formatNumber = (num: number | undefined) => {
    if (!num) return '$0';
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="bg-background border border-border-light rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Pool Statistics</h3>

      <div className="space-y-4">
        {/* TVL */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Total Value Locked</div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(pool.baseAsset.liquidity)}
          </div>
        </div>

        {/* Volume 24h */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Volume (24h)</div>
          <div className="text-xl font-semibold text-white">
            {formatNumber(pool.volume24h)}
          </div>
        </div>

        {/* Fees 24h */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Fees (24h)</div>
          <div className="text-lg font-semibold text-success">
            {formatNumber(pool.volume24h ? pool.volume24h * 0.003 : 0)}
          </div>
        </div>

        {/* Fee Tier */}
        <div className="flex items-center justify-between py-3 border-t border-border-light">
          <span className="text-sm text-gray-400">Fee Tier</span>
          <span className="text-sm font-semibold text-white">
            {pool.type === 'dlmm' ? '0.01-1%' : '0.3%'}
          </span>
        </div>

        {/* Pool Type */}
        <div className="flex items-center justify-between py-3 border-t border-border-light">
          <span className="text-sm text-gray-400">Protocol</span>
          <span className="text-sm font-semibold text-primary uppercase">
            {pool.type === 'dlmm' ? 'DLMM' : pool.baseAsset.launchpad === 'met-dbc' ? 'DBC' : 'POOL'}
          </span>
        </div>

        {/* Created At */}
        {pool.createdAt && (
          <div className="flex items-center justify-between py-3 border-t border-border-light">
            <span className="text-sm text-gray-400">Created</span>
            <span className="text-sm font-semibold text-white">
              {new Date(pool.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Pool Address */}
        <div className="py-3 border-t border-border-light">
          <div className="text-xs text-gray-400 mb-2">Pool Address</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs text-white truncate bg-gray-800 px-3 py-2 rounded">
              {pool.id}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pool.id);
              }}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              title="Copy address"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* External Links */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-light">
          <a
            href={`https://solscan.io/account/${pool.id}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-center text-xs text-gray-300 transition-colors"
          >
            Solscan
          </a>
          <a
            href={`https://app.meteora.ag/pools/${pool.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-center text-xs text-gray-300 transition-colors"
          >
            Meteora
          </a>
        </div>
      </div>
    </div>
  );
}
