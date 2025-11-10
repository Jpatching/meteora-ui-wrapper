/**
 * Migration 005: Create token_creation_timestamps table
 * Stores blockchain-verified token creation timestamps for accurate age display
 */

import { db } from '../config/database';

export async function up() {
  console.log('🔄 Running migration: Create token_creation_timestamps table...');

  // Create table for storing token creation timestamps
  await db.query(`
    CREATE TABLE IF NOT EXISTS token_creation_timestamps (
      mint VARCHAR(44) PRIMARY KEY,
      creation_timestamp BIGINT NOT NULL,
      creation_slot BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create index for faster lookups
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_token_timestamps_mint ON token_creation_timestamps(mint)
  `);

  console.log('✅ Migration complete: token_creation_timestamps table created');
  console.log('   - Added mint (primary key)');
  console.log('   - Added creation_timestamp (Unix timestamp)');
  console.log('   - Added creation_slot (Solana slot number)');
  console.log('   - Added index on mint for fast lookups');
}

export async function down() {
  // Revert migration (optional, for rollback support)
  await db.query(`DROP INDEX IF EXISTS idx_token_timestamps_mint`);
  await db.query(`DROP TABLE IF EXISTS token_creation_timestamps`);
}
