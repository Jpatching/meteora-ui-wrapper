/**
 * Details Panel with Tabs
 * Enhanced right sidebar with tabbed interface for Overview, Add Liquidity, and Positions
 */

'use client';

import { useState } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { QuickStats } from './QuickStats';
import { PoolInfo } from './PoolInfo';
import { PoolManagementWidget } from './PoolManagementWidget';
import { AddLiquidityPanel } from '@/components/liquidity';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { formatNumber } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';
import { motion } from 'framer-motion';
import { useUserPositionsForPool } from '@/lib/hooks/useUserPositions';

export interface DetailsPanelTabbedProps {
  pool: Pool;
  isUserPool?: boolean;
}

type Tab = 'overview' | 'liquidity' | 'positions';

export function DetailsPanelTabbed({ pool, isUserPool = false }: DetailsPanelTabbedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: '📊' },
    { id: 'liquidity' as Tab, label: 'Add Liquidity', icon: '💧' },
    { id: 'positions' as Tab, label: 'Positions', icon: '📈' },
  ];

  return (
    <div className="flex flex-col h-full bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-border-primary bg-gray-900/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex-1 px-4 py-3 text-sm font-semibold transition-all
                ${isActive
                  ? 'text-primary'
                  : 'text-foreground-muted hover:text-foreground'
                }
              `}
            >
              <span className="flex items-center justify-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <OverviewTab pool={pool} isUserPool={isUserPool} />
        )}

        {activeTab === 'liquidity' && (
          <LiquidityTab pool={pool} />
        )}

        {activeTab === 'positions' && (
          <PositionsTab pool={pool} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Content
function OverviewTab({ pool, isUserPool }: { pool: Pool; isUserPool: boolean }) {
  return (
    <div className="space-y-4">
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
          <Button variant="secondary" size="sm" className="w-full">
            Advanced Analytics →
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Liquidity Tab Content
function LiquidityTab({ pool }: { pool: Pool }) {
  // Extract current price from pool data
  const currentPrice = (pool as any).price || 0;

  // Get bin step and base fee from pool data (DLMM-specific fields)
  const binStep = (pool as any).binStep || 25; // Default to 25 if not available
  const baseFeeStr = (pool as any).base_fee_percentage || (pool as any).baseFeePercentage;
  const baseFee = baseFeeStr ? parseFloat(baseFeeStr) : undefined;

  return (
    <div>
      <AddLiquidityPanel
        poolAddress={pool.id}
        tokenXMint={pool.baseAsset.id}
        tokenYMint={(pool as any).quoteAsset?.id || 'So11111111111111111111111111111111111111112'}
        tokenXSymbol={pool.baseAsset.symbol}
        tokenYSymbol={(pool as any).quoteAsset?.symbol || 'SOL'}
        currentPrice={currentPrice}
        binStep={binStep}
        baseFee={baseFee}
      />
    </div>
  );
}

// Positions Tab Content
function PositionsTab({ pool }: { pool: Pool }) {
  const { data: positions, isLoading } = useUserPositionsForPool(pool.id);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm text-foreground-muted">Loading positions...</p>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Active Positions</h4>
          <div className="text-sm text-foreground-muted text-center py-8">
            <p>No active positions found</p>
            <p className="mt-2">Add liquidity to create a position</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Active Positions ({positions.length})
        </h4>

        <div className="space-y-3">
          {positions.map((position) => (
            <div
              key={position.address}
              className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Position Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">
                  {position.baseSymbol} / {position.quoteSymbol}
                </span>
                <span className="text-xs text-gray-400">
                  Bins {position.lowerBinId} - {position.upperBinId}
                </span>
              </div>

              {/* Liquidity Amounts */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{position.baseSymbol}</span>
                  <span className="font-mono text-white">
                    {position.baseAmount.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{position.quoteSymbol}</span>
                  <span className="font-mono text-white">
                    {position.quoteAmount.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Unclaimed Fees */}
              {(position.unclaimedFeesBase > 0 || position.unclaimedFeesQuote > 0) && (
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Unclaimed Fees</span>
                  </div>
                  <div className="space-y-1">
                    {position.unclaimedFeesBase > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{position.baseSymbol}</span>
                        <span className="font-mono text-success">
                          +{position.unclaimedFeesBase.toFixed(6)}
                        </span>
                      </div>
                    )}
                    {position.unclaimedFeesQuote > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{position.quoteSymbol}</span>
                        <span className="font-mono text-success">
                          +{position.unclaimedFeesQuote.toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-700 mt-3 flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  Add Liquidity
                </button>
                <button className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors">
                  Remove
                </button>
                {(position.unclaimedFeesBase > 0 || position.unclaimedFeesQuote > 0) && (
                  <button className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-success/10 text-success hover:bg-success/20 transition-colors">
                    Claim
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
