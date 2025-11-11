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

        // Get the exact token mint address (contract address)
        const baseTokenMint = currentPool.baseAsset.id;

        // Search backend API using the MINT ADDRESS for exact matching
        // This ensures we get ALL pools containing this exact token, not symbol matches
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${encodeURIComponent(baseTokenMint)}&network=${network}&limit=100`
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

        // Filter for pools that contain the EXACT SAME TOKEN MINT and are ACTIVE
        // Using mint address ensures 100% accuracy - no symbol collisions
        const related = transformed.filter((pool: Pool) => {
          // Skip the current pool itself
          if (pool.id === currentPool.id) return false;

          // Check if pool contains the exact token mint (as token_x OR token_y)
          const containsToken =
            pool.baseAsset.id === baseTokenMint ||
            pool.quoteAsset?.id === baseTokenMint;

          if (!containsToken) return false;

          // Filter out dead/empty pools with no liquidity
          const hasLiquidity = (pool.baseAsset.liquidity || 0) > 0;

          // Filter out pools with zero volume (completely inactive)
          const hasVolume = (pool.volume24h || 0) > 0;

          // Pool must have either liquidity OR volume to be considered active
          const isActive = hasLiquidity || hasVolume;

          return isActive;
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
  }, [currentPool?.id, currentPool?.baseAsset.id, network, limit]);

  return {
    pools,
    loading,
    error,
  };
}
