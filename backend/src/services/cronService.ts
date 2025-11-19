/**
 * Cron Service
 * Schedules periodic tasks like pool syncing
 */

import cron from 'node-cron';
import { syncAllPools } from './poolSyncService';
import { syncNewPools } from './realtimePoolService';

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  console.log('⏰ Starting cron jobs...');

  // FULL SYNC: All pools every 30 minutes
  // Cron format: minute hour day month weekday
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔄 [CRON] Starting scheduled FULL pool sync...');
    try {
      const result = await syncAllPools();
      console.log(`✅ [CRON] Full pool sync complete:`, result);
    } catch (error) {
      console.error('❌ [CRON] Full pool sync failed:', error);
    }
  });

  // INCREMENTAL SYNC: New pools every 5 minutes (for real-time experience)
  cron.schedule('*/5 * * * *', async () => {
    console.log('⚡ [CRON] Starting incremental sync (last 5 minutes)...');
    try {
      const result = await syncNewPools(5);
      if (result.dlmm > 0 || result.damm > 0) {
        console.log(`✅ [CRON] Incremental sync: ${result.dlmm} DLMM + ${result.damm} DAMM v2 new pools added`);
      } else {
        console.log(`✅ [CRON] Incremental sync: No new pools`);
      }
    } catch (error) {
      console.error('❌ [CRON] Incremental sync failed:', error);
    }
  });

  console.log('✅ Cron jobs started');
  console.log('   - Full pool sync: every 30 minutes');
  console.log('   - Incremental sync: every 5 minutes (new pools only)');
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
