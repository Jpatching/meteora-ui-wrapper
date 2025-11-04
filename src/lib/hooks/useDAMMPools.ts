/**
 * Hook for fetching DAMM pool data from Meteora API
 * Supports both DAMM v1 and DAMM v2
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/contexts/NetworkContext';
import { fetchAllDAMMPools, fetchDAMMv2Pools, DAMMPool } from '@/lib/services/dammApi';

export interface UseDAMMPoolsOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
  version?: 'v1' | 'v2' | 'all';
}

/**
 * Fetch all DAMM pools (v1 + v2)
 */
export function useDAMMPools(options: UseDAMMPoolsOptions = {}) {
  const { network } = useNetwork();
  const {
    refetchInterval = false, // Default: no auto-refresh
    enabled = true,
    version = 'all',
  } = options;

  return useQuery({
    queryKey: ['damm-pools', network, version],
    queryFn: async () => {
      try {
        const pools = await fetchAllDAMMPools({ network, version });
        return pools;
      } catch (error) {
        console.error('🚨 useDAMMPools error:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    refetchInterval,
    enabled,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Fetch only DAMM v2 pools
 */
export function useDAMMv2Pools(options: Omit<UseDAMMPoolsOptions, 'version'> = {}) {
  const { network } = useNetwork();
  const {
    refetchInterval = false,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['damm-v2-pools', network],
    queryFn: async () => {
      try {
        const pools = await fetchDAMMv2Pools({ network });
        return pools;
      } catch (error) {
        console.error('🚨 useDAMMv2Pools error:', error);
        return [];
      }
    },
    refetchInterval,
    enabled,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000,
  });
}
