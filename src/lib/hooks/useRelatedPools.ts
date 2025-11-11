import { useState, useEffect } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { useBackendDLMMPools, useBackendDAMMPools } from './useBackendPools';
import { enrichPoolsWithMetadata } from '@/lib/services/tokenMetadata';

interface UseRelatedPoolsOptions {
  currentPool: Pool | null;
  network: 'mainnet-beta' | 'devnet';
  limit?: number;
}

interface RelatedPoolsResult {
  pools: Pool[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches pools related to the current pool (sharing base or quote token)
 * Uses backend database hooks with Redis caching for fast lookups
 */
export function useRelatedPools({
  currentPool,
  network,
  limit = 20,
}: UseRelatedPoolsOptions): RelatedPoolsResult {
  const { data: dlmmPools = [], isLoading: dlmmLoading, error: dlmmError } = useBackendDLMMPools(network);
  const { data: dammPools = [], isLoading: dammLoading, error: dammError } = useBackendDAMMPools(network);

  const [pools, setPools] = useState<Pool[]>([]);

  useEffect(() => {
    if (!currentPool || dlmmLoading || dammLoading) {
      return;
    }

    // Import transformation functions and enrich with metadata
    const transformBackendPools = async () => {
      try {
        const { transformBackendPoolToPool } = await import('./useBackendPools');

        // Transform backend pools to Pool format
        const dlmmTransformed = dlmmPools.map((p: any) => transformBackendPoolToPool(p, 'dlmm'));
        const dammTransformed = dammPools.map((p: any) => transformBackendPoolToPool(p, 'damm-v2'));

        const allPools: Pool[] = [...dlmmTransformed, ...dammTransformed];

        // Filter for pools that share the SAME BASE TOKEN ONLY (not quote token)
        // Example: TRUMP-USDC pool should show TRUMP-SOL, TRUMP-BONK, etc. (all TRUMP pools)
        const related = allPools.filter((pool) => {
          // Skip the current pool itself
          if (pool.id === currentPool.id) return false;

          // Only show pools that have the same base token
          // This means TRUMP-USDC will show: TRUMP-SOL, TRUMP-BONK, etc.
          // NOT: YZY-USDC, LIBRA-USDC (which share quote token)
          const sharesBaseToken =
            pool.baseAsset.id === currentPool.baseAsset.id ||
            pool.quoteAsset?.id === currentPool.baseAsset.id;

          return sharesBaseToken;
        });

        // Sort by TVL descending
        related.sort((a, b) => (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0));

        // Limit results
        const limited = related.slice(0, limit);

        // Enrich with token metadata (logos, etc.)
        const enriched = await enrichPoolsWithMetadata(limited);
        setPools(enriched);
      } catch (err) {
        console.error('Error transforming related pools:', err);
      }
    };

    transformBackendPools();
  }, [currentPool?.id, dlmmPools, dammPools, limit, dlmmLoading, dammLoading]);

  return {
    pools,
    loading: dlmmLoading || dammLoading,
    error: dlmmError || dammError || null,
  };
}
