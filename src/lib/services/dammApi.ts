/**
 * Meteora DAMM (Dynamic Automated Market Maker) API Client
 * Fetches pool data for both DAMM v1 and DAMM v2 from Meteora's official APIs
 */

import { PublicKey } from '@solana/web3.js';

// DAMM v2 API base URLs
// Source: https://docs.meteora.ag/resources/meteora-apis
const DAMM_V2_API_URLS = {
  'mainnet-beta': 'https://dammv2-api.meteora.ag',
  'devnet': 'https://dammv2-api.devnet.meteora.ag',
  'localhost': 'https://dammv2-api.meteora.ag', // Use mainnet for localhost
};

// DAMM v1 uses on-chain fetching (no dedicated API endpoint)
// Will need to fetch directly from Solana using dynamic-amm-sdk

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
  base_fee?: number; // Fee in percentage (e.g., 1.0 = 1%)
}

export interface FetchDAMMPoolsOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
  version?: 'v1' | 'v2' | 'all';
}

/**
 * Fetch DAMM v2 pools from Meteora API
 * Official endpoint: https://dammv2-api.meteora.ag/pools
 * Source: https://docs.meteora.ag/resources/meteora-apis
 */
export async function fetchDAMMv2Pools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  const { network = 'mainnet-beta' } = options;
  const baseUrl = DAMM_V2_API_URLS[network];

  console.log(`🌊 Fetching DAMM v2 pools from ${baseUrl}/pools (network: ${network})...`);

  try {
    const response = await fetch(`${baseUrl}/pools`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`⚠️ DAMM v2 API returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const result = await response.json();

    // API returns { data: [...], status: 'ok', total: N, pages: N, current_page: N }
    const pools = (result.data || []).map((pool: any) => ({
      pool_address: pool.pool_address,
      pool_name: pool.pool_name || `${pool.token_a_symbol}-${pool.token_b_symbol}`,
      token_a_mint: pool.token_a_mint,
      token_b_mint: pool.token_b_mint,
      token_a_symbol: pool.token_a_symbol,
      token_b_symbol: pool.token_b_symbol,
      token_a_amount: pool.token_a_amount || 0,
      token_b_amount: pool.token_b_amount || 0,
      tvl: pool.tvl || 0,
      volume_24h: pool.volume24h || 0,
      fees_24h: pool.fee24h || 0,
      apr: pool.apr || 0,
      apy: 0, // Not provided by API
      pool_type: pool.pool_type === 0 ? 'non-stable' : 'stable',
      version: 'v2' as const,
      base_fee: pool.base_fee || 0.25, // Fee in percentage (e.g., 1.0 = 1%)
    }));

    console.log(`✅ Fetched ${pools.length} DAMM v2 pools from ${result.total} total`);
    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DAMM v2 pools:', error.message);
    return []; // Return empty array to prevent breaking the app
  }
}

/**
 * Fetch DAMM v1 pools
 * Note: DAMM v1 doesn't have a dedicated API, so we return an empty array for now
 * TODO: Implement on-chain fetching using @meteora-ag/dynamic-amm-sdk
 */
export async function fetchDAMMv1Pools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  console.log('⚠️ DAMM v1 pool fetching not yet implemented (requires on-chain SDK)');
  // DAMM v1 requires using @meteora-ag/dynamic-amm-sdk to fetch pools on-chain
  // This would need to enumerate all pools from the program
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
    type: dammPool.version === 'v2' ? 'damm-v2' : 'damm-v1',
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
    baseFee: dammPool.base_fee,
  };
}
