/**
 * Meteora DBC (Dynamic Bonding Curve) API Client
 * Fetches pool data using the DBC TypeScript SDK
 *
 * SDK: @meteora-ag/dynamic-bonding-curve-sdk
 * Docs: https://docs.meteora.ag/developer-guide/guides/dbc/typescript-sdk/sdk-functions
 * Rate limit: 10 requests per second
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

export interface DBCPool {
  pool_address: string;
  pool_name: string;
  base_mint: string;
  quote_mint: string;
  base_symbol?: string;
  quote_symbol?: string;
  base_amount: number;
  quote_amount: number;
  tvl: number;
  volume_24h?: number;
  price: number;
  progress?: number; // Bonding curve progress percentage
  market_cap?: number;
  creator?: string;
}

export interface FetchDBCPoolsOptions {
  network?: 'mainnet-beta' | 'devnet' | 'localhost';
}

// RPC endpoints - Use Helius premium RPC for best performance
const RPC_ENDPOINTS = {
  'mainnet-beta': process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
  'devnet': process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com',
  'localhost': 'http://localhost:8899',
};

/**
 * Fetch all DBC pools from on-chain using SDK
 * Uses DynamicBondingCurveClient.state.getPools()
 */
export async function fetchDBCPools(
  options: FetchDBCPoolsOptions = {}
): Promise<DBCPool[]> {
  const { network = 'mainnet-beta' } = options;

  console.log(`🌊 Fetching DBC pools on-chain (network: ${network})...`);

  try {
    // Create connection to Solana
    const connection = new Connection(RPC_ENDPOINTS[network], 'confirmed');

    // Initialize DBC client
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    // Fetch all virtual pools
    const virtualPools = await dbcClient.state.getPools();

    console.log(`📊 Found ${virtualPools.length} DBC pools`);

    // Transform to our standard format
    const pools: DBCPool[] = await Promise.all(
      virtualPools.map(async (poolAccount) => {
        try {
          const pool = poolAccount.account;
          const poolAddress = poolAccount.publicKey.toString();

          // Get pool config for additional details
          const config = await dbcClient.state.getPoolConfig(pool.config);

          // Calculate pool metrics
          const baseAmount = pool.poolBaseAmount.toNumber();
          const quoteAmount = pool.poolQuoteAmount.toNumber();
          const price = quoteAmount > 0 ? baseAmount / quoteAmount : 0;

          // Calculate bonding curve progress
          const progress = config ? calculateProgress(pool, config) : 0;

          return {
            pool_address: poolAddress,
            pool_name: pool.name || 'Unknown Pool',
            base_mint: pool.baseMint.toString(),
            quote_mint: pool.quoteMint.toString(),
            base_symbol: pool.symbol || 'UNKNOWN',
            quote_symbol: 'SOL', // Most DBC pools use SOL as quote
            base_amount: baseAmount,
            quote_amount: quoteAmount,
            tvl: quoteAmount * 2, // Rough estimate: 2x quote amount
            price,
            progress,
            creator: pool.creator?.toString(),
          };
        } catch (error) {
          console.warn(`⚠️ Error processing pool ${poolAccount.publicKey.toString()}:`, error);
          return null;
        }
      })
    );

    // Filter out null entries
    const validPools = pools.filter((p): p is DBCPool => p !== null);

    console.log(`✅ Successfully processed ${validPools.length} DBC pools`);
    return validPools;
  } catch (error: any) {
    console.error('❌ Error fetching DBC pools:', error.message);
    // Return empty array instead of throwing to prevent breaking the app
    return [];
  }
}

/**
 * Fetch a specific DBC pool by address
 */
export async function fetchDBCPool(
  poolAddress: string,
  options: FetchDBCPoolsOptions = {}
): Promise<DBCPool | null> {
  const { network = 'mainnet-beta' } = options;

  console.log(`🔍 Fetching DBC pool: ${poolAddress}`);

  try {
    const connection = new Connection(RPC_ENDPOINTS[network], 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    // Fetch specific pool
    const pool = await dbcClient.state.getPool(new PublicKey(poolAddress));

    if (!pool) {
      console.warn(`Pool not found: ${poolAddress}`);
      return null;
    }

    // Get pool config
    const config = await dbcClient.state.getPoolConfig(pool.config);

    // Calculate metrics
    const baseAmount = pool.poolBaseAmount.toNumber();
    const quoteAmount = pool.poolQuoteAmount.toNumber();
    const price = quoteAmount > 0 ? baseAmount / quoteAmount : 0;
    const progress = config ? calculateProgress(pool, config) : 0;

    return {
      pool_address: poolAddress,
      pool_name: pool.name || 'Unknown Pool',
      base_mint: pool.baseMint.toString(),
      quote_mint: pool.quoteMint.toString(),
      base_symbol: pool.symbol || 'UNKNOWN',
      quote_symbol: 'SOL',
      base_amount: baseAmount,
      quote_amount: quoteAmount,
      tvl: quoteAmount * 2,
      price,
      progress,
      creator: pool.creator?.toString(),
    };
  } catch (error: any) {
    console.error(`❌ Error fetching DBC pool ${poolAddress}:`, error.message);
    return null;
  }
}

/**
 * Calculate bonding curve progress percentage
 */
function calculateProgress(pool: any, config: any): number {
  try {
    const currentPrice = pool.poolQuoteAmount.toNumber() / pool.poolBaseAmount.toNumber();
    const initialPrice = config.initialPrice?.toNumber() || 0;
    const finalPrice = config.finalPrice?.toNumber() || 0;

    if (finalPrice <= initialPrice) return 0;

    const progress = ((currentPrice - initialPrice) / (finalPrice - initialPrice)) * 100;
    return Math.max(0, Math.min(100, progress)); // Clamp between 0-100
  } catch {
    return 0;
  }
}

/**
 * Transform DBC pool to Jupiter Pool format for UI compatibility
 */
export function transformDBCPoolToPool(dbcPool: DBCPool): any {
  const baseSymbol = dbcPool.base_symbol || 'UNKNOWN';
  const quoteSymbol = dbcPool.quote_symbol || 'SOL';

  return {
    id: dbcPool.pool_address,
    chain: 'solana',
    dex: 'Meteora',
    type: 'dbc',
    createdAt: new Date().toISOString(),
    bondingCurve: {
      progress: dbcPool.progress || 0,
    },
    volume24h: dbcPool.volume_24h,
    isUnreliable: false,
    updatedAt: new Date().toISOString(),
    price: dbcPool.price,

    baseAsset: {
      id: dbcPool.base_mint,
      name: baseSymbol,
      symbol: baseSymbol,
      icon: undefined,
      decimals: 9,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      launchpad: 'met-dbc',
      holderCount: undefined,
      fdv: dbcPool.market_cap,
      mcap: dbcPool.market_cap,
      usdPrice: undefined,
      liquidity: dbcPool.tvl,
      stats24h: {
        volumeChange: undefined,
        priceChange: undefined,
        liquidityChange: undefined,
        holderChange: undefined,
        buyVolume: (dbcPool.volume_24h || 0) / 2,
        sellVolume: (dbcPool.volume_24h || 0) / 2,
        numBuys: undefined,
        numSells: undefined,
        numTraders: undefined,
      },
      organicScoreLabel: 'medium' as const,
    },

    quoteAsset: {
      id: dbcPool.quote_mint,
      symbol: quoteSymbol,
      name: quoteSymbol,
    },

    // DBC-specific fields
    tvl: dbcPool.tvl,
    progress: dbcPool.progress,
    creator: dbcPool.creator,
  };
}
