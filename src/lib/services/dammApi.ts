/**
 * Meteora DAMM (Dynamic Automated Market Maker) API Client
 * Fetches pool data for both DAMM v1 and DAMM v2 from Meteora's official APIs
 */

import { PublicKey } from '@solana/web3.js';

// DAMM v2 API base URL (from Meteora docs)
const DAMM_V2_API_URL = 'https://amm-v2.meteora.ag';

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
}

export interface FetchDAMMPoolsOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
  version?: 'v1' | 'v2' | 'all';
}

/**
 * Fetch DAMM v2 pools from Meteora API
 * Uses the official endpoint: https://amm-v2.meteora.ag/api/pools
 */
export async function fetchDAMMv2Pools(
  options: FetchDAMMPoolsOptions = {}
): Promise<DAMMPool[]> {
  const { network = 'mainnet-beta' } = options;

  console.log(`🌊 Fetching DAMM v2 pools from ${DAMM_V2_API_URL} (network: ${network})...`);

  try {
    // Meteora DAMM v2 API endpoint
    const response = await fetch(`${DAMM_V2_API_URL}/api/pools`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`❌ DAMM v2 API error: ${response.status} ${response.statusText}`);
      throw new Error(`DAMM v2 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pools = (data.pools || data || []).map((pool: any) => ({
      pool_address: pool.pool_address || pool.address,
      pool_name: pool.pool_name || pool.name || `${pool.token_a_symbol}-${pool.token_b_symbol}`,
      token_a_mint: pool.token_a_mint || pool.token_a?.mint,
      token_b_mint: pool.token_b_mint || pool.token_b?.mint,
      token_a_symbol: pool.token_a_symbol || pool.token_a?.symbol,
      token_b_symbol: pool.token_b_symbol || pool.token_b?.symbol,
      token_a_amount: pool.token_a_amount || pool.token_a?.reserve || 0,
      token_b_amount: pool.token_b_amount || pool.token_b?.reserve || 0,
      tvl: pool.tvl || 0,
      volume_24h: pool.volume_24h || pool.trade_volume_24h || 0,
      fees_24h: pool.fees_24h || pool.today_fees || 0,
      apr: pool.apr || 0,
      apy: pool.apy || 0,
      pool_type: pool.pool_type || (pool.is_stable ? 'stable' : 'non-stable'),
      version: 'v2' as const,
    }));

    console.log(`✅ Fetched ${pools.length} DAMM v2 pools`);
    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DAMM v2 pools:', error);
    // Return empty array instead of throwing to prevent breaking the app
    return [];
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
  };
}
