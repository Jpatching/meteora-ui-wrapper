/**
 * Pools API Routes
 * Fetches from PostgreSQL database (synced from Meteora APIs)
 * Uses Redis for caching
 */

import { Router, Request, Response } from 'express';
import { redis, getCached, setCached, CACHE_TTL, cacheKeys } from '../config/redis';
import { syncAllPools, getPoolsByToken, getTopPools } from '../services/poolSyncService';

const router = Router();

interface MeteoraPool {
  address: string;
  name: string;
  bin_step?: number;
  base_fee_percentage?: string;
  liquidity: string;
  trade_volume_24h: number;
  // ... other fields
}

interface DAMMPool {
  pool_address: string;
  pool_name: string;
  base_fee?: number;
  tvl: number;
  volume24h?: number;
  // ... other fields
}

/**
 * GET /api/pools/dlmm
 * Returns cached DLMM pools (refreshes every 5 min)
 */
router.get('/dlmm', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const cacheKey = cacheKeys.poolList('dlmm');

  try {
    // Try to get from cache
    const cached = await getCached<MeteoraPool[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} DLMM pools from cache`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Cache miss - fetch from Meteora API
    console.log(`🌊 Fetching DLMM pools from Meteora API (limit: ${limit})...`);
    const response = await fetch(`https://dlmm-api.meteora.ag/pair/all_with_pagination?page=1&limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Meteora API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const pools = data.pairs || [];

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Cached ${pools.length} DLMM pools`);

    res.json({ success: true, data: pools, cached: false });
  } catch (error: any) {
    console.error('❌ Error fetching DLMM pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/damm
 * Returns cached DAMM v2 pools (refreshes every 5 min)
 */
router.get('/damm', async (req: Request, res: Response) => {
  const cacheKey = cacheKeys.poolList('damm');

  try {
    // Try to get from cache
    const cached = await getCached<DAMMPool[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} DAMM pools from cache`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Cache miss - fetch from Meteora API
    console.log(`🌊 Fetching DAMM v2 pools from Meteora API...`);
    const response = await fetch('https://dammv2-api.meteora.ag/pools');

    if (!response.ok) {
      throw new Error(`Meteora API error: ${response.status}`);
    }

    const result = await response.json() as any;
    const pools = result.data || [];

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Cached ${pools.length} DAMM pools`);

    res.json({ success: true, data: pools, cached: false });
  } catch (error: any) {
    console.error('❌ Error fetching DAMM pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/search/:tokenCA
 * Search pools by token contract address
 * Returns all pools containing this token
 */
router.get('/search/:tokenCA', async (req: Request, res: Response) => {
  const { tokenCA } = req.params;
  const cacheKey = `pools:token:${tokenCA}`;

  try {
    // Try cache first
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} pools for token ${tokenCA} from cache`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Query database
    console.log(`🔍 Searching database for pools with token ${tokenCA}...`);
    const pools = await getPoolsByToken(tokenCA);

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Found ${pools.length} pools for token ${tokenCA}`);

    res.json({ success: true, data: pools, cached: false });
  } catch (error: any) {
    console.error('❌ Error searching pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/top
 * Get top pools by TVL (for dashboard)
 */
router.get('/top', async (req: Request, res: Response) => {
  const protocol = req.query.protocol as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  const cacheKey = protocol ? `pools:top:${protocol}:${limit}` : `pools:top:all:${limit}`;

  try {
    // Try cache first
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving top ${limit} ${protocol || 'all'} pools from cache`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Query database
    console.log(`🔍 Fetching top ${limit} ${protocol || 'all'} pools from database...`);
    const pools = await getTopPools(protocol, limit);

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Found ${pools.length} pools`);

    res.json({ success: true, data: pools, cached: false });
  } catch (error: any) {
    console.error('❌ Error fetching top pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pools/sync
 * Trigger full pool sync from Meteora APIs (admin endpoint)
 * This takes a while (100k+ pools) so runs async
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // Start sync in background
    res.json({ success: true, message: 'Pool sync started in background' });

    // Run sync (this takes time)
    syncAllPools()
      .then((result) => {
        console.log('✅ Background sync complete:', result);
        // Clear all pool caches after sync
        redis.del(cacheKeys.poolList('dlmm'), cacheKeys.poolList('damm'));
      })
      .catch((error) => {
        console.error('❌ Background sync failed:', error);
      });
  } catch (error: any) {
    console.error('❌ Error starting sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/:address
 * Get a single pool by address (searches all protocols in database)
 */
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const cacheKey = `pool:${address}`;

  try {
    // Try cache first
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      console.log(`✅ Serving pool ${address} from cache`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Query database for pool (searches all protocols)
    const pools = await getTopPools(undefined, 1, address);

    if (!pools || pools.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        address
      });
    }

    // Cache for 5 minutes
    await setCached(cacheKey, pools[0], CACHE_TTL.POOL_DATA);
    console.log(`✅ Found pool ${address} (${pools[0].protocol})`);
    res.json({ success: true, data: pools[0], cached: false });
  } catch (error: any) {
    console.error(`❌ Error fetching pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pools/refresh
 * Manually refresh pool cache (admin endpoint)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Delete all pool caches
    await redis.del(cacheKeys.poolList('dlmm'), cacheKeys.poolList('damm'));
    console.log('✅ Pool cache cleared');

    res.json({ success: true, message: 'Pool cache will refresh on next request' });
  } catch (error: any) {
    console.error('❌ Error refreshing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
