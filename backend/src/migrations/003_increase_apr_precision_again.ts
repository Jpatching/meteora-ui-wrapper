import { db } from '../config/database';

/**
 * Migration: Increase APR field precision AGAIN
 * Some pools have APR > 100 billion % (!!!)
 * DECIMAL(15,4) max: 99,999,999,999.9999 (100 billion)
 * DECIMAL(20,4) max: 9,999,999,999,999,999.9999 (10 quadrillion)
 */
export async function up(): Promise<void> {
  console.log('🔄 Running migration: Increase APR precision to DECIMAL(20,4)...');

  await db.query(`
    ALTER TABLE pools
    ALTER COLUMN apr TYPE DECIMAL(20, 4);
  `);

  console.log('✅ Migration complete: APR precision increased to DECIMAL(20,4)');
  console.log('   Max APR value: 9,999,999,999,999,999.9999%');
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Decrease APR precision...');

  await db.query(`
    ALTER TABLE pools
    ALTER COLUMN apr TYPE DECIMAL(15, 4);
  `);

  console.log('✅ Rollback complete');
}
