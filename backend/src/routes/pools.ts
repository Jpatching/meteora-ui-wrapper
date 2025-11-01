/**
 * Pools API Routes
 * Fetches and caches Meteora pool data
 */

import { Router, Request, Response } from 'express';
import { redis, getCached, setCached, CACHE_TTL, cacheKeys } from '../config/redis';

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

    const data = await response.json();
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

    const result = await response.json();
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
