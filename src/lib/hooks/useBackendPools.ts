/**
 * Hooks for fetching pool data from our backend (with Redis caching)
 * Much faster than calling Meteora APIs directly from frontend
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Pool } from '@/lib/jupiter/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alsk-production.up.railway.app';

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
export function transformDBPoolToDLMM(pool: DBPool): BackendDLMMPool {
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
export function transformDBPoolToDAMM(pool: DBPool): BackendDAMMPool {
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
 * Transform DBPool to BackendPool (intermediate step)
 * EXPORTED for use in useRelatedPools
 */
export function transformDBPoolToBackend(
  dbPool: DBPool,
  protocol: 'dlmm' | 'damm-v2'
): BackendDLMMPool | BackendDAMMPool {
  if (protocol === 'dlmm') {
    return transformDBPoolToDLMM(dbPool);
  } else {
    return transformDBPoolToDAMM(dbPool);
  }
}

/**
 * Transform backend pool types to full Pool type
 * Converts BackendDLMMPool or BackendDAMMPool to complete Pool interface
 * Missing properties (social links, audit) are set to undefined
 * EXPORTED for use in useRelatedPools
 */
export function transformBackendPoolToPool(
  backendPool: BackendDLMMPool | BackendDAMMPool,
  protocol: 'dlmm' | 'damm-v2'
): Pool {
  // Determine if this is a DLMM pool
  const isDLMM = protocol === 'dlmm';

  // Extract common properties
  const address = isDLMM
    ? (backendPool as BackendDLMMPool).address
    : (backendPool as BackendDAMMPool).pool_address;

  const name = isDLMM
    ? (backendPool as BackendDLMMPool).name
    : (backendPool as BackendDAMMPool).pool_name;

  const tokenXMint = isDLMM
    ? (backendPool as BackendDLMMPool).mint_x
    : (backendPool as BackendDAMMPool).token_a_mint;

  const tokenYMint = isDLMM
    ? (backendPool as BackendDLMMPool).mint_y
    : (backendPool as BackendDAMMPool).token_b_mint;

  const tokenXSymbol = isDLMM
    ? (backendPool as BackendDLMMPool).token_a_symbol
    : (backendPool as BackendDAMMPool).token_a_symbol;

  const tokenYSymbol = isDLMM
    ? (backendPool as BackendDLMMPool).token_b_symbol
    : (backendPool as BackendDAMMPool).token_b_symbol;

  const volume24h = isDLMM
    ? (backendPool as BackendDLMMPool).trade_volume_24h
    : (backendPool as BackendDAMMPool).volume24h;

  const currentPrice = isDLMM
    ? (backendPool as BackendDLMMPool).current_price
    : undefined;

  const liquidity = isDLMM
    ? parseFloat((backendPool as BackendDLMMPool).liquidity)
    : (backendPool as BackendDAMMPool).tvl;

  const binStep = isDLMM
    ? (backendPool as BackendDLMMPool).bin_step
    : 0;

  const baseFee = isDLMM
    ? parseFloat((backendPool as BackendDLMMPool).base_fee_percentage || '0')
    : (backendPool as BackendDAMMPool).base_fee;

  // Build the Pool object
  return {
    id: address,
    chain: 'solana',
    dex: 'meteora',
    type: protocol,
    createdAt: new Date().toISOString(), // Use current time as we don't have creation date
    bondingCurve: undefined,
    volume24h: volume24h || undefined,
    isUnreliable: false,
    updatedAt: new Date().toISOString(),

    // Build baseAsset object
    baseAsset: {
      id: tokenXMint,
      name: tokenXSymbol || 'Unknown Token',
      symbol: tokenXSymbol || 'UNKNOWN',
      icon: undefined, // Will be enriched by frontend token metadata service
      decimals: 9, // Default to 9 decimals (SPL standard)
      twitter: undefined, // Not available from backend
      telegram: undefined, // Not available from backend
      website: undefined, // Not available from backend
      dev: undefined,
      circSupply: undefined,
      totalSupply: undefined,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      launchpad: undefined,
      graduatedAt: undefined,
      graduatedPool: undefined,
      firstPool: undefined,
      holderCount: undefined,
      fdv: undefined,
      mcap: undefined,
      usdPrice: currentPrice, // DLMM has current price
      priceBlockId: undefined,
      liquidity: liquidity || undefined,
      stats5m: undefined,
      stats1h: undefined,
      stats6h: undefined,
      stats24h: volume24h ? {
        priceChange: undefined,
        volumeChange: undefined,
        liquidityChange: undefined,
        holderChange: undefined,
        buyVolume: volume24h / 2, // Approximate split
        sellVolume: volume24h / 2,
        buyOrganicVolume: undefined,
        sellOrganicVolume: undefined,
        numBuys: undefined,
        numSells: undefined,
        numTraders: undefined,
        numOrganicBuyers: undefined,
        numNetBuyers: undefined,
      } : undefined,
      audit: undefined, // Not available from backend
      organicScore: undefined,
      organicScoreLabel: 'medium', // Default
      isVerified: false, // Default to false
      ctLikes: undefined,
      smartCtLikes: undefined,
    },

    // Build quoteAsset object (pair token)
    quoteAsset: {
      id: tokenYMint,
      symbol: tokenYSymbol || 'UNKNOWN',
      name: tokenYSymbol || 'Unknown Token',
      icon: undefined, // Will be enriched by frontend
    },

    streamed: false,

    // Add custom metadata (not in Pool type but needed by components)
    // @ts-ignore - Adding custom properties for component use
    binStep,
    // @ts-ignore
    baseFee,
  };
}

/**
 * Fetch DLMM pools from backend DATABASE (cached in Redis for 5 min)
 * Queries PostgreSQL with 100k+ pools stored
 * 10-100x faster than fetching from Meteora API directly
 */
export function useBackendDLMMPools(network: 'mainnet-beta' | 'devnet' = 'mainnet-beta') {
  return useQuery({
    queryKey: ['backend-dlmm-pools', network],
    queryFn: async () => {
      console.log(`🚀 Fetching DLMM pools from backend database (${network})...`);
      const response = await fetch(`${BACKEND_URL}/api/pools/top?protocol=dlmm&limit=100&network=${network}`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPools = result.data as DBPool[];

      // Transform database format to frontend format
      const transformedPools = dbPools.map(transformDBPoolToDLMM);

      console.log(`✅ Got ${transformedPools.length} DLMM pools from ${network} (cached: ${result.cached})`);
      return transformedPools;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, // Force refetch when network changes
  });
}

/**
 * Fetch DAMM pools from backend DATABASE (cached in Redis for 5 min)
 * Queries PostgreSQL with all DAMM v2 pools stored
 */
export function useBackendDAMMPools(network: 'mainnet-beta' | 'devnet' = 'mainnet-beta') {
  return useQuery({
    queryKey: ['backend-damm-pools', network],
    queryFn: async () => {
      console.log(`🚀 Fetching DAMM v2 pools from backend database (${network})...`);
      const response = await fetch(`${BACKEND_URL}/api/pools/top?protocol=damm-v2&limit=100&network=${network}`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPools = result.data as DBPool[];

      // Transform database format to frontend format
      const transformedPools = dbPools.map(transformDBPoolToDAMM);

      console.log(`✅ Got ${transformedPools.length} DAMM v2 pools from ${network} (cached: ${result.cached})`);
      return transformedPools;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, // Force refetch when network changes
  });
}

/**
 * Fetch a single pool by address (any protocol)
 * Used by pool detail pages
 */
export function useBackendPool(address: string | null, network: 'mainnet-beta' | 'devnet' = 'mainnet-beta') {
  return useQuery({
    queryKey: ['backend-pool', address, network],
    queryFn: async () => {
      if (!address) return null;

      console.log(`🔍 Fetching pool ${address} from backend (${network})...`);

      const response = await fetch(`${BACKEND_URL}/api/pools/${address}?network=${network}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Pool ${address} not found on ${network}`);
          return null;
        }
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      const dbPool = result.data as DBPool;

      console.log(`✅ Found pool ${address} on ${network} (${dbPool.protocol}, cached: ${result.cached})`);

      // Transform based on protocol
      let backendPool: BackendDLMMPool | BackendDAMMPool;
      let protocol: 'dlmm' | 'damm-v2';

      if (dbPool.protocol === 'dlmm') {
        backendPool = transformDBPoolToDLMM(dbPool);
        protocol = 'dlmm';
      } else if (dbPool.protocol === 'damm-v2') {
        backendPool = transformDBPoolToDAMM(dbPool);
        protocol = 'damm-v2';
      } else {
        // Generic transformation for other protocols
        backendPool = transformDBPoolToDAMM(dbPool);
        protocol = 'damm-v2';
      }

      // Transform to full Pool type for component compatibility
      return transformBackendPoolToPool(backendPool, protocol);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
