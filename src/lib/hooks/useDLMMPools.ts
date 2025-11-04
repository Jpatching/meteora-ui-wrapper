/**
 * Hook for fetching DLMM pool data from Meteora API
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/contexts/NetworkContext';
import { fetchAllDLMMPools, MeteoraPool, sortPools } from '@/lib/services/meteoraApi';

export interface UseDLMMPoolsOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
  sortBy?: 'liquidity' | 'volume' | 'apr' | 'fees';
}

/**
 * Fetch all DLMM pools
 */
export function useDLMMPools(options: UseDLMMPoolsOptions = {}) {
  const { network } = useNetwork();
  const {
    refetchInterval = 60000, // 60 seconds default
    enabled = true,
    sortBy = 'liquidity',
  } = options;

  return useQuery({
    queryKey: ['dlmm-pools', network, sortBy],
    queryFn: async () => {
      try {
        const pools = await fetchAllDLMMPools({ network });
        return sortPools(pools, sortBy);
      } catch (error) {
        console.error('🚨 useDLMMPools error:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    refetchInterval,
    enabled,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2, // Retry failed requests 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });
}

/**
 * Get a specific pool by address
 */
export function useDLMMPool(poolAddress: string | null) {
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['dlmm-pool', poolAddress, network],
    queryFn: async () => {
      if (!poolAddress) return null;

      const pools = await fetchAllDLMMPools({ network });
      return pools.find(p => p.address === poolAddress) || null;
    },
    enabled: !!poolAddress,
    staleTime: 30000,
  });
}

/**
 * Filter DLMM pools by token
 */
export function useDLMMPoolsByToken(tokenAddress: string | null) {
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['dlmm-pools-by-token', tokenAddress, network],
    queryFn: async () => {
      if (!tokenAddress) return [];

      const pools = await fetchAllDLMMPools({ network });
      return pools.filter(
        p =>
          p.mint_x.toLowerCase() === tokenAddress.toLowerCase() ||
          p.mint_y.toLowerCase() === tokenAddress.toLowerCase()
      );
    },
    enabled: !!tokenAddress,
    staleTime: 30000,
  });
}
