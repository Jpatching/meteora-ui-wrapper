import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://meteora:password@localhost:5432/meteora',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
db.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

db.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

// Query helper with logging
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await db.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Query error:', { text, error });
    throw error;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await db.end();
  console.log('👋 PostgreSQL connection closed');
}
