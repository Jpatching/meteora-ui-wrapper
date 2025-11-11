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

        // Search backend API using SYMBOL (same as searchbar - works perfectly!)
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${encodeURIComponent(baseTokenSymbol)}&network=${network}&limit=100`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch related pools');
        }

        const data = await response.json();

        console.log(`📊 Backend returned ${data.data?.length || 0} pools for symbol "${baseTokenSymbol}"`, data);

        if (!data.success || !data.data) {
          console.warn('⚠️ No data returned from backend search');
          setPools([]);
          setLoading(false);
          return;
        }

        // Transform backend pools to Pool format
        // Backend returns DBPool format directly from search API
        const transformed = data.data.map((p: any) => {
          // Backend search returns DBPool objects, need to convert to BackendDLMMPool/BackendDAMMPool first
          const isDLMM = p.protocol === 'dlmm';

          // Build BackendDLMMPool or BackendDAMMPool
          let backendPool: any;
          if (isDLMM) {
            backendPool = {
              address: p.pool_address,
              name: p.pool_name,
              bin_step: p.metadata?.bin_step || 0,
              base_fee_percentage: p.metadata?.base_fee_percentage || '0',
              liquidity: p.tvl?.toString() || '0',
              trade_volume_24h: p.volume_24h || 0,
              mint_x: p.token_a_mint,
              mint_y: p.token_b_mint,
              reserve_x: '0',
              reserve_y: '0',
              current_price: p.metadata?.current_price || 0,
              apr: p.apr || 0,
              apy: p.apr || 0,
              fees_24h: p.fees_24h || 0,
              token_a_symbol: p.token_a_symbol,
              token_b_symbol: p.token_b_symbol,
            };
          } else {
            backendPool = {
              pool_address: p.pool_address,
              pool_name: p.pool_name,
              base_fee: p.metadata?.base_fee || 0.25,
              tvl: p.tvl || 0,
              volume24h: p.volume_24h || 0,
              token_a_mint: p.token_a_mint,
              token_b_mint: p.token_b_mint,
              token_a_symbol: p.token_a_symbol || '',
              token_b_symbol: p.token_b_symbol || '',
              token_a_amount: 0,
              token_b_amount: 0,
              apr: p.apr || 0,
              pool_type: p.metadata?.pool_type || 0,
            };
          }

          return transformBackendPoolToPool(backendPool, p.protocol);
        });
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
          // Skip the current pool itself
          if (pool.id === currentPool.id) {
            console.log(`⏭️  Pool ${index + 1}: ${pool.id} - Skipping (current pool)`);
            return false;
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

          console.log(`✅ Pool ${index + 1}: ${pool.id} (${pool.baseAsset.symbol}-${pool.quoteAsset?.symbol}) - MATCH! (liquidity: ${pool.baseAsset.liquidity?.toFixed(2)}, volume: ${pool.volume24h?.toFixed(2)})`);
          return true;
        });

        console.log(`✅ After filtering: ${related.length} related pools found`);

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
