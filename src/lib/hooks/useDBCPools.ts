/**
 * Hook for fetching DBC pool data using the Meteora SDK
 * Fetches virtual bonding curve pools from on-chain
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/contexts/NetworkContext';
import { fetchDBCPools, DBCPool } from '@/lib/services/dbcApi';

export interface UseDBCPoolsOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
}

/**
 * Fetch all DBC pools using the SDK
 * Uses DynamicBondingCurveClient.state.getPools()
 */
export function useDBCPools(options: UseDBCPoolsOptions = {}) {
  const { network } = useNetwork();
  const {
    refetchInterval = false, // Default: no auto-refresh (on-chain is expensive)
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['dbc-pools', network],
    queryFn: async () => {
      try {
        const pools = await fetchDBCPools({ network });
        return pools;
      } catch (error) {
        console.error('🚨 useDBCPools error:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    refetchInterval,
    enabled,
    staleTime: 60000, // Consider data stale after 60 seconds
    retry: 1, // Only retry once (on-chain queries are expensive)
    retryDelay: 2000,
  });
}
