/**
 * Pool Explorer Component
 * Displays a grid of public pools with filtering and sorting
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { useMeteoraPools } from '@/lib/hooks/usePublicPools';
import type { Pool } from '@/lib/jupiter/types';

interface PoolCardProps {
  pool: Pool;
  onClick: () => void;
}

function PoolCard({ pool, onClick }: PoolCardProps) {
  const { baseAsset } = pool;
  const priceChange = baseAsset.stats24h?.priceChange || 0;
  const isPositive = priceChange >= 0;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Token Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {baseAsset.icon && (
              <img
                src={baseAsset.icon}
                alt={baseAsset.symbol}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <div className="font-bold text-lg">{baseAsset.symbol}</div>
              <div className="text-xs text-foreground-muted">{baseAsset.name}</div>
            </div>
          </div>

          {/* Launchpad Badge */}
          {baseAsset.launchpad && (
            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
              {baseAsset.launchpad === 'met-dbc' ? 'Meteora DBC' : baseAsset.launchpad}
            </span>
          )}
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs text-foreground-muted">Price</div>
            <div className="font-semibold">
              ${baseAsset.usdPrice ? baseAsset.usdPrice.toFixed(6) : '0.00'}
            </div>
          </div>
          <div>
            <div className="text-xs text-foreground-muted">24h Change</div>
            <div className={`font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-foreground-muted">MCap:</span>{' '}
            <span className="font-medium">
              ${baseAsset.mcap ? (baseAsset.mcap / 1000).toFixed(1) : '0'}K
            </span>
          </div>
          <div>
            <span className="text-foreground-muted">Vol:</span>{' '}
            <span className="font-medium">
              ${pool.volume24h ? (pool.volume24h / 1000).toFixed(1) : '0'}K
            </span>
          </div>
          <div>
            <span className="text-foreground-muted">Holders:</span>{' '}
            <span className="font-medium">{baseAsset.holderCount || 0}</span>
          </div>
          {pool.bondingCurve !== undefined && (
            <div>
              <span className="text-foreground-muted">Curve:</span>{' '}
              <span className="font-medium">{pool.bondingCurve.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Audit Indicators */}
        {baseAsset.audit && (
          <div className="flex gap-2 mt-3 text-xs">
            {baseAsset.audit.mintAuthorityDisabled && (
              <span className="text-success">✓ Mint</span>
            )}
            {baseAsset.audit.freezeAuthorityDisabled && (
              <span className="text-success">✓ Freeze</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface PoolExplorerProps {
  onSelectPool?: (pool: Pool) => void;
}

export function PoolExplorer({ onSelectPool }: PoolExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'recent' | 'graduating' | 'graduated'>('recent');

  const { data, isLoading, error } = useMeteoraPools({
    timeframe: '24h',
    refetchInterval: 30000, // 30 seconds
  });

  // Get pools from selected category
  const pools = data?.[selectedCategory]?.pools || [];

  // Filter pools by search term
  const filteredPools = pools.filter((pool) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pool.baseAsset.symbol.toLowerCase().includes(search) ||
      pool.baseAsset.name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Public Pool Explorer</CardTitle>
          <div className="text-sm text-foreground-muted">
            Explore Meteora DBC pools and token launches
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search by token name or symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'recent' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory('recent')}
            >
              Recent Launches
            </Button>
            <Button
              variant={selectedCategory === 'graduating' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory('graduating')}
            >
              Graduating
            </Button>
            <Button
              variant={selectedCategory === 'graduated' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory('graduated')}
            >
              Graduated
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-foreground-muted">Loading pools...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-error/20">
          <CardContent className="py-6 text-center">
            <p className="text-error font-medium mb-2">Failed to load pools</p>
            <p className="text-sm text-foreground-muted">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-3 block">🔍</span>
            <p className="text-foreground-muted">
              {searchTerm ? 'No pools found matching your search' : 'No pools available'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pool Grid */}
      {!isLoading && !error && filteredPools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              onClick={() => onSelectPool?.(pool)}
            />
          ))}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && !error && filteredPools.length > 0 && (
        <div className="text-center text-sm text-foreground-muted">
          Showing {filteredPools.length} {filteredPools.length === 1 ? 'pool' : 'pools'}
        </div>
      )}
    </div>
  );
}
