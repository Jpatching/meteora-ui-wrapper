/**
 * Pool Sync Service Helpers
 * Extracted upsert functions for use in both full sync and incremental sync
 */

import { db } from '../config/database';
import { getTokenMetadata } from './tokenMetadataService';

/**
 * Upsert DLMM pool into database
 * NOW WITH TOKEN METADATA ENRICHMENT from Jupiter API!
 */
export async function upsertDLMMPool(pool: any, network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<void> {
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
    current_price: pool.current_price,
    reserve_x: pool.reserve_x,
    reserve_y: pool.reserve_y,
    network,
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
export async function upsertDAMMPool(pool: any, network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<void> {
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
    network,
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
