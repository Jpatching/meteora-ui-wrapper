import * as migration001 from './001_create_pools_table';

/**
 * List of all migrations in order
 */
const migrations = [
  { version: '001', name: 'create_pools_table', ...migration001 },
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
