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
  limit?: number; // Limit number of pools to fetch
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
    limit = 100, // Default to top 100 pools
  } = options;

  return useQuery({
    queryKey: ['dlmm-pools', network, sortBy, limit],
    queryFn: async () => {
      try {
        const pools = await fetchAllDLMMPools({ network, limit });
        return sortPools(pools, sortBy);
      } catch (error) {
        console.error('🚨 useDLMMPools error:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    refetchInterval,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data instantly
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 2, // Retry failed requests 2 times
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: 'always', // Always check for fresh data on mount
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
