/**
 * Hooks for fetching pool data from our backend (with Redis caching)
 * Much faster than calling Meteora APIs directly from frontend
 */

'use client';

import { useQuery } from '@tanstack/react-query';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Database pool schema (from PostgreSQL)
export interface DBPool {
  id: number;
  pool_address: string;
  pool_name: string;
  protocol: string; // 'dlmm' | 'damm-v2' | etc
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string | null;
  token_b_symbol: string | null;
  tvl: number;
  volume_24h: number;
  fees_24h: number;
  apr: number;
  metadata: {
    bin_step?: number;
    base_fee_percentage?: string;
    base_fee?: number;
    pool_type?: number;
    current_price?: number;
    liquidity?: string;
    reserve_x?: string;
    reserve_y?: string;
  };
  created_at: string;
  updated_at: string;
  last_synced_at: string;
}

// Legacy interfaces (kept for backwards compatibility with page transformations)
export interface BackendDLMMPool {
  address: string;
  name: string;
  bin_step: number;
  base_fee_percentage: string;
  liquidity: string;
  trade_volume_24h: number;
  mint_x: string;
  mint_y: string;
  reserve_x: string;
  reserve_y: string;
  current_price: number;
  apr: number;
  apy: number;
  fees_24h: number;
  // Token symbols (extracted from name or database)
  token_a_symbol?: string;
  token_b_symbol?: string;
}

export interface BackendDAMMPool {
  pool_address: string;
  pool_name: string;
  base_fee: number;
  tvl: number;
  volume24h: number;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  token_a_amount: number;
  token_b_amount: number;
  apr: number;
  pool_type: number;
}

// Transform database pool to DLMM frontend format
function transformDBPoolToDLMM(pool: DBPool): BackendDLMMPool {
  // PostgreSQL returns DECIMAL as string - convert to numbers
  const tvl = typeof pool.tvl === 'string' ? parseFloat(pool.tvl) : pool.tvl;
  const volume24h = typeof pool.volume_24h === 'string' ? parseFloat(pool.volume_24h) : pool.volume_24h;
  const apr = typeof pool.apr === 'string' ? parseFloat(pool.apr) : pool.apr;
  const fees24h = typeof pool.fees_24h === 'string' ? parseFloat(pool.fees_24h) : pool.fees_24h;

  // Extract token symbols from database OR pool name (e.g., "SOL-USDC" -> ["SOL", "USDC"])
  let token_a_symbol = pool.token_a_symbol;
  let token_b_symbol = pool.token_b_symbol;

  if (!token_a_symbol || !token_b_symbol) {
    const nameParts = (pool.pool_name || '').split('-');
    token_a_symbol = token_a_symbol || nameParts[0]?.trim() || '';
    token_b_symbol = token_b_symbol || nameParts[1]?.trim() || '';
  }

  return {
    address: pool.pool_address,
    name: pool.pool_name,
    bin_step: pool.metadata.bin_step || 0,
    base_fee_percentage: pool.metadata.base_fee_percentage || '0',
    liquidity: pool.metadata.liquidity || tvl.toString(),
    trade_volume_24h: volume24h,
    mint_x: pool.token_a_mint,
    mint_y: pool.token_b_mint,
    reserve_x: pool.metadata.reserve_x || '0',
    reserve_y: pool.metadata.reserve_y || '0',
    current_price: pool.metadata.current_price || 0,
    apr: apr,
    apy: apr, // Use APR as APY for now
    fees_24h: fees24h,
    token_a_symbol,
    token_b_symbol,
  };
}

// Transform database pool to DAMM frontend format
function transformDBPoolToDAMM(pool: DBPool): BackendDAMMPool {
  // PostgreSQL returns DECIMAL as string - convert to numbers
  const tvl = typeof pool.tvl === 'string' ? parseFloat(pool.tvl) : pool.tvl;
  const volume24h = typeof pool.volume_24h === 'string' ? parseFloat(pool.volume_24h) : pool.volume_24h;
  const apr = typeof pool.apr === 'string' ? parseFloat(pool.apr) : pool.apr;

  return {
    pool_address: pool.pool_address,
    pool_name: pool.pool_name,
    base_fee: pool.metadata.base_fee || 0.25,
    tvl: tvl,
    volume24h: volume24h,
    token_a_mint: pool.token_a_mint,
    token_b_mint: pool.token_b_mint,
    token_a_symbol: pool.token_a_symbol || '',
    token_b_symbol: pool.token_b_symbol || '',
    token_a_amount: 0, // Not stored in DB
    token_b_amount: 0, // Not stored in DB
    apr: apr,
    pool_type: pool.metadata.pool_type || 0,
  };
}

/**
 * Fetch DLMM pools from backend DATABASE (cached in Redis for 5 min)
 * Queries PostgreSQL with 100k+ pools stored
 * 10-100x faster than fetching from Meteora API directly
 */
export function useBackendDLMMPools() {
  return useQuery({
    queryKey: ['backend-dlmm-pools'],
    queryFn: async () => {
      console.log('🚀 Fetching DLMM pools from backend database...');
      const response = await fetch(`${BACKEND_URL}/api/pools/top?protocol=dlmm&limit=100`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPools = result.data as DBPool[];

      // Transform database format to frontend format
      const transformedPools = dbPools.map(transformDBPoolToDLMM);

      console.log(`✅ Got ${transformedPools.length} DLMM pools from database (cached: ${result.cached})`);
      return transformedPools;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Fetch DAMM pools from backend DATABASE (cached in Redis for 5 min)
 * Queries PostgreSQL with all DAMM v2 pools stored
 */
export function useBackendDAMMPools() {
  return useQuery({
    queryKey: ['backend-damm-pools'],
    queryFn: async () => {
      console.log('🚀 Fetching DAMM pools from backend database...');
      const response = await fetch(`${BACKEND_URL}/api/pools/top?protocol=damm-v2&limit=100`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPools = result.data as DBPool[];

      // Transform database format to frontend format
      const transformedPools = dbPools.map(transformDBPoolToDAMM);

      console.log(`✅ Got ${transformedPools.length} DAMM pools from database (cached: ${result.cached})`);
      return transformedPools;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Fetch a single pool by address (any protocol)
 * Used by pool detail pages
 */
export function useBackendPool(address: string | null) {
  return useQuery({
    queryKey: ['backend-pool', address],
    queryFn: async () => {
      if (!address) return null;

      console.log(`🔍 Fetching pool ${address} from backend...`);

      const response = await fetch(`${BACKEND_URL}/api/pools/${address}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Pool ${address} not found in database`);
          return null;
        }
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPool = result.data as DBPool;

      console.log(`✅ Found pool ${address} (${dbPool.protocol}, cached: ${result.cached})`);

      // Transform based on protocol
      if (dbPool.protocol === 'dlmm') {
        return transformDBPoolToDLMM(dbPool);
      } else if (dbPool.protocol === 'damm-v2') {
        return transformDBPoolToDAMM(dbPool);
      } else {
        // Generic transformation for other protocols
        return transformDBPoolToDAMM(dbPool);
      }
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
