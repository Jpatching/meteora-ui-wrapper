/**
 * Component to display pool metadata (binStep, baseFee)
 * Fetches REAL data from Meteora SDK using usePoolMetadata hook
 */

'use client';

import { usePoolMetadata } from '@/lib/hooks/usePoolMetadata';

interface PoolMetadataDisplayProps {
  poolAddress: string;
  poolType: string;
}

export function PoolMetadataDisplay({ poolAddress, poolType }: PoolMetadataDisplayProps) {
  const { binStep, baseFee, isLoading, error } = usePoolMetadata(poolAddress, poolType);

  if (isLoading) {
    return <span className="text-[10px] text-foreground-muted/50">Loading...</span>;
  }

  if (error) {
    return <span className="text-[10px] text-foreground-muted/50">-</span>;
  }

  // DLMM pools: show binStep and fee
  if (poolType === 'dlmm' && binStep !== undefined && baseFee !== undefined) {
    return (
      <span className="text-[10px] text-foreground-muted/70">
        binStep: {binStep} | fee: {(baseFee / 100).toFixed(2)}%
      </span>
    );
  }

  // DAMM pools: show fee only
  if (poolType.startsWith('damm') && baseFee !== undefined) {
    return (
      <span className="text-[10px] text-foreground-muted/70">
        fee: {(baseFee / 100).toFixed(2)}%
      </span>
    );
  }

  // No data available
  return <span className="text-[10px] text-foreground-muted/50">-</span>;
}
