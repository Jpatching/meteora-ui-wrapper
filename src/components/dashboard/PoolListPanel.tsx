/**
 * Pool List Panel
 * Left panel showing scrollable list of pools with search
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui';
import { CompactPoolCard } from './CompactPoolCard';
import { FilterDropdown, PoolFilter } from './FilterDropdown';
import { Pool } from '@/lib/jupiter/types';

export interface PoolListPanelProps {
  pools: Pool[];
  selectedPoolId?: string;
  onSelectPool: (pool: Pool) => void;
  isLoading?: boolean;
}

export function PoolListPanel({
  pools,
  selectedPoolId,
  onSelectPool,
  isLoading = false,
}: PoolListPanelProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<PoolFilter>('all');

  // Filter pools by type and search term
  const filteredPools = useMemo(() => {
    let filtered = pools;

    // Calculate 7 days ago timestamp for "recent" filtering
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Apply pool filter
    if (filter !== 'all') {
      filtered = filtered.filter((pool) => {
        if (filter === 'my-pools') {
          // TODO: Implement user pool detection
          return false; // For now, no pools match "my-pools"
        }

        // For protocol filters, only show pools created in last 7 days
        const poolCreatedAt = new Date(pool.createdAt).getTime();
        const isRecent = poolCreatedAt >= sevenDaysAgo;

        if (filter === 'met-dbc') {
          return pool.baseAsset.launchpad === 'met-dbc' && isRecent;
        }
        if (filter === 'dlmm') {
          return pool.type === 'dlmm' && isRecent;
        }
        if (filter === 'damm') {
          return (pool.type === 'damm' || pool.type === 'damm-v1' || pool.type === 'damm-v2') && isRecent;
        }
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((pool) =>
        pool.baseAsset.symbol.toLowerCase().includes(search) ||
        pool.baseAsset.name.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [pools, filter, searchTerm]);

  return (
    <div className="flex flex-col h-full border border-border-light rounded-xl overflow-hidden bg-background">
      {/* Header with Filter and Search */}
      <div className="p-4 border-b border-border-light space-y-3">
        {/* Filter Dropdown */}
        <FilterDropdown value={filter} onChange={setFilter} />

        {/* Search */}
        <Input
          placeholder="Search pools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        {/* Pool Count */}
        <div className="text-xs text-foreground-muted">
          {filteredPools.length} {filteredPools.length === 1 ? 'pool' : 'pools'}
        </div>
      </div>

      {/* Pool List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-foreground-muted text-sm">Loading pools...</p>
          </div>
        )}

        {!isLoading && filteredPools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground-muted">No pools found</p>
          </div>
        )}

        {!isLoading && filteredPools.map((pool) => (
          <CompactPoolCard
            key={pool.id}
            pool={pool}
            isSelected={pool.id === selectedPoolId}
            onClick={() => onSelectPool(pool)}
          />
        ))}
      </div>
    </div>
  );
}
