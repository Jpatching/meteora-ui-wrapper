/**
 * Details Panel
 * Right sidebar showing pool details and management options
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { QuickStats } from './QuickStats';
import { PoolInfo } from './PoolInfo';
import { PoolManagementWidget } from './PoolManagementWidget';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';

export interface DetailsPanelProps {
  pool: Pool;
  isUserPool?: boolean;
}

export function DetailsPanel({ pool, isUserPool = false }: DetailsPanelProps) {
  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto p-4 bg-background border border-border-light rounded-xl">
      {/* Token Description */}
      {pool.baseAsset.name && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {pool.baseAsset.symbol}
          </h3>
          <p className="text-sm text-foreground-secondary">
            {pool.baseAsset.name}
          </p>
        </div>
      )}

      {/* Social Links */}
      {(pool.baseAsset.twitter || pool.baseAsset.telegram || pool.baseAsset.website) && (
        <div className="pt-3 border-t border-border-primary">
          <h4 className="text-sm font-semibold text-foreground mb-2">Social Links</h4>
          <div className="flex flex-wrap gap-2">
            {pool.baseAsset.twitter && (
              <a
                href={pool.baseAsset.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </a>
            )}
            {pool.baseAsset.telegram && (
              <a
                href={pool.baseAsset.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Telegram
              </a>
            )}
            {pool.baseAsset.website && (
              <a
                href={pool.baseAsset.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            )}
          </div>
        </div>
      )}

      {/* Token Metrics */}
      <div className="pt-3 border-t border-border-primary">
        <h4 className="text-sm font-semibold text-foreground mb-3">Token Metrics</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground-muted">Created</span>
            <span className="font-semibold text-foreground">
              {formatTimeAgo(new Date(pool.createdAt))}
            </span>
          </div>
          {pool.baseAsset.holderCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-foreground-muted">Holders</span>
              <span className="font-semibold text-foreground font-mono">
                {formatNumber(pool.baseAsset.holderCount)}
              </span>
            </div>
          )}
          {pool.baseAsset.stats24h && (
            <>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Transactions (24h)</span>
                <span className="font-semibold text-foreground font-mono">
                  {formatNumber((pool.baseAsset.stats24h.numBuys || 0) + (pool.baseAsset.stats24h.numSells || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Traders (24h)</span>
                <span className="font-semibold text-foreground font-mono">
                  {pool.baseAsset.stats24h.numTraders ? formatNumber(pool.baseAsset.stats24h.numTraders) : 'N/A'}
                </span>
              </div>
            </>
          )}
          {pool.baseAsset.totalSupply !== undefined && (
            <div className="flex justify-between">
              <span className="text-foreground-muted">Total Supply</span>
              <span className="font-semibold text-foreground font-mono">
                {formatNumber(pool.baseAsset.totalSupply)}
              </span>
            </div>
          )}
          {pool.baseAsset.circSupply !== undefined && (
            <div className="flex justify-between">
              <span className="text-foreground-muted">Circulating Supply</span>
              <span className="font-semibold text-foreground font-mono">
                {formatNumber(pool.baseAsset.circSupply)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h4>
        <QuickStats pool={pool} />
      </div>

      {/* Add Liquidity CTA */}
      {!isUserPool && (
        <div className="pt-4 border-t border-border-primary">
          <Link href={`/dlmm/seed-liquidity?pool=${pool.id}`}>
            <Button variant="primary" size="lg" className="w-full">
              Add Liquidity
            </Button>
          </Link>
          <p className="text-xs text-foreground-muted mt-2 text-center">
            Provide liquidity to earn trading fees
          </p>
        </div>
      )}

      {/* User Pool Management */}
      {isUserPool && (
        <div className="pt-4 border-t border-border-primary">
          <PoolManagementWidget
            pool={pool}
            position={{
              liquidity: 0, // TODO: Get from user positions
              feesEarned: 0,
            }}
            protocol={pool.baseAsset.launchpad === 'met-dbc' ? 'dbc' : 'dlmm'}
          />
        </div>
      )}

      {/* Pool Info */}
      <PoolInfo pool={pool} />

      {/* Links */}
      <div className="pt-4 border-t border-border-primary space-y-2">
        <a
          href={`https://solscan.io/account/${pool.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-primary hover:underline"
        >
          View on Solscan →
        </a>
        {pool.baseAsset.launchpad === 'met-dbc' && (
          <a
            href={`https://app.meteora.ag/pools/${pool.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            View on Meteora →
          </a>
        )}
      </div>

      {/* Advanced Position Analytics */}
      <div className="pt-4 border-t border-border-primary">
        <Link href={`/position/${pool.id}`}>
          <Button variant="secondary" size="md" className="w-full">
            Advanced Position Analytics →
          </Button>
        </Link>
        <p className="text-xs text-foreground-muted mt-2 text-center">
          View detailed metrics, fees, and performance analytics
        </p>
      </div>
    </div>
  );
}
