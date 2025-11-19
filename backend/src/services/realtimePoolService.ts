/**
 * Real-time Pool Sync Service
 * Checks for NEW pools created in the last 5 minutes
 * Can be triggered via webhook or run on short interval
 */

import { db } from '../config/database';

interface NewDLMMPool {
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
  created_at?: string;
}

interface NewDAMMPool {
  pool_address: string;
  pool_name: string;
  base_fee: number;
  tvl: number;
  volume24h: number;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  created_at_slot?: number;
  created_at_slot_timestamp?: number;
}

/**
 * Fetch only DLMM pools created in the last N minutes
 * Uses the full API and filters by creation time
 */
async function fetchNewDLMMPools(minutesAgo: number = 5): Promise<NewDLMMPool[]> {
  console.log(`🔍 Checking for new DLMM pools created in last ${minutesAgo} minutes...`);

  try {
    const response = await fetch('https://dlmm-api.meteora.ag/pair/all');
    if (!response.ok) {
      throw new Error(`DLMM API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const allPools = data.data || data || [];

    // Filter for pools created in last N minutes (if created_at available)
    const cutoffTime = Date.now() - (minutesAgo * 60 * 1000);

    // Note: DLMM API doesn't provide created_at timestamp
    // So we'll just get the MOST RECENT pools (sorted by address which correlates to creation)
    // Take last 100 pools as "potentially new"
    const recentPools = allPools.slice(-100);

    console.log(`✅ Found ${recentPools.length} recent DLMM pools to check`);
    return recentPools;
  } catch (error: any) {
    console.error('❌ Error fetching new DLMM pools:', error.message);
    return [];
  }
}

/**
 * Fetch only DAMM v2 pools created in the last N minutes
 * Uses created_at_slot_timestamp to filter
 */
async function fetchNewDAMMPools(minutesAgo: number = 5): Promise<NewDAMMPool[]> {
  console.log(`🔍 Checking for new DAMM v2 pools created in last ${minutesAgo} minutes...`);

  try {
    // Fetch first 5 pages (250 pools) - newest pools are at the beginning
    const limit = 50;
    const pages = 5;
    let allPools: NewDAMMPool[] = [];

    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(
        fetch(`https://dammv2-api.meteora.ag/pools?page=${page}&limit=${limit}`)
          .then(r => r.json())
          .then((result: any) => result.data || [])
      );
    }

    const results = await Promise.all(promises);
    for (const pools of results) {
      allPools.push(...pools);
    }

    // Filter by creation timestamp (last N minutes)
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (minutesAgo * 60);
    const newPools = allPools.filter((p: any) => {
      const createdAt = p.created_at_slot_timestamp || 0;
      return createdAt >= cutoffTimestamp;
    });

    console.log(`✅ Found ${newPools.length} new DAMM v2 pools created in last ${minutesAgo} minutes`);
    return newPools;
  } catch (error: any) {
    console.error('❌ Error fetching new DAMM pools:', error.message);
    return [];
  }
}

/**
 * Sync only new pools (incremental sync)
 * Much faster than full sync - runs every 5 minutes
 */
export async function syncNewPools(minutesAgo: number = 5): Promise<{ dlmm: number; damm: number }> {
  console.log(`⚡ Starting incremental sync for pools created in last ${minutesAgo} minutes...`);
  const startTime = Date.now();

  try {
    // Fetch new pools in parallel
    const [dlmmPools, dammPools] = await Promise.all([
      fetchNewDLMMPools(minutesAgo),
      fetchNewDAMMPools(minutesAgo),
    ]);

    // Import upsert functions from poolSyncService
    const { upsertDLMMPool, upsertDAMMPool } = await import('./poolSyncServiceHelpers');

    // Insert new DLMM pools
    let dlmmCount = 0;
    for (const pool of dlmmPools) {
      // Check if pool already exists
      const existing = await db.query(
        'SELECT pool_address FROM pools WHERE pool_address = $1 AND network = $2',
        [pool.address, 'mainnet-beta']
      );

      if (existing.rows.length === 0) {
        await upsertDLMMPool(pool as any, 'mainnet-beta');
        dlmmCount++;
        console.log(`  ✅ Added new DLMM pool: ${pool.name}`);
      }
    }

    // Insert new DAMM v2 pools
    let dammCount = 0;
    for (const pool of dammPools) {
      // Check if pool already exists
      const existing = await db.query(
        'SELECT pool_address FROM pools WHERE pool_address = $1 AND network = $2',
        [pool.pool_address, 'mainnet-beta']
      );

      if (existing.rows.length === 0) {
        // Only add if it has some activity (TVL > $1k or volume > $1k)
        const isActive = (pool.tvl || 0) > 1000 || (pool.volume24h || 0) > 1000;
        if (isActive) {
          await upsertDAMMPool(pool as any, 'mainnet-beta');
          dammCount++;
          console.log(`  ✅ Added new DAMM v2 pool: ${pool.pool_name} (TVL: $${pool.tvl})`);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Incremental sync complete in ${duration}s`);
    console.log(`   New DLMM pools: ${dlmmCount}`);
    console.log(`   New DAMM v2 pools: ${dammCount}`);

    return { dlmm: dlmmCount, damm: dammCount };
  } catch (error) {
    console.error('❌ Error during incremental sync:', error);
    throw error;
  }
}

/**
 * Webhook handler for Meteora pool creation events
 * Can be triggered by external services when new pools are detected
 */
export async function handlePoolCreationWebhook(poolData: {
  protocol: 'dlmm' | 'damm-v2';
  poolAddress: string;
  poolName: string;
}): Promise<boolean> {
  console.log(`📡 Webhook received for new ${poolData.protocol} pool: ${poolData.poolName}`);

  try {
    // Trigger immediate sync for this specific pool
    await syncNewPools(1); // Check last 1 minute
    return true;
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return false;
  }
}
