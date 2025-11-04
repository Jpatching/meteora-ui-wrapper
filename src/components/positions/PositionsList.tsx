'use client';

import { useState } from 'react';
import { PositionCard } from './PositionCard';
import { PositionWithPNL } from '@/lib/hooks/usePositions';
import { Select } from '@/components/ui/Select';

interface PositionsListProps {
  positions: PositionWithPNL[];
  loading?: boolean;
  onClaim?: (position: PositionWithPNL) => void;
  onClose?: (position: PositionWithPNL) => void;
  onViewDetails?: (position: PositionWithPNL) => void;
}

type SortOption = 'value' | 'pnl' | 'pnlPercent' | 'fees' | 'health';
type FilterOption = 'all' | 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha-vault';

export function PositionsList({
  positions,
  loading = false,
  onClaim,
  onClose,
  onViewDetails,
}: PositionsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Filter positions
  const filteredPositions = positions.filter(pos => {
    if (filterBy === 'all') return true;
    return pos.type === filterBy;
  });

  // Sort positions
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.currentValue - a.currentValue;
      case 'pnl':
        return b.pnl - a.pnl;
      case 'pnlPercent':
        return b.pnlPercent - a.pnlPercent;
      case 'fees':
        return b.unclaimedFeesUSD - a.unclaimedFeesUSD;
      case 'health':
        return b.healthScore - a.healthScore;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-background-secondary rounded-lg p-6 animate-pulse"
          >
            <div className="space-y-3">
              <div className="h-4 bg-background-tertiary rounded w-24" />
              <div className="h-8 bg-background-tertiary rounded w-48" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-background-tertiary rounded" />
                <div className="h-16 bg-background-tertiary rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 bg-background-secondary rounded-lg border-2 border-dashed border-border">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">No Positions Yet</h3>
        <p className="text-foreground-muted">
          Create your first pool to start tracking positions and PNL
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="text-sm text-foreground-muted">
          Showing {sortedPositions.length} of {positions.length} positions
        </div>

        <div className="flex gap-2">
          {/* Filter */}
          <Select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            label=""
            className="w-40"
          >
            <option value="all">All Protocols</option>
            <option value="dlmm">DLMM</option>
            <option value="damm-v2">DAMM v2</option>
            <option value="damm-v1">DAMM v1</option>
            <option value="dbc">DBC</option>
            <option value="alpha-vault">Alpha Vault</option>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            label=""
            className="w-40"
          >
            <option value="value">Sort by Value</option>
            <option value="pnl">Sort by PNL</option>
            <option value="pnlPercent">Sort by PNL %</option>
            <option value="fees">Sort by Fees</option>
            <option value="health">Sort by Health</option>
          </Select>
        </div>
      </div>

      {/* Position Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedPositions.map(position => (
          <PositionCard
            key={position.id}
            position={position}
            onClaim={onClaim}
            onClose={onClose}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
