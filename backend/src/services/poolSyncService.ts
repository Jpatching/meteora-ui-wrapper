/**
 * Pool Sync Service
 * Fetches ALL pools from Meteora APIs and stores in PostgreSQL
 * Runs periodically to keep data fresh
 */

import { db } from '../config/database';

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
 * Fetch ALL DAMM v2 pools
 */
async function fetchAllDAMMPools(): Promise<DAMMPool[]> {
  console.log('🌊 Fetching ALL DAMM v2 pools from Meteora API...');

  try {
    const response = await fetch('https://dammv2-api.meteora.ag/pools');
    if (!response.ok) {
      throw new Error(`DAMM API error: ${response.status}`);
    }

    const result = await response.json() as any;
    const pools = result.data || [];
    console.log(`✅ Fetched ${pools.length} DAMM v2 pools`);
    return pools;
  } catch (error: any) {
    console.error('❌ Error fetching DAMM pools:', error.message);
    return [];
  }
}

/**
 * Upsert DLMM pool into database
 */
async function upsertDLMMPool(pool: DLMMPool): Promise<void> {
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
      tvl, volume_24h, fees_24h, apr,
      metadata, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (pool_address)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
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
 */
async function upsertDAMMPool(pool: DAMMPool): Promise<void> {
  // CRITICAL: Calculate TVL from token amounts since API returns tvl=0 for all pools
  // DAMM v2 API issue: tvl field is always 0, but token_a_amount_usd + token_b_amount_usd has real values
  const calculatedTvl = (pool.token_a_amount_usd || 0) + (pool.token_b_amount_usd || 0);
  const tvl = calculatedTvl > 0 ? calculatedTvl : (pool.tvl || 0);

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
      pool.token_a_symbol,
      pool.token_b_symbol,
      tvl,
      pool.volume24h || 0,
      pool.fee24h || 0,
      pool.apr || 0,
      JSON.stringify(metadata),
    ]
  );
}

/**
 * Sync all pools to database
 * This can take a while (100k+ pools) but runs in background
 */
export async function syncAllPools(): Promise<{ dlmm: number; damm: number }> {
  console.log('🔄 Starting full pool sync...');
  const startTime = Date.now();

  try {
    // Fetch all pools in parallel
    const [dlmmPools, dammPools] = await Promise.all([
      fetchAllDLMMPools(),
      fetchAllDAMMPools(),
    ]);

    // Batch insert DLMM pools
    console.log(`💾 Syncing ${dlmmPools.length} DLMM pools to database...`);
    for (const pool of dlmmPools) {
      await upsertDLMMPool(pool);
    }

    // Batch insert DAMM pools
    console.log(`💾 Syncing ${dammPools.length} DAMM pools to database...`);
    let dammSuccess = 0;
    let dammErrors = 0;
    for (const pool of dammPools) {
      try {
        await upsertDAMMPool(pool);
        dammSuccess++;
      } catch (error: any) {
        dammErrors++;
        console.error(`❌ Error syncing DAMM pool ${pool.pool_name}:`, error.message);
        if (dammErrors <= 3) {
          console.error(`   Pool data:`, JSON.stringify(pool, null, 2));
        }
      }
    }
    console.log(`✅ DAMM sync complete: ${dammSuccess} success, ${dammErrors} errors`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Pool sync complete in ${duration}s`);
    console.log(`   DLMM: ${dlmmPools.length} pools`);
    console.log(`   DAMM: ${dammPools.length} pools`);

    return { dlmm: dlmmPools.length, damm: dammPools.length };
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
 */
export async function getTopPools(
  protocol?: string,
  limit: number = 100
): Promise<any[]> {
  let query = 'SELECT * FROM pools';
  const params: any[] = [];

  if (protocol) {
    query += ' WHERE protocol = $1';
    params.push(protocol);
  }

  query += ' ORDER BY tvl DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await db.query(query, params);
  return result.rows;
}
