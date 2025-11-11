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
 * Fetch TOP DLMM pools sorted by 24h volume
 * API returns 120k+ pools total, but syncing all takes 10+ minutes and times out
 * Instead get top 5000 by volume (plenty for discovery, includes all active pools)
 */
async function fetchAllDLMMPools(): Promise<DLMMPool[]> {
  console.log('🌊 Fetching ALL DLMM pools from Meteora API...');

  try {
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    if (!response.ok) {
      throw new Error(`DLMM API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const allPools = data.data || data || [];
    console.log(`📊 Fetched ${allPools.length} total DLMM pools from API`);

    // Sort by 24h volume descending and take top 5000
    const sorted = allPools.sort((a: DLMMPool, b: DLMMPool) => {
      return (b.trade_volume_24h || 0) - (a.trade_volume_24h || 0);
    });

    const top5000 = sorted.slice(0, 5000);
    console.log(`✅ Selected top ${top5000.length} DLMM pools by 24h volume`);
    return top5000;
  } catch (error: any) {
    console.error('❌ Error fetching DLMM pools:', error.message);
    return [];
  }
}

/**
 * Fetch TOP DAMM v2 pools sorted by 24h volume
 * API returns 258k+ pools total, we only want top active ones (like charting.ag)
 * Fetching ALL pools takes 10+ minutes - instead get top 2000 by volume
 */
async function fetchAllDAMMPools(): Promise<DAMMPool[]> {
  console.log('🌊 Fetching active DAMM v2 pools from Meteora API...');

  try {
    let allPools: DAMMPool[] = [];
    const limit = 50; // API max per page
    const maxPages = 200; // Fetch 10,000 pools (200 pages * 50)

    console.log(`📊 Fetching ${maxPages * limit} DAMM v2 pools (will filter for active pools with volume > $1k)...`);

    // Fetch pages in parallel batches of 20 for speed
    const batchSize = 20;
    for (let batchStart = 1; batchStart <= maxPages; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, maxPages);
      const promises = [];

      for (let page = batchStart; page <= batchEnd; page++) {
        // Note: Meteora API doesn't support sort_by parameter - returns in creation order
        // We'll sort client-side after fetching
        promises.push(
          fetch(`https://dammv2-api.meteora.ag/pools?page=${page}&limit=${limit}`)
            .then(r => r.json())
            .then((result: any) => result.data || [])
            .catch((err) => {
              console.error(`Failed to fetch page ${page}:`, err.message);
              return [];
            })
        );
      }

      const batchResults = await Promise.all(promises);
      for (const pools of batchResults) {
        allPools.push(...pools);
      }

      console.log(`   Fetched pages ${batchStart}-${batchEnd} (${allPools.length} total pools)`);
    }

    console.log(`📊 Downloaded ${allPools.length} DAMM v2 pools, filtering for active pools...`);

    // Filter for ACTIVE pools only (volume > $1000 in last 24h OR TVL > $5000)
    const activePools = allPools.filter((p: DAMMPool) => {
      const hasVolume = (p.volume24h || 0) > 1000; // $1k+ volume/24h
      const hasTVL = (p.tvl || 0) > 5000; // $5k+ TVL
      return hasVolume || hasTVL;
    });

    console.log(`✅ Filtered to ${activePools.length} active DAMM v2 pools (volume > $1k OR TVL > $5k)`);

    // Sort by 24h volume descending (most active first)
    const sorted = activePools.sort((a, b) => {
      return (b.volume24h || 0) - (a.volume24h || 0);
    });

    console.log(`✅ Sorted pools by 24h volume (top pool: ${sorted[0]?.pool_name || 'none'} with $${sorted[0]?.volume24h?.toFixed(0) || 0} volume)`);

    return sorted;
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
async function upsertDLMMPool(pool: DLMMPool, network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<void> {
  // Parse pool name for fallback
  const nameParts = (pool.name || '').split('-');

  // Fetch token metadata from Jupiter API (for enrichment only)
  const [tokenAMetadata, tokenBMetadata] = await Promise.all([
    getTokenMetadata(pool.mint_x),
    getTokenMetadata(pool.mint_y),
  ]);

  // Priority 1: Pool name parsing (Meteora's own data is most reliable)
  // Priority 2: Jupiter API enrichment
  // Priority 3: 'UNKNOWN' (for proper identification)
  const token_a_symbol = nameParts[0]?.trim() || tokenAMetadata?.symbol || 'UNKNOWN';
  const token_b_symbol = nameParts[1]?.trim() || tokenBMetadata?.symbol || 'UNKNOWN';

  const metadata = {
    bin_step: pool.bin_step,
    base_fee_percentage: pool.base_fee_percentage,
    current_price: (pool as any).current_price,
    reserve_x: (pool as any).reserve_x,
    reserve_y: (pool as any).reserve_y,
    network, // Store network in metadata
  };

  // First, ensure network column exists (migration)
  try {
    await db.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta'`);
  } catch (e) {
    // Column already exists
  }

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, network, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (pool_address, network)
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
      network,
    ]
  );
}

/**
 * Upsert DAMM pool into database
 * NOW WITH TOKEN METADATA ENRICHMENT from Jupiter API!
 */
async function upsertDAMMPool(pool: DAMMPool, network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<void> {
  // Parse pool name for fallback
  const nameParts = (pool.pool_name || '').split('-');

  // Fetch token metadata from Jupiter API (for enrichment only)
  const [tokenAMetadata, tokenBMetadata] = await Promise.all([
    getTokenMetadata(pool.token_a_mint),
    getTokenMetadata(pool.token_b_mint),
  ]);

  // Priority 1: Meteora API symbols (official source)
  // Priority 2: Pool name parsing
  // Priority 3: Jupiter API enrichment
  // Priority 4: 'UNKNOWN' (for proper identification)
  const token_a_symbol = pool.token_a_symbol || nameParts[0]?.trim() || tokenAMetadata?.symbol || 'UNKNOWN';
  const token_b_symbol = pool.token_b_symbol || nameParts[1]?.trim() || tokenBMetadata?.symbol || 'UNKNOWN';

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
    network, // Store network in metadata
  };

  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, network, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (pool_address, network)
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
      network,
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
 *
 * IMPORTANT: Meteora APIs only serve MAINNET data!
 * Devnet pools are fetched separately using SDKs (see devnetPoolService.ts)
 */
export async function syncAllPools(network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<{ dlmm: number; damm: number; dammv1: number; dbc: number }> {
  console.log(`🔄 Starting full pool sync for ${network}...`);
  const startTime = Date.now();

  // If devnet, use SDK-based sync
  if (network === 'devnet') {
    console.log('⚠️  Devnet pools must be added manually via /api/pools/devnet/add');
    console.log('💡 Use syncDevnetPools() to sync known devnet pools');
    const { syncDevnetPools } = await import('./devnetPoolService');
    await syncDevnetPools();
    return { dlmm: 0, damm: 0, dammv1: 0, dbc: 0 };
  }

  try {
    // Fetch all pools in parallel (these are MAINNET pools from Meteora)
    const [dlmmPools, dammPools, dammv1Pools, dbcPools] = await Promise.all([
      fetchAllDLMMPools(),
      fetchAllDAMMPools(),
      fetchAllDAMMv1Pools(),
      fetchAllDBCPools(),
    ]);

    // Batch insert DLMM pools (MAINNET)
    console.log(`💾 Syncing ${dlmmPools.length} DLMM pools to database (mainnet-beta)...`);
    for (const pool of dlmmPools) {
      await upsertDLMMPool(pool, 'mainnet-beta');
    }

    // Batch insert DAMM v2 pools (MAINNET)
    console.log(`💾 Syncing ${dammPools.length} DAMM v2 pools to database (mainnet-beta)...`);
    let dammSuccess = 0;
    let dammErrors = 0;
    for (const pool of dammPools) {
      try {
        await upsertDAMMPool(pool, 'mainnet-beta');
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
  poolAddress?: string,
  network?: 'mainnet-beta' | 'devnet'
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

  // Filter by network (if specified)
  if (network) {
    conditions.push(`network = $${params.length + 1}`);
    params.push(network);
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
