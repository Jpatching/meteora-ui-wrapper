/**
 * Hook to fetch pool details from Meteora SDK
 */

'use client';

import { useState, useEffect } from 'react';
import { fetchPoolDetails, formatPoolDetails, type PoolDetails } from '@/lib/meteora/poolDetails';

export function usePoolDetails(
  poolAddress: string,
  poolType: string,
  network: 'mainnet-beta' | 'devnet' | 'localnet' = 'mainnet-beta'
) {
  const [details, setDetails] = useState<PoolDetails>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDetails() {
      try {
        const poolDetails = await fetchPoolDetails(poolAddress, poolType, network);
        if (mounted) {
          setDetails(poolDetails);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load pool details:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [poolAddress, poolType, network]);

  const formattedDetails = formatPoolDetails(details, poolType);

  return { details, formattedDetails, isLoading };
}
