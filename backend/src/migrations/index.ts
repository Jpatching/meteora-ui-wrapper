import * as migration001 from './001_create_pools_table';
import * as migration002 from './002_increase_apr_precision';
import * as migration003 from './003_increase_apr_precision_again';

/**
 * List of all migrations in order
 */
const migrations = [
  { version: '001', name: 'create_pools_table', ...migration001 },
  { version: '002', name: 'increase_apr_precision', ...migration002 },
  { version: '003', name: 'increase_apr_precision_again', ...migration003 },
];

/**
 * Run all pending migrations
 * This is called automatically on server startup
 */
export async function runMigrations(): Promise<void> {
  console.log('🚀 Running database migrations...');

  try {
    for (const migration of migrations) {
      console.log(`📦 Migration ${migration.version}: ${migration.name}`);
      await migration.up();
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export default migrations;
