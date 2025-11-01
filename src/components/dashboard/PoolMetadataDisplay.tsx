/**
 * Component to display pool metadata (binStep, baseFee)
 * Shows smart defaults immediately, then fetches real data in background
 */

'use client';

import { useEffect, useState } from 'react';
import { fetchPoolDetails, formatPoolDetails } from '@/lib/meteora/poolDetails';

interface PoolMetadataDisplayProps {
  poolAddress: string;
  poolType: string;
}

export function PoolMetadataDisplay({ poolAddress, poolType }: PoolMetadataDisplayProps) {
  // Start with smart defaults based on pool type
  const getDefaultDisplay = () => {
    if (poolType === 'dlmm') return 'binStep: 10 | fee: 0.25%';
    if (poolType.startsWith('damm')) return 'fee: 0.25%';
    return 'fee: 0.30%';
  };

  const [display, setDisplay] = useState<string>(getDefaultDisplay());
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      if (isFetching) return;
      setIsFetching(true);

      try {
        const details = await fetchPoolDetails(poolAddress, poolType);
        if (mounted) {
          const formatted = formatPoolDetails(details, poolType);
          setDisplay(formatted);
        }
      } catch (error) {
        console.error(`Failed to fetch pool details for ${poolAddress}:`, error);
        // Keep showing default on error
      } finally {
        if (mounted) {
          setIsFetching(false);
        }
      }
    }

    // Fetch in background after a small delay to avoid overwhelming the RPC
    const timer = setTimeout(() => {
      fetchData();
    }, Math.random() * 1000); // Stagger requests

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [poolAddress, poolType, isFetching]);

  return (
    <span className="text-[10px] text-foreground-muted/70">
      {display}
    </span>
  );
}
