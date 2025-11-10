/**
 * Migration 004: Add network column to pools table
 * Adds network support (mainnet-beta vs devnet) and updates unique constraint
 */

import { db } from '../config/database';

export async function up() {
  console.log('🔄 Running migration: Add network column and update constraints...');

  // Add network column with default value
  await db.query(`
    ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta'
  `);

  // Update existing rows to have mainnet-beta as network
  await db.query(`
    UPDATE pools SET network = 'mainnet-beta' WHERE network IS NULL
  `);

  // Make network NOT NULL after setting default values
  await db.query(`
    ALTER TABLE pools ALTER COLUMN network SET NOT NULL
  `);

  // Drop old unique constraint on pool_address only
  await db.query(`
    ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_pool_address_key
  `);

  // Add composite unique constraint on (pool_address, network) if it doesn't exist
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pools_address_network_unique'
      ) THEN
        ALTER TABLE pools ADD CONSTRAINT pools_address_network_unique UNIQUE (pool_address, network);
      END IF;
    END $$;
  `);

  // Add indexes for network filtering
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_network ON pools(network)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_protocol_network ON pools(protocol, network)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pools_network_tvl ON pools(network, tvl DESC)
  `);

  console.log('✅ Migration complete: Network column added and constraints updated');
  console.log('   - Added network column (mainnet-beta/devnet)');
  console.log('   - Updated unique constraint to (pool_address, network)');
  console.log('   - Added network filtering indexes');
}

export async function down() {
  // Revert migration (optional, for rollback support)
  await db.query(`DROP INDEX IF EXISTS idx_pools_network_tvl`);
  await db.query(`DROP INDEX IF EXISTS idx_pools_protocol_network`);
  await db.query(`DROP INDEX IF EXISTS idx_pools_network`);
  await db.query(`ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_address_network_unique`);
  await db.query(`ALTER TABLE pools ADD CONSTRAINT pools_pool_address_key UNIQUE (pool_address)`);
  await db.query(`ALTER TABLE pools DROP COLUMN IF EXISTS network`);
}
