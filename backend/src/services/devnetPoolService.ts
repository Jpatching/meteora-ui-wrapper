/**
 * Devnet Pool Service
 * Simplified: Add devnet pools directly to database without SDK fetching
 *
 * WHY: Devnet RPC/SDK calls are slow and unreliable. It's easier to manually
 * add pool data when creating them than to fetch from on-chain.
 *
 * Usage:
 *   - Use scripts/add-devnet-pool.ts to add pools via CLI
 *   - Use POST /api/pools/devnet/add to add pools via API
 */

import { db } from '../config/database';

interface DevnetPoolData {
  address: string;
  protocol: 'dlmm' | 'damm-v2';
  name?: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol?: string;
  token_b_symbol?: string;
  bin_step?: number;
  active_bin?: number;
  reserve_x?: number;
  reserve_y?: number;
  pool_type?: number;
  tvl?: number;
}

/**
 * Add a devnet pool directly to the database
 * No SDK fetching - just insert the data you provide
 */
export async function addDevnetPool(poolData: DevnetPoolData): Promise<boolean> {
  try {
    console.log(`➕ Adding devnet pool: ${poolData.address} (${poolData.protocol})`);

    const name = poolData.name || `${poolData.token_a_symbol || 'TOKEN-A'}-${poolData.token_b_symbol || 'TOKEN-B'}`;
    const token_a_symbol = poolData.token_a_symbol || 'TOKEN-A';
    const token_b_symbol = poolData.token_b_symbol || 'TOKEN-B';

    // Build metadata based on protocol
    const metadata: any = {
      network: 'devnet',
    };

    if (poolData.protocol === 'dlmm') {
      metadata.bin_step = poolData.bin_step || 100;
      metadata.active_bin = poolData.active_bin;
      metadata.reserve_x = poolData.reserve_x || 0;
      metadata.reserve_y = poolData.reserve_y || 0;
    } else if (poolData.protocol === 'damm-v2') {
      metadata.pool_type = poolData.pool_type || 0;
    }

    // Ensure network column exists
    try {
      await db.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta'`);
    } catch (e) {
      // Column already exists
    }

    // Upsert to database
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
        metadata = EXCLUDED.metadata,
        last_synced_at = NOW()`,
      [
        poolData.address,
        name,
        poolData.protocol,
        poolData.token_a_mint,
        poolData.token_b_mint,
        token_a_symbol,
        token_b_symbol,
        poolData.tvl || 0,
        0, // volume_24h
        0, // fees_24h
        0, // apr
        JSON.stringify(metadata),
        'devnet',
      ]
    );

    console.log(`✅ Added devnet pool: ${name} (${poolData.protocol})`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error adding devnet pool ${poolData.address}:`, error.message);
    return false;
  }
}

/**
 * Get all devnet pools from database
 */
export async function getDevnetPools(protocol?: 'dlmm' | 'damm-v2'): Promise<any[]> {
  try {
    let query = `SELECT * FROM pools WHERE network = 'devnet'`;
    const params: any[] = [];

    if (protocol) {
      query += ` AND protocol = $1`;
      params.push(protocol);
    }

    query += ` ORDER BY last_synced_at DESC`;

    const result = await db.query(query, params);
    console.log(`📊 Found ${result.rows.length} devnet pools`);
    return result.rows;
  } catch (error: any) {
    console.error('❌ Error fetching devnet pools:', error.message);
    return [];
  }
}

/**
 * Get a specific devnet pool from database
 */
export async function getDevnetPool(address: string): Promise<any | null> {
  try {
    const result = await db.query(
      `SELECT * FROM pools WHERE pool_address = $1 AND network = 'devnet'`,
      [address]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error: any) {
    console.error(`❌ Error fetching devnet pool ${address}:`, error.message);
    return null;
  }
}

/**
 * Update devnet pool metadata (e.g., after adding liquidity)
 */
export async function updateDevnetPoolMetadata(
  address: string,
  metadata: Partial<DevnetPoolData>
): Promise<boolean> {
  try {
    console.log(`🔄 Updating devnet pool: ${address}`);

    // Get existing pool data
    const pool = await getDevnetPool(address);
    if (!pool) {
      console.error(`❌ Pool ${address} not found`);
      return false;
    }

    // Merge existing metadata with new metadata
    const existingMetadata = typeof pool.metadata === 'string'
      ? JSON.parse(pool.metadata)
      : pool.metadata;
    const updatedMetadata = { ...existingMetadata, ...metadata };

    // Update database
    await db.query(
      `UPDATE pools SET metadata = $1, last_synced_at = NOW() WHERE pool_address = $2 AND network = 'devnet'`,
      [JSON.stringify(updatedMetadata), address]
    );

    console.log(`✅ Updated devnet pool metadata`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error updating devnet pool ${address}:`, error.message);
    return false;
  }
}

/**
 * Delete a devnet pool from database
 */
export async function deleteDevnetPool(address: string): Promise<boolean> {
  try {
    console.log(`🗑️  Deleting devnet pool: ${address}`);

    const result = await db.query(
      `DELETE FROM pools WHERE pool_address = $1 AND network = 'devnet'`,
      [address]
    );

    if (result.rowCount === 0) {
      console.error(`❌ Pool ${address} not found`);
      return false;
    }

    console.log(`✅ Deleted devnet pool`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error deleting devnet pool ${address}:`, error.message);
    return false;
  }
}


/**
 * Sync devnet pools (stub implementation)
 * Devnet pools are added manually via addDevnetPool()
 */
export async function syncDevnetPools(): Promise<void> {
  console.log("⚠️ syncDevnetPools: Devnet pools must be added manually");
  console.log("💡 Use addDevnetPool() or POST /api/pools/devnet/add to add pools");
}

