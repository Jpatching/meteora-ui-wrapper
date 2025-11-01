/**
 * Hooks for fetching pool data from our backend (with Redis caching)
 * Much faster than calling Meteora APIs directly from frontend
 */

'use client';

import { useQuery } from '@tanstack/react-query';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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

/**
 * Fetch DLMM pools from backend (cached in Redis for 5 min)
 * 10-100x faster than fetching from Meteora API directly
 */
export function useBackendDLMMPools() {
  return useQuery({
    queryKey: ['backend-dlmm-pools'],
    queryFn: async () => {
      console.log('🚀 Fetching DLMM pools from backend...');
      const response = await fetch(`${BACKEND_URL}/api/pools/dlmm?limit=100`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Got ${result.data?.length || 0} DLMM pools (cached: ${result.cached})`);
      return result.data as BackendDLMMPool[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Fetch DAMM pools from backend (cached in Redis for 5 min)
 */
export function useBackendDAMMPools() {
  return useQuery({
    queryKey: ['backend-damm-pools'],
    queryFn: async () => {
      console.log('🚀 Fetching DAMM pools from backend...');
      const response = await fetch(`${BACKEND_URL}/api/pools/damm`);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Got ${result.data?.length || 0} DAMM pools (cached: ${result.cached})`);
      return result.data as BackendDAMMPool[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
