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

        // Get token symbol for search (same method as working searchbar)
        const baseTokenSymbol = currentPool.baseAsset.symbol;
        const baseTokenMint = currentPool.baseAsset.id;

        console.log(`🔍 Searching for pools with token: ${baseTokenSymbol} (${baseTokenMint})`);

        // Fetch from backend database (synced every 30 min with ~10k active pools)
        // Backend has BOTH DLMM and DAMM v2 pools searchable via symbol
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${encodeURIComponent(baseTokenSymbol)}&network=${network}&limit=100`
        );

        if (!response.ok) {
          throw new Error(`Backend search failed: ${response.status}`);
        }

        const data = await response.json();
        const pools = data.data || [];

        console.log(`📊 Backend returned ${pools.length} pools for "${baseTokenSymbol}"`);

        // Transform backend pools to Pool format (already in DBPool format)
        const transformed = pools.map((p: any) => transformBackendPoolToPool(p, p.protocol));
        console.log(`🔄 Transformed ${transformed.length} pools`);

        // Log first pool for debugging
        if (transformed.length > 0) {
          console.log('📋 First transformed pool sample:', {
            id: transformed[0].id,
            baseAsset: {
              id: transformed[0].baseAsset.id,
              symbol: transformed[0].baseAsset.symbol,
            },
            quoteAsset: {
              id: transformed[0].quoteAsset?.id,
              symbol: transformed[0].quoteAsset?.symbol,
            },
          });
        }

        // Filter for pools that contain the EXACT SAME TOKEN MINT and are ACTIVE
        // Using mint address ensures 100% accuracy - no symbol collisions
        console.log(`🔎 Filtering for pools containing token: ${baseTokenMint}`);
        console.log(`   Current pool ID to skip: ${currentPool.id}`);

        const related = transformed.filter((pool: Pool, index: number) => {
          // INCLUDE the current pool (will be sorted to top later)
          const isCurrentPool = pool.id === currentPool.id;
          if (isCurrentPool) {
            console.log(`⭐ Pool ${index + 1}: ${pool.id} - Current pool (will show first)`);
          }

          // Check if pool contains the exact token mint (as token_x OR token_y)
          const containsToken =
            pool.baseAsset.id === baseTokenMint ||
            pool.quoteAsset?.id === baseTokenMint;

          if (!containsToken) {
            console.log(`❌ Pool ${index + 1}: ${pool.id} (${pool.baseAsset.symbol}-${pool.quoteAsset?.symbol}) - Token mismatch`);
            console.log(`   Base: ${pool.baseAsset.id}`);
            console.log(`   Quote: ${pool.quoteAsset?.id}`);
            console.log(`   Looking for: ${baseTokenMint}`);
            return false;
          }

          // Filter out dead/empty pools with no liquidity
          const hasLiquidity = (pool.baseAsset.liquidity || 0) > 0;

          // Filter out pools with zero volume (completely inactive)
          const hasVolume = (pool.volume24h || 0) > 0;

          // Pool must have either liquidity OR volume to be considered active
          const isActive = hasLiquidity || hasVolume;

          if (!isActive) {
            console.log(`❌ Pool ${index + 1}: ${pool.id} (${pool.baseAsset.symbol}-${pool.quoteAsset?.symbol}) - Inactive (liquidity: ${pool.baseAsset.liquidity}, volume: ${pool.volume24h})`);
            return false;
          }

          if (!isCurrentPool) {
            const liq = typeof pool.baseAsset.liquidity === 'number' ? pool.baseAsset.liquidity.toFixed(2) : pool.baseAsset.liquidity || 0;
            const vol = typeof pool.volume24h === 'number' ? pool.volume24h.toFixed(2) : pool.volume24h || 0;
            console.log(`✅ Pool ${index + 1}: ${pool.id} (${pool.baseAsset.symbol}-${pool.quoteAsset?.symbol}) - MATCH! (liquidity: ${liq}, volume: ${vol})`);
          }
          return true;
        });

        console.log(`✅ After filtering: ${related.length} related pools found`);

        // Sort: Current pool FIRST, then by 24h volume (most active pools)
        related.sort((a: Pool, b: Pool) => {
          // Current pool always comes first
          if (a.id === currentPool.id) return -1;
          if (b.id === currentPool.id) return 1;
          // Others sorted by 24h volume (most active/traded pools first)
          return (b.volume24h || 0) - (a.volume24h || 0);
        });

        // Limit results (current pool + top N others)
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
