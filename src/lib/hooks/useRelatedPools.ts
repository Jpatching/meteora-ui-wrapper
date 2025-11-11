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

        // Fetch from REAL Meteora APIs (not backend cache)
        const [dlmmResponse, dammResponse] = await Promise.all([
          // DLMM API
          fetch('https://dlmm-api.meteora.ag/pair/all'),
          // DAMM v2 API
          fetch('https://dammv2-api.meteora.ag/pools')
        ]);

        if (!dlmmResponse.ok && !dammResponse.ok) {
          throw new Error('Failed to fetch pools from Meteora APIs');
        }

        const [dlmmData, dammData] = await Promise.all([
          dlmmResponse.ok ? dlmmResponse.json() : [],
          dammResponse.ok ? dammResponse.json() : { data: [] }
        ]);

        // DLMM API returns array directly, DAMM v2 returns {data: [...]}
        const dlmmPools = Array.isArray(dlmmData) ? dlmmData : [];
        const dammPools = dammData.data || [];

        console.log(`📊 Meteora APIs returned ${dlmmPools.length} DLMM + ${dammPools.length} DAMM v2 pools`);

        // Filter pools containing the token BEFORE transformation (more efficient)
        const dlmmFiltered = dlmmPools.filter((p: any) =>
          p.mint_x === baseTokenMint || p.mint_y === baseTokenMint ||
          p.name?.toUpperCase().includes(baseTokenSymbol.toUpperCase())
        );

        const dammFiltered = dammPools.filter((p: any) =>
          p.token_a_mint === baseTokenMint || p.token_b_mint === baseTokenMint ||
          p.pool_name?.toUpperCase().includes(baseTokenSymbol.toUpperCase())
        );

        console.log(`🔎 Filtered to ${dlmmFiltered.length} DLMM + ${dammFiltered.length} DAMM v2 pools containing "${baseTokenSymbol}"`);

        // Transform Meteora API pools to our Pool format
        const dlmmTransformed = dlmmFiltered.map((p: any) => {
          const backendPool = {
            address: p.address,
            name: p.name,
            bin_step: p.bin_step || 0,
            base_fee_percentage: p.base_fee_percentage || '0',
            liquidity: p.liquidity || '0',
            trade_volume_24h: p.trade_volume_24h || 0,
            mint_x: p.mint_x,
            mint_y: p.mint_y,
            reserve_x: p.reserve_x || '0',
            reserve_y: p.reserve_y || '0',
            current_price: p.current_price || 0,
            apr: p.apr || 0,
            apy: p.apy || 0,
            fees_24h: p.fees_24h || 0,
            token_a_symbol: p.name?.split('-')[0],
            token_b_symbol: p.name?.split('-')[1],
          };
          return transformBackendPoolToPool(backendPool, 'dlmm');
        });

        const dammTransformed = dammFiltered.map((p: any) => {
          const backendPool = {
            pool_address: p.pool_address,
            pool_name: p.pool_name,
            base_fee: p.base_fee || 0.25,
            tvl: p.tvl || 0,
            volume24h: p.volume24h || 0,
            token_a_mint: p.token_a_mint,
            token_b_mint: p.token_b_mint,
            token_a_symbol: p.token_a_symbol || p.pool_name?.split('-')[0] || '',
            token_b_symbol: p.token_b_symbol || p.pool_name?.split('-')[1] || '',
            token_a_amount: p.token_a_amount || 0,
            token_b_amount: p.token_b_amount || 0,
            apr: p.apr || 0,
            pool_type: p.pool_type || 0,
          };
          return transformBackendPoolToPool(backendPool, 'damm-v2');
        });

        const transformed = [...dlmmTransformed, ...dammTransformed];
        console.log(`🔄 Transformed ${dlmmTransformed.length} DLMM + ${dammTransformed.length} DAMM v2 = ${transformed.length} total pools`);

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
