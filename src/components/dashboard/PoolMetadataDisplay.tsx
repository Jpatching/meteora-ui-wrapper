/**
 * Component to display pool metadata (binStep, baseFee)
 * Fetches REAL data from Meteora APIs
 */

'use client';

import { useEffect, useState } from 'react';
import { getPoolMetadata, formatPoolMetadata, PoolMetadata } from '@/lib/services/meteoraPoolMetadata';

interface PoolMetadataDisplayProps {
  poolAddress: string;
  poolType: string;
}

export function PoolMetadataDisplay({ poolAddress, poolType }: PoolMetadataDisplayProps) {
  const [metadata, setMetadata] = useState<PoolMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const poolMetadata = await getPoolMetadata(poolAddress);
        if (mounted) {
          setMetadata(poolMetadata);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Failed to fetch metadata for ${poolAddress}:`, error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [poolAddress]);

  if (isLoading) {
    return <span className="text-[10px] text-foreground-muted/50">...</span>;
  }

  const display = formatPoolMetadata(metadata);

  return (
    <span className="text-[10px] text-foreground-muted/70">
      {display}
    </span>
  );
}
