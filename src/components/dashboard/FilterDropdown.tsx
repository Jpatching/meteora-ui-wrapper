/**
 * Filter Dropdown Component
 * Allows filtering pools by type and showing user's pools
 */

'use client';

import { Select } from '@/components/ui';
import { useWallet } from '@solana/wallet-adapter-react';

export type PoolFilter = 'all' | 'my-pools' | 'met-dbc' | 'dlmm' | 'damm';

export interface FilterDropdownProps {
  value: PoolFilter;
  onChange: (filter: PoolFilter) => void;
}

export function FilterDropdown({ value, onChange }: FilterDropdownProps) {
  const { publicKey } = useWallet();

  return (
    <div className="mb-4">
      <label className="text-xs text-foreground-muted mb-2 block">Filter Pools</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as PoolFilter)}
        className="w-full"
      >
        <option value="all">All Pools</option>
        {publicKey && <option value="my-pools">My Pools</option>}
        <option value="met-dbc">Meteora DBC Only</option>
        <option value="dlmm">DLMM Only</option>
        <option value="damm">DAMM Only</option>
      </Select>
    </div>
  );
}
