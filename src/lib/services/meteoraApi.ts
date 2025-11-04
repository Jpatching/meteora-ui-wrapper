/**
 * Meteora DLMM API Client
 * Fetches pool and position data from Meteora's official API
 * Supports both mainnet-beta and devnet
 */

import { PublicKey } from '@solana/web3.js';

// API base URLs
const METEORA_API_URLS = {
  'mainnet-beta': 'https://dlmm-api.meteora.ag',
  'devnet': 'https://dlmm-api.meteora.ag', // Uses same API for both networks
  'localhost': 'https://dlmm-api.meteora.ag',
};

export interface MeteoraPool {
  address: string;
  name: string;
  mint_x: string;
  mint_y: string;
  reserve_x: string;
  reserve_y: string;
  reserve_x_amount: number;
  reserve_y_amount: number;
  bin_step: number;
  base_fee_percentage: string;
  max_fee_percentage: string;
  protocol_fee_percentage: string;
  liquidity: string;
  reward_mint_x: string;
  reward_mint_y: string;
  fees_24h: number;
  today_fees: number;
  trade_volume_24h: number;
  cumulative_trade_volume: string;
  cumulative_fee_volume: string;
  current_price: number;
  apr: number;
  apy: number;
  farm_apr: number;
  farm_apy: number;
  hide: boolean;
}

export interface MeteoraPosition {
  address: string;
  lb_pair: string;
  owner: string;
  fee_owner: string;
  total_x_amount: string;
  total_y_amount: string;
  total_claimed_fee_x_amount: string;
  total_claimed_fee_y_amount: string;
  fee_x: string;
  fee_y: string;
  lower_bin_id: number;
  upper_bin_id: number;
  last_updated_at: number;
  liquidity_shares: string[];
}

export interface FetchPoolsOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
}

export interface FetchPositionOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
}

/**
 * Fetch all DLMM pools from Meteora API
 */
export async function fetchAllDLMMPools(
  options: FetchPoolsOptions = {}
): Promise<MeteoraPool[]> {
  const { network = 'mainnet-beta' } = options;
  const baseUrl = METEORA_API_URLS[network];

  console.log(`🌊 Fetching DLMM pools from ${baseUrl}/pair/all (network: ${network})...`);

  try {
    const response = await fetch(`${baseUrl}/pair/all`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Disable Next.js caching for fresh data
    });

    if (!response.ok) {
      console.error(`❌ Meteora API error: ${response.status} ${response.statusText}`);
      throw new Error(`Meteora API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pools = data.data || data || [];
    console.log(`✅ Fetched ${pools.length} DLMM pools from Meteora API`);

    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DLMM pools:', error);
    throw new Error(`Failed to fetch DLMM pools: ${error.message}`);
  }
}

/**
 * Transform MeteoraPool to Jupiter Pool format for UI compatibility
 */
export function transformMeteoraPoolToPool(meteoraPool: MeteoraPool): any {
  // Extract token symbols from pool name (format: "TOKEN1-TOKEN2")
  const nameParts = meteoraPool.name.split('-');
  const baseSymbol = nameParts[0] || 'UNKNOWN';
  const quoteSymbol = nameParts[1] || 'SOL';

  return {
    id: meteoraPool.address,
    chain: 'solana',
    dex: 'Meteora',
    type: 'dlmm',
    createdAt: new Date().toISOString(), // Not provided by API
    bondingCurve: undefined,
    volume24h: meteoraPool.trade_volume_24h,
    isUnreliable: meteoraPool.hide,
    updatedAt: new Date().toISOString(),
    price: meteoraPool.current_price,

    baseAsset: {
      id: meteoraPool.mint_x,
      name: baseSymbol,
      symbol: baseSymbol,
      icon: undefined,
      decimals: 9, // Default, would need token metadata for exact value
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      launchpad: 'met-dlmm' as any, // Custom launchpad identifier for DLMM
      holderCount: undefined,
      fdv: undefined,
      mcap: undefined,
      usdPrice: meteoraPool.current_price,
      liquidity: parseFloat(meteoraPool.liquidity),
      stats24h: {
        volumeChange: undefined,
        priceChange: undefined,
        liquidityChange: undefined,
        holderChange: undefined,
        buyVolume: meteoraPool.trade_volume_24h / 2, // Estimate
        sellVolume: meteoraPool.trade_volume_24h / 2, // Estimate
        numBuys: undefined,
        numSells: undefined,
        numTraders: undefined,
      },
      organicScoreLabel: 'medium' as const,
    },

    quoteAsset: {
      id: meteoraPool.mint_y,
      symbol: quoteSymbol,
      name: quoteSymbol,
      decimals: 9,
    },

    // DLMM-specific fields
    binStep: meteoraPool.bin_step,
    base_fee_percentage: meteoraPool.base_fee_percentage,
    baseFeePercentage: meteoraPool.base_fee_percentage,
    apr: meteoraPool.apr,
    apy: meteoraPool.apy,
    fees24h: meteoraPool.fees_24h,
  };
}

/**
 * Fetch a specific position by address
 */
export async function fetchPosition(
  positionAddress: string,
  options: FetchPositionOptions = {}
): Promise<MeteoraPosition | null> {
  const { network = 'mainnet-beta' } = options;
  const baseUrl = METEORA_API_URLS[network];

  try {
    // Validate address
    new PublicKey(positionAddress);

    const response = await fetch(`${baseUrl}/position/${positionAddress}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Position not found
      }
      throw new Error(`Meteora API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data || null;
  } catch (error: any) {
    console.error('Error fetching position:', error);
    return null;
  }
}

/**
 * Fetch multiple positions by addresses
 */
export async function fetchPositions(
  positionAddresses: string[],
  options: FetchPositionOptions = {}
): Promise<MeteoraPosition[]> {
  const positions = await Promise.all(
    positionAddresses.map(address => fetchPosition(address, options))
  );

  return positions.filter((p): p is MeteoraPosition => p !== null);
}

/**
 * Filter pools by token address
 */
export function filterPoolsByToken(
  pools: MeteoraPool[],
  tokenAddress: string
): MeteoraPool[] {
  return pools.filter(
    pool =>
      pool.mint_x.toLowerCase() === tokenAddress.toLowerCase() ||
      pool.mint_y.toLowerCase() === tokenAddress.toLowerCase()
  );
}

/**
 * Sort pools by various metrics
 */
export function sortPools(
  pools: MeteoraPool[],
  sortBy: 'liquidity' | 'volume' | 'apr' | 'fees' = 'liquidity'
): MeteoraPool[] {
  return [...pools].sort((a, b) => {
    switch (sortBy) {
      case 'liquidity':
        return parseFloat(b.liquidity) - parseFloat(a.liquidity);
      case 'volume':
        return b.trade_volume_24h - a.trade_volume_24h;
      case 'apr':
        return b.apr - a.apr;
      case 'fees':
        return b.fees_24h - a.fees_24h;
      default:
        return 0;
    }
  });
}
