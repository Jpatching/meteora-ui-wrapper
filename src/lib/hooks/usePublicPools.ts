/**
 * Hook for fetching public pool data from Jupiter API
 * Provides access to recent launches, graduating tokens, and graduated pools
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { JupiterQueries } from '@/lib/jupiter/queries';
import { TokenListTimeframe, Launchpad } from '@/lib/jupiter/types';

export interface PublicPoolsFilters {
  /**
   * Filter by launchpad (e.g., 'met-dbc' for Meteora DBC)
   */
  launchpad?: string[];
  /**
   * Minimum market cap filter
   */
  minMarketCap?: number;
  /**
   * Search query for token name/symbol
   */
  search?: string;
}

export interface UsePublicPoolsOptions {
  /**
   * Timeframe for pool data (5m, 1h, 6h, 24h)
   */
  timeframe?: TokenListTimeframe;
  /**
   * Filters to apply
   */
  filters?: PublicPoolsFilters;
  /**
   * Auto-refresh interval in milliseconds (default: 30000ms = 30s)
   * Set to false to disable auto-refresh
   */
  refetchInterval?: number | false;
  /**
   * Whether to enable the query (default: true)
   */
  enabled?: boolean;
}

/**
 * Fetch recent token launches
 */
export function useRecentPools(options: UsePublicPoolsOptions = {}) {
  const {
    timeframe = '24h',
    filters,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  return useQuery({
    ...JupiterQueries.gemsTokenList({
      recent: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
    }),
    refetchInterval,
    enabled,
  });
}

/**
 * Fetch graduating tokens (near bonding curve completion)
 */
export function useGraduatingPools(options: UsePublicPoolsOptions = {}) {
  const {
    timeframe = '24h',
    filters,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  return useQuery({
    ...JupiterQueries.gemsTokenList({
      aboutToGraduate: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
    }),
    refetchInterval,
    enabled,
  });
}

/**
 * Fetch graduated pools (completed bonding curve, migrated to AMM)
 */
export function useGraduatedPools(options: UsePublicPoolsOptions = {}) {
  const {
    timeframe = '24h',
    filters,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  return useQuery({
    ...JupiterQueries.gemsTokenList({
      graduated: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
    }),
    refetchInterval,
    enabled,
  });
}

/**
 * Fetch all pool categories at once
 */
export function useAllPublicPools(options: UsePublicPoolsOptions = {}) {
  const {
    timeframe = '24h',
    filters,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  return useQuery({
    ...JupiterQueries.gemsTokenList({
      recent: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
      aboutToGraduate: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
      graduated: {
        timeframe,
        filters: {
          partnerConfigs: filters?.launchpad,
        },
      },
    }),
    refetchInterval,
    enabled,
  });
}

/**
 * Fetch Meteora DBC pools specifically
 * Note: We fetch all pools and filter client-side since the API filter
 * doesn't seem to work reliably for partnerConfigs
 */
export function useMeteoraPools(options: Omit<UsePublicPoolsOptions, 'filters'> = {}) {
  const { data, ...rest } = useAllPublicPools({
    ...options,
    // Don't pass filters to API - we'll filter client-side
  });

  // Filter for Meteora DBC pools only
  const filteredData = data ? {
    recent: {
      ...data.recent,
      pools: data.recent?.pools?.filter(p => p.baseAsset.launchpad === Launchpad.DBC) || [],
    },
    aboutToGraduate: {
      ...data.aboutToGraduate,
      pools: data.aboutToGraduate?.pools?.filter(p => p.baseAsset.launchpad === Launchpad.DBC) || [],
    },
    graduated: {
      ...data.graduated,
      pools: data.graduated?.pools?.filter(p => p.baseAsset.launchpad === Launchpad.DBC) || [],
    },
  } : undefined;

  return {
    data: filteredData,
    ...rest,
  };
}

/**
 * Fetch detailed information for a specific pool/token
 */
export function usePoolInfo(tokenAddress: string, enabled: boolean = true) {
  return useQuery({
    ...JupiterQueries.tokenInfo({ id: tokenAddress }),
    refetchInterval: 60000, // Refresh every 60 seconds
    enabled: enabled && !!tokenAddress,
  });
}
