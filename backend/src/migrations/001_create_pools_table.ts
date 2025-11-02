import { db } from '../config/database';

/**
 * Migration: Create pools table
 * This runs automatically on server startup
 */
export async function up(): Promise<void> {
  console.log('🔄 Running migration: Create pools table...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS pools (
      id SERIAL PRIMARY KEY,
      pool_address VARCHAR(64) NOT NULL UNIQUE,
      pool_name VARCHAR(255) NOT NULL,
      protocol VARCHAR(20) NOT NULL, -- 'dlmm', 'damm-v1', 'damm-v2', 'dbc', 'alpha'

      token_a_mint VARCHAR(64) NOT NULL,
      token_b_mint VARCHAR(64) NOT NULL,
      token_a_symbol VARCHAR(50),
      token_b_symbol VARCHAR(50),

      tvl DECIMAL(20, 2) DEFAULT 0,
      volume_24h DECIMAL(20, 2) DEFAULT 0,
      fees_24h DECIMAL(20, 2) DEFAULT 0,
      apr DECIMAL(15, 4) DEFAULT 0, -- Increased to handle very high APR values (up to 99,999,999,999.9999%)

      metadata JSONB NOT NULL DEFAULT '{}',

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_synced_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('📊 Creating indexes for fast token CA searches...');

  // Create indexes for fast searches
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_token_a ON pools(token_a_mint);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_token_b ON pools(token_b_mint);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_protocol ON pools(protocol);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_tvl ON pools(tvl DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_updated ON pools(updated_at DESC);
  `);

  console.log('✅ Migration complete: Pools table created with indexes');
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Drop pools table...');

  await db.query(`
    DROP TABLE IF EXISTS pools;
  `);

  console.log('✅ Rollback complete');
}
