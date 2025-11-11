import { useState, useEffect } from 'react';
import { Pool } from '@/lib/jupiter/types';
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
 * Fetches pools related to the current pool (sharing base token)
 * Uses backend search API to find ALL pools containing the base token
 */
export function useRelatedPools({
  currentPool,
  network,
  limit = 20,
}: UseRelatedPoolsOptions): RelatedPoolsResult {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentPool) {
      setPools([]);
      return;
    }

    // Fetch pools containing the base token using backend search API
    const fetchRelatedPools = async () => {
      setLoading(true);
      setError(null);

      try {
        const { transformBackendPoolToPool } = await import('./useBackendPools');

        // Get token symbol for search (e.g., "TRUMP" from TRUMP-USDC pool)
        const baseTokenSymbol = currentPool.baseAsset.symbol;

        // Search backend API for all pools containing this token
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${encodeURIComponent(baseTokenSymbol)}&network=${network}&limit=100`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch related pools');
        }

        const data = await response.json();

        if (!data.success || !data.data) {
          setPools([]);
          setLoading(false);
          return;
        }

        // Transform backend pools to Pool format
        const transformed = data.data.map((p: any) => transformBackendPoolToPool(p, p.protocol));

        // Filter for pools that share the SAME BASE TOKEN
        // Example: TRUMP-USDC pool should show TRUMP-SOL, TRUMP-BONK, etc. (all TRUMP pools)
        const related = transformed.filter((pool: Pool) => {
          // Skip the current pool itself
          if (pool.id === currentPool.id) return false;

          // Only show pools that have the same base token
          const sharesBaseToken =
            pool.baseAsset.id === currentPool.baseAsset.id ||
            pool.quoteAsset?.id === currentPool.baseAsset.id;

          return sharesBaseToken;
        });

        // Sort by TVL descending
        related.sort((a: Pool, b: Pool) => (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0));

        // Limit results
        const limited = related.slice(0, limit);

        // Enrich with token metadata (logos, etc.)
        const enriched = await enrichPoolsWithMetadata(limited);
        setPools(enriched);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching related pools:', err);
        setError(err as Error);
        setPools([]);
        setLoading(false);
      }
    };

    fetchRelatedPools();
  }, [currentPool?.id, currentPool?.baseAsset.symbol, network, limit]);

  return {
    pools,
    loading,
    error,
  };
}
