/**
 * Cron Service
 * Schedules periodic tasks like pool syncing
 */

import cron from 'node-cron';
import { syncAllPools } from './poolSyncService';

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  console.log('⏰ Starting cron jobs...');

  // Sync pools every 30 minutes
  // Cron format: minute hour day month weekday
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔄 [CRON] Starting scheduled pool sync...');
    try {
      const result = await syncAllPools();
      console.log(`✅ [CRON] Pool sync complete:`, result);
    } catch (error) {
      console.error('❌ [CRON] Pool sync failed:', error);
    }
  });

  console.log('✅ Cron jobs started');
  console.log('   - Pool sync: every 30 minutes');
}

/**
 * Run initial sync on server start (optional)
 */
export async function runInitialSync() {
  console.log('🚀 Running initial pool sync on startup...');
  try {
    const result = await syncAllPools();
    console.log('✅ Initial sync complete:', result);
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
    console.log('⚠️  Pools will sync on next cron job');
  }
}
