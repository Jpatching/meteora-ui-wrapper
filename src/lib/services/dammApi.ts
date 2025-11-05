/**
 * Meteora DAMM (Dynamic Automated Market Maker) API Client
 * Fetches pool data for both DAMM v1 and DAMM v2 from Meteora's official APIs
 */

import { PublicKey } from '@solana/web3.js';

// DAMM v2 API base URLs (verified working)
// Docs: https://docs.meteora.ag/api-reference/damm-v2/overview
const DAMM_V2_API_URLS = {
  'mainnet-beta': 'https://dammv2-api.meteora.ag',
  'devnet': 'https://dammv2-api.meteora.ag', // Use mainnet for now
  'localhost': 'https://dammv2-api.meteora.ag', // Use mainnet for now
};

// DAMM v1 API base URLs
// Docs: https://docs.meteora.ag/api-reference/damm-v1/overview
// Based on DAMM v2 pattern: dammv2-api.meteora.ag -> damm-api.meteora.ag
const DAMM_V1_API_URLS = {
  'mainnet-beta': 'https://amm-api.meteora.ag',
  'devnet': 'https://amm-api.meteora.ag', // Use mainnet for now
  'localhost': 'https://amm-api.meteora.ag', // Use mainnet for now
};

export interface DAMMPool {
  pool_address: string;
  pool_name: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol?: string;
  token_b_symbol?: string;
  token_a_amount: number;
  token_b_amount: number;
  tvl: number;
  volume_24h?: number;
  fees_24h?: number;
  apr?: number;
  apy?: number;
  pool_type: 'stable' | 'non-stable';
  version: 'v1' | 'v2';
}

export interface FetchDAMMPoolsOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
  version?: 'v1' | 'v2' | 'all';
}

/**
 * Fetch DAMM v2 pools from our server-side API route (avoids CORS)
 * Server route proxies to: https://amm-v2-api.meteora.ag/pools
 * Rate limit: 10 requests per second
 * Note: API returns pools from all networks - we filter client-side
 * Docs: https://docs.meteora.ag/api-reference/damm-v2/overview
 */
export async function fetchDAMMv2Pools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  const { network = 'mainnet-beta' } = options;

  console.log(`🌊 Fetching DAMM v2 pools via server-side route (network: ${network})...`);

  try {
    // Call our server-side API route to avoid CORS issues
    const response = await fetch('/api/damm-v2/pools', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`⚠️ DAMM v2 API route returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const result = await response.json();

    if (!result.success || !result.pools) {
      console.warn('⚠️ DAMM v2 API returned unexpected format');
      return [];
    }

    // Transform API response to our DAMMPool format
    const pools = result.pools.map((pool: any) => ({
      pool_address: pool.pool_address || pool.address || pool.poolAddress,
      pool_name: pool.pool_name || pool.name || `${pool.token_a_symbol || pool.tokenA?.symbol || 'UNKNOWN'}-${pool.token_b_symbol || pool.tokenB?.symbol || 'UNKNOWN'}`,
      token_a_mint: pool.token_a_mint || pool.tokenA?.mint || pool.token_a?.mint,
      token_b_mint: pool.token_b_mint || pool.tokenB?.mint || pool.token_b?.mint,
      token_a_symbol: pool.token_a_symbol || pool.tokenA?.symbol || pool.token_a?.symbol,
      token_b_symbol: pool.token_b_symbol || pool.tokenB?.symbol || pool.token_b?.symbol,
      token_a_amount: pool.token_a_amount || pool.tokenA?.reserve || pool.token_a?.reserve || 0,
      token_b_amount: pool.token_b_amount || pool.tokenB?.reserve || pool.token_b?.reserve || 0,
      tvl: pool.tvl || 0,
      volume_24h: pool.volume_24h || pool.trade_volume_24h || pool.tradeVolume24h || 0,
      fees_24h: pool.fees_24h || pool.today_fees || pool.todayFees || 0,
      apr: pool.apr || 0,
      apy: pool.apy || 0,
      pool_type: pool.pool_type || (pool.is_stable || pool.isStable ? 'stable' : 'non-stable'),
      version: 'v2' as const,
    }));

    console.log(`✅ Fetched ${pools.length} DAMM v2 pools from server route`);

    // Note: API returns all networks, so we don't filter here
    // Filtering by network would require on-chain verification
    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DAMM v2 pools:', error.message);
    return []; // Return empty array to prevent breaking the app
  }
}

/**
 * Fetch DAMM v1 pools from API
 *
 * NOTE: DAMM v1 API does not have a bulk "/pools" endpoint.
 * The API requires specific pool addresses: /pools/{address}
 *
 * For now, DAMM v1 pools are disabled in bulk fetching.
 * Use DAMM v2 API instead which supports bulk fetching.
 *
 * Docs: https://docs.meteora.ag/api-reference/damm-v1/overview
 * API Base: https://amm-api.meteora.ag
 *
 * Available endpoints:
 * - /alpha-vault - Get alpha vault data
 * - /pools/{address} - Get specific pool by address
 * - /fee-config/{address} - Get fee configuration
 *
 * TODO: Implement on-chain fetching for DAMM v1 pools using SDK if needed
 */
export async function fetchDAMMv1Pools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  const { network = 'mainnet-beta' } = options;

  console.log(`⚠️ DAMM v1 bulk pool fetching not supported by API`);
  console.log(`ℹ️  Use DAMM v2 API or on-chain SDK for DAMM v1 pools`);

  // Return empty array - DAMM v1 API doesn't support bulk pool fetching
  // Users should use DAMM v2 API which has proper bulk endpoints
  return [];
}

/**
 * Fetch all DAMM pools (v1 + v2)
 */
export async function fetchAllDAMMPools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  const { version = 'all' } = options;

  const results = await Promise.allSettled([
    version === 'all' || version === 'v1' ? fetchDAMMv1Pools(options) : Promise.resolve([]),
    version === 'all' || version === 'v2' ? fetchDAMMv2Pools(options) : Promise.resolve([]),
  ]);

  const pools: DAMMPool[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      pools.push(...result.value);
    }
  });

  console.log(`✅ Total DAMM pools fetched: ${pools.length}`);
  return pools;
}

/**
 * Transform DAMM pool to Jupiter Pool format for UI compatibility
 */
export function transformDAMMPoolToPool(dammPool: DAMMPool): any {
  const baseSymbol = dammPool.token_a_symbol || 'UNKNOWN';
  const quoteSymbol = dammPool.token_b_symbol || 'UNKNOWN';

  return {
    id: dammPool.pool_address,
    chain: 'solana',
    dex: 'Meteora',
    type: 'damm', // Unified type for filtering purposes
    createdAt: new Date().toISOString(),
    bondingCurve: undefined,
    volume24h: dammPool.volume_24h,
    isUnreliable: false,
    updatedAt: new Date().toISOString(),
    price: dammPool.token_b_amount > 0 ? dammPool.token_a_amount / dammPool.token_b_amount : 0,

    baseAsset: {
      id: dammPool.token_a_mint,
      name: baseSymbol,
      symbol: baseSymbol,
      icon: undefined,
      decimals: 9,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      launchpad: dammPool.version === 'v2' ? 'met-damm-v2' : 'met-damm-v1',
      holderCount: undefined,
      fdv: undefined,
      mcap: undefined,
      usdPrice: undefined,
      liquidity: dammPool.tvl,
      stats24h: {
        volumeChange: undefined,
        priceChange: undefined,
        liquidityChange: undefined,
        holderChange: undefined,
        buyVolume: (dammPool.volume_24h || 0) / 2,
        sellVolume: (dammPool.volume_24h || 0) / 2,
        numBuys: undefined,
        numSells: undefined,
        numTraders: undefined,
      },
      organicScoreLabel: 'medium' as const,
    },

    quoteAsset: {
      id: dammPool.token_b_mint,
      symbol: quoteSymbol,
      name: quoteSymbol,
    },

    // DAMM-specific fields
    poolType: dammPool.pool_type,
    tvl: dammPool.tvl,
    apr: dammPool.apr,
    apy: dammPool.apy,
    fees24h: dammPool.fees_24h,
    version: dammPool.version, // 'v1' or 'v2'
  };
}
