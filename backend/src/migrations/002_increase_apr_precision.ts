import { db } from '../config/database';

/**
 * Migration: Increase APR field precision
 * Some pools have APR values > 1,000,000% which overflow DECIMAL(10,4)
 */
export async function up(): Promise<void> {
  console.log('🔄 Running migration: Increase APR precision...');

  await db.query(`
    ALTER TABLE pools
    ALTER COLUMN apr TYPE DECIMAL(20, 4);
  `);

  console.log('✅ Migration complete: APR precision increased to DECIMAL(20,4)');
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Decrease APR precision...');

  await db.query(`
    ALTER TABLE pools
    ALTER COLUMN apr TYPE DECIMAL(10, 4);
  `);

  console.log('✅ Rollback complete');
}
