/**
 * Pool Sync Service
 * Fetches ALL pools from Meteora APIs and stores in PostgreSQL
 * Runs periodically to keep data fresh
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { db } from '../config/database';
import { getTokenMetadata } from './tokenMetadataService';

interface DLMMPool {
  address: string;
  name: string;
  bin_step: number;
  base_fee_percentage: string;
  liquidity: string;
  trade_volume_24h: number;
  fees_24h: number;
  apr: number;
  mint_x: string;
  mint_y: string;
  // ... other fields
}

interface DAMMPool {
  pool_address: string;
  pool_name: string;
  base_fee: number;
  tvl: number; // Often 0 in API - calculate from token amounts
  volume24h: number;
  fee24h: number;
  apr: number;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  token_a_amount_usd?: number; // Use this to calculate TVL
  token_b_amount_usd?: number; // Use this to calculate TVL
  pool_type: number;
  tokens_verified?: boolean;
  has_farm?: boolean;
}

interface DAMMv1Pool {
  pool_address: string;
  pool_name: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  token_a_amount: number;
  token_b_amount: number;
  tvl: number;
  volume_24h?: number;
  fees_24h?: number;
  apr?: number;
}

interface DBCPool {
  pool_address: string;
  pool_name: string;
  base_mint: string;
  quote_mint: string;
  base_symbol: string;
  quote_symbol: string;
  base_amount: number;
  quote_amount: number;
  tvl: number;
  price: number;
  progress?: number;
  creator?: string;
}

// RPC endpoint for on-chain fetching
const RPC_ENDPOINT = process.env.MAINNET_RPC || process.env.DATABASE_URL?.includes('localhost')
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com';

/**
 * Fetch ALL DLMM pools (not paginated - get everything!)
 */
async function fetchAllDLMMPools(): Promise<DLMMPool[]> {
  console.log('🌊 Fetching ALL DLMM pools from Meteora API...');

  try {
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    if (!response.ok) {
      throw new Error(`DLMM API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const pools = data.data || data || [];
    console.log(`✅ Fetched ${pools.length} DLMM pools`);
    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DLMM pools:', error.message);
    return [];
  }
}

/**
 * Fetch TOP DAMM v2 pools sorted by TVL
 * API returns 233k+ pools total, but we only want active ones with real TVL
 */
async function fetchAllDAMMPools(): Promise<DAMMPool[]> {
  console.log('🌊 Fetching TOP DAMM v2 pools from Meteora API (sorted by TVL)...');

  try {
    // CRITICAL: Use order_by=tvl to get pools with actual liquidity!
    // Without this, API returns oldest/inactive pools first
    const response = await fetch('https://dammv2-api.meteora.ag/pools?limit=1000&order_by=tvl&order=desc');
    if (!response.ok) {
      throw new Error(`DAMM API error: ${response.status}`);
    }

    const result = await response.json() as any;
    const pools = result.data || [];

    // Filter out pools with very low TVL (likely abandoned)
    const activePools = pools.filter((p: any) => p.tvl > 1); // At least $1 TVL

    console.log(`✅ Fetched ${pools.length} DAMM v2 pools, ${activePools.length} active (TVL > $1)`);
    return activePools;
  } catch (error: any) {
    console.error('❌ Error fetching DAMM pools:', error.message);
    return [];
  }
}

/**
 * Fetch TOP DAMM v1 pools using REST API
 * DISABLED: DAMM v1 is legacy protocol, no longer needed
 */
async function fetchAllDAMMv1Pools(): Promise<DAMMv1Pool[]> {
  console.log('⚠️  DAMM v1 pool fetching disabled (legacy protocol not needed)');
  return [];
}

/**
 * Fetch DBC pools using on-chain SDK
 * DISABLED: No REST API available, RPC scan limits prevent fetching all pools
 */
async function fetchAllDBCPools(): Promise<DBCPool[]> {
  console.log('⚠️  DBC pool fetching disabled (no API available, RPC limits)');
  return [];
}

/**
 * Upsert DLMM pool into database
 * NOW WITH TOKEN METADATA ENRICHMENT from Jupiter API!
 */
async function upsertDLMMPool(pool: DLMMPool): Promise<void> {
  // Fetch token metadata from Jupiter API (30k+ tokens)
  const [tokenAMetadata, tokenBMetadata] = await Promise.all([
    getTokenMetadata(pool.mint_x),
    getTokenMetadata(pool.mint_y),
  ]);

  // Use symbols from Jupiter API (priority 1)
  // Fallback to parsing pool name (priority 2)
  // Fallback to empty string (priority 3)
  const nameParts = (pool.name || '').split('-');
  const token_a_symbol = tokenAMetadata?.symbol || nameParts[0]?.trim() || '';
  const token_b_symbol = tokenBMetadata?.symbol || nameParts[1]?.trim() || '';

  const metadata = {
    bin_step: pool.bin_step,
    base_fee_percentage: pool.base_fee_percentage,
    current_price: (pool as any).current_price,
    reserve_x: (pool as any).reserve_x,
    reserve_y: (pool as any).reserve_y,
  };

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (pool_address)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
      token_a_symbol = EXCLUDED.token_a_symbol,
      token_b_symbol = EXCLUDED.token_b_symbol,
      tvl = EXCLUDED.tvl,
      volume_24h = EXCLUDED.volume_24h,
      fees_24h = EXCLUDED.fees_24h,
      apr = EXCLUDED.apr,
      metadata = EXCLUDED.metadata,
      last_synced_at = NOW()`,
    [
      pool.address,
      pool.name,
      'dlmm',
      pool.mint_x,
      pool.mint_y,
      token_a_symbol,
      token_b_symbol,
      parseFloat(pool.liquidity) || 0,
      pool.trade_volume_24h || 0,
      pool.fees_24h || 0,
      pool.apr || 0,
      JSON.stringify(metadata),
    ]
  );
}

/**
 * Upsert DAMM pool into database
 * NOW WITH TOKEN METADATA ENRICHMENT from Jupiter API!
 */
async function upsertDAMMPool(pool: DAMMPool): Promise<void> {
  // Fetch token metadata from Jupiter API (30k+ tokens)
  const [tokenAMetadata, tokenBMetadata] = await Promise.all([
    getTokenMetadata(pool.token_a_mint),
    getTokenMetadata(pool.token_b_mint),
  ]);

  // Use symbols from Jupiter API (priority 1)
  // Fallback to Meteora API symbols (priority 2)
  // Fallback to parsing pool name (priority 3)
  // Fallback to empty string (priority 4)
  const nameParts = (pool.pool_name || '').split('-');
  const token_a_symbol = tokenAMetadata?.symbol || pool.token_a_symbol || nameParts[0]?.trim() || '';
  const token_b_symbol = tokenBMetadata?.symbol || pool.token_b_symbol || nameParts[1]?.trim() || '';

  // Use API's TVL if available (when sorted by TVL, API returns correct values)
  // Otherwise calculate from token amounts as fallback
  const tvl = pool.tvl > 0
    ? pool.tvl
    : ((pool.token_a_amount_usd || 0) + (pool.token_b_amount_usd || 0));

  const metadata = {
    base_fee: pool.base_fee,
    pool_type: pool.pool_type,
    tokens_verified: pool.tokens_verified,
    has_farm: pool.has_farm,
  };

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (pool_address)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
      token_a_symbol = EXCLUDED.token_a_symbol,
      token_b_symbol = EXCLUDED.token_b_symbol,
      tvl = EXCLUDED.tvl,
      volume_24h = EXCLUDED.volume_24h,
      fees_24h = EXCLUDED.fees_24h,
      apr = EXCLUDED.apr,
      metadata = EXCLUDED.metadata,
      last_synced_at = NOW()`,
    [
      pool.pool_address,
      pool.pool_name,
      'damm-v2',
      pool.token_a_mint,
      pool.token_b_mint,
      token_a_symbol,
      token_b_symbol,
      tvl,
      pool.volume24h || 0,
      pool.fee24h || 0,
      pool.apr || 0,
      JSON.stringify(metadata),
    ]
  );
}

/**
 * Upsert DAMM v1 pool into database
 */
async function upsertDAMMv1Pool(pool: DAMMv1Pool): Promise<void> {
  const metadata = {
    token_a_amount: pool.token_a_amount,
    token_b_amount: pool.token_b_amount,
  };

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (pool_address)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
      token_a_symbol = EXCLUDED.token_a_symbol,
      token_b_symbol = EXCLUDED.token_b_symbol,
      tvl = EXCLUDED.tvl,
      volume_24h = EXCLUDED.volume_24h,
      fees_24h = EXCLUDED.fees_24h,
      apr = EXCLUDED.apr,
      metadata = EXCLUDED.metadata,
      last_synced_at = NOW()`,
    [
      pool.pool_address,
      pool.pool_name,
      'damm-v1',
      pool.token_a_mint,
      pool.token_b_mint,
      pool.token_a_symbol,
      pool.token_b_symbol,
      pool.tvl || 0,
      pool.volume_24h || 0,
      pool.fees_24h || 0,
      pool.apr || 0,
      JSON.stringify(metadata),
    ]
  );
}

/**
 * Upsert DBC pool into database
 */
async function upsertDBCPool(pool: DBCPool): Promise<void> {
  const metadata = {
    base_amount: pool.base_amount,
    quote_amount: pool.quote_amount,
    price: pool.price,
    progress: pool.progress,
    creator: pool.creator,
  };

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (pool_address)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
      token_a_symbol = EXCLUDED.token_a_symbol,
      token_b_symbol = EXCLUDED.token_b_symbol,
      tvl = EXCLUDED.tvl,
      volume_24h = EXCLUDED.volume_24h,
      fees_24h = EXCLUDED.fees_24h,
      apr = EXCLUDED.apr,
      metadata = EXCLUDED.metadata,
      last_synced_at = NOW()`,
    [
      pool.pool_address,
      pool.pool_name,
      'dbc',
      pool.base_mint,
      pool.quote_mint,
      pool.base_symbol,
      pool.quote_symbol,
      pool.tvl || 0,
      0, // volume_24h - not available on-chain
      0, // fees_24h - not available on-chain
      0, // apr - not available on-chain
      JSON.stringify(metadata),
    ]
  );
}

/**
 * Sync all pools to database
 * This can take a while (100k+ pools) but runs in background
 */
export async function syncAllPools(): Promise<{ dlmm: number; damm: number; dammv1: number; dbc: number }> {
  console.log('🔄 Starting full pool sync...');
  const startTime = Date.now();

  try {
    // Fetch all pools in parallel
    const [dlmmPools, dammPools, dammv1Pools, dbcPools] = await Promise.all([
      fetchAllDLMMPools(),
      fetchAllDAMMPools(),
      fetchAllDAMMv1Pools(),
      fetchAllDBCPools(),
    ]);

    // Batch insert DLMM pools
    console.log(`💾 Syncing ${dlmmPools.length} DLMM pools to database...`);
    for (const pool of dlmmPools) {
      await upsertDLMMPool(pool);
    }

    // Batch insert DAMM v2 pools
    console.log(`💾 Syncing ${dammPools.length} DAMM v2 pools to database...`);
    let dammSuccess = 0;
    let dammErrors = 0;
    for (const pool of dammPools) {
      try {
        await upsertDAMMPool(pool);
        dammSuccess++;
      } catch (error: any) {
        dammErrors++;
        console.error(`❌ Error syncing DAMM v2 pool ${pool.pool_name}:`, error.message);
        if (dammErrors <= 3) {
          console.error(`   Pool data:`, JSON.stringify(pool, null, 2));
        }
      }
    }
    console.log(`✅ DAMM v2 sync complete: ${dammSuccess} success, ${dammErrors} errors`);

    // Batch insert DAMM v1 pools
    console.log(`💾 Syncing ${dammv1Pools.length} DAMM v1 pools to database...`);
    let dammv1Success = 0;
    let dammv1Errors = 0;
    for (const pool of dammv1Pools) {
      try {
        await upsertDAMMv1Pool(pool);
        dammv1Success++;
      } catch (error: any) {
        dammv1Errors++;
        console.error(`❌ Error syncing DAMM v1 pool ${pool.pool_name}:`, error.message);
        if (dammv1Errors <= 3) {
          console.error(`   Pool data:`, JSON.stringify(pool, null, 2));
        }
      }
    }
    console.log(`✅ DAMM v1 sync complete: ${dammv1Success} success, ${dammv1Errors} errors`);

    // Batch insert DBC pools
    console.log(`💾 Syncing ${dbcPools.length} DBC pools to database...`);
    let dbcSuccess = 0;
    let dbcErrors = 0;
    for (const pool of dbcPools) {
      try {
        await upsertDBCPool(pool);
        dbcSuccess++;
      } catch (error: any) {
        dbcErrors++;
        console.error(`❌ Error syncing DBC pool ${pool.pool_name}:`, error.message);
        if (dbcErrors <= 3) {
          console.error(`   Pool data:`, JSON.stringify(pool, null, 2));
        }
      }
    }
    console.log(`✅ DBC sync complete: ${dbcSuccess} success, ${dbcErrors} errors`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Pool sync complete in ${duration}s`);
    console.log(`   DLMM: ${dlmmPools.length} pools`);
    console.log(`   DAMM v2: ${dammPools.length} pools`);
    console.log(`   DAMM v1: ${dammv1Pools.length} pools`);
    console.log(`   DBC: ${dbcPools.length} pools`);

    return {
      dlmm: dlmmPools.length,
      damm: dammPools.length,
      dammv1: dammv1Pools.length,
      dbc: dbcPools.length
    };
  } catch (error) {
    console.error('❌ Error during pool sync:', error);
    throw error;
  }
}

/**
 * Get pools by token CA (contract address)
 * Searches both token_a and token_b
 */
export async function getPoolsByToken(tokenCA: string): Promise<any[]> {
  const result = await db.query(
    `SELECT * FROM pools
     WHERE token_a_mint = $1 OR token_b_mint = $1
     ORDER BY tvl DESC
     LIMIT 100`,
    [tokenCA]
  );

  return result.rows;
}

/**
 * Get top pools (for dashboard)
 * Can also fetch a specific pool by address
 */
export async function getTopPools(
  protocol?: string,
  limit: number = 100,
  poolAddress?: string
): Promise<any[]> {
  let query = 'SELECT * FROM pools';
  const params: any[] = [];
  const conditions: string[] = [];

  // Filter by pool address (exact match)
  if (poolAddress) {
    conditions.push(`pool_address = $${params.length + 1}`);
    params.push(poolAddress);
  }

  // Filter by protocol
  if (protocol) {
    conditions.push(`protocol = $${params.length + 1}`);
    params.push(protocol);
  }

  // Add WHERE clause if we have conditions
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add ORDER BY and LIMIT only if not searching by address
  if (!poolAddress) {
    query += ' ORDER BY tvl DESC';
  }

  query += ` LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await db.query(query, params);
  return result.rows;
}
