/**
 * Pools API Routes
 * Fetches from PostgreSQL database (synced from Meteora APIs)
 * Uses Redis for caching
 */

import { Router, Request, Response } from 'express';
import { redis, getCached, setCached, CACHE_TTL, cacheKeys } from '../config/redis';
import { syncAllPools, getPoolsByToken, getTopPools } from '../services/poolSyncService';
import { syncNewPools } from '../services/realtimePoolService';
import { db } from '../config/database';

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
 * Returns cached DLMM pools from database (network-aware)
 * Query params: ?limit=100&network=devnet
 */
router.get('/dlmm', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const network = (req.query.network as 'mainnet-beta' | 'devnet') || 'mainnet-beta';
  const cacheKey = cacheKeys.poolList('dlmm', network);

  try {
    // Try to get from cache
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} DLMM pools (${network}) from cache`);
      return res.json({ success: true, data: cached, cached: true, network });
    }

    // Cache miss - fetch from database with network filter
    console.log(`🔍 Fetching DLMM pools from database (${network}, limit: ${limit})...`);
    const pools = await getTopPools('dlmm', limit, undefined, network);

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Cached ${pools.length} DLMM pools (${network})`);

    res.json({ success: true, data: pools, cached: false, network });
  } catch (error: any) {
    console.error('❌ Error fetching DLMM pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/damm
 * Returns cached DAMM v2 pools from database (network-aware)
 * Query params: ?limit=100&network=devnet
 */
router.get('/damm', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const network = (req.query.network as 'mainnet-beta' | 'devnet') || 'mainnet-beta';
  const cacheKey = cacheKeys.poolList('damm-v2', network);

  try {
    // Try to get from cache
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} DAMM v2 pools (${network}) from cache`);
      return res.json({ success: true, data: cached, cached: true, network });
    }

    // Cache miss - fetch from database with network filter
    console.log(`🔍 Fetching DAMM v2 pools from database (${network}, limit: ${limit})...`);
    const pools = await getTopPools('damm-v2', limit, undefined, network);

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Cached ${pools.length} DAMM v2 pools (${network})`);

    res.json({ success: true, data: pools, cached: false, network });
  } catch (error: any) {
    console.error('❌ Error fetching DAMM v2 pools:', error);
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
 * GET /api/pools/search
 * Search pools by name or symbol (text search)
 * Query params: ?q=TRUMP&network=mainnet-beta&limit=50
 */
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const network = (req.query.network as 'mainnet-beta' | 'devnet') || 'mainnet-beta';
  const limit = parseInt(req.query.limit as string) || 50;
  const cacheKey = `pools:search:${query}:${network}:${limit}`;

  if (!query || query.length < 2) {
    return res.json({ success: true, data: [], message: 'Query must be at least 2 characters' });
  }

  try {
    // Try cache first
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving ${cached.length} search results for "${query}" from cache`);
      return res.json({ success: true, data: cached, cached: true, network });
    }

    // Search database by pool name or token symbols (case-insensitive)
    console.log(`🔍 Searching pools for "${query}" on ${network}...`);
    const pools = await db.query(
      `SELECT * FROM pools
       WHERE network = $1
       AND (
         LOWER(pool_name) LIKE $2
         OR LOWER(token_a_symbol) LIKE $2
         OR LOWER(token_b_symbol) LIKE $2
       )
       ORDER BY tvl DESC
       LIMIT $3`,
      [network, `%${query}%`, limit]
    );

    const results = pools.rows;

    // Cache for 5 minutes
    await setCached(cacheKey, results, CACHE_TTL.POOL_DATA);
    console.log(`✅ Found ${results.length} pools matching "${query}"`);

    res.json({ success: true, data: results, cached: false, network });
  } catch (error: any) {
    console.error('❌ Error searching pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/top
 * Get top pools by TVL (for dashboard)
 * Query params: ?protocol=dlmm&limit=100&network=devnet
 */
router.get('/top', async (req: Request, res: Response) => {
  const protocol = req.query.protocol as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  const network = (req.query.network as 'mainnet-beta' | 'devnet') || 'mainnet-beta';
  const cacheKey = `pools:top:${protocol || 'all'}:${limit}:${network}`;

  try {
    // Try cache first
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Serving top ${limit} ${protocol || 'all'} pools (${network}) from cache`);
      return res.json({ success: true, data: cached, cached: true, network });
    }

    // Query database with network filter
    console.log(`🔍 Fetching top ${limit} ${protocol || 'all'} pools from ${network}...`);
    const pools = await getTopPools(protocol, limit, undefined, network);

    // Cache for 5 minutes
    await setCached(cacheKey, pools, CACHE_TTL.POOL_DATA);
    console.log(`✅ Found ${pools.length} pools on ${network}`);

    res.json({ success: true, data: pools, cached: false, network });
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
      .then(async (result) => {
        console.log('✅ Background sync complete:', result);
        // Clear all pool caches after sync (all networks)
        try {
          await redis.del(
            cacheKeys.poolList('dlmm', 'mainnet-beta'),
            cacheKeys.poolList('dlmm', 'devnet'),
            cacheKeys.poolList('damm-v2', 'mainnet-beta'),
            cacheKeys.poolList('damm-v2', 'devnet')
          );
        } catch (redisError) {
          console.error('⚠️ Redis cache clear error (non-fatal):', redisError);
        }
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
 * POST /api/pools/sync/incremental
 * Trigger incremental sync for NEW pools only (last 5 minutes)
 * Much faster than full sync - perfect for real-time updates
 * Query params: ?minutes=5 (optional, default 5)
 */
router.post('/sync/incremental', async (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 5;

    console.log(`⚡ Incremental sync triggered (last ${minutes} minutes)`);

    // Run incremental sync (fast - only new pools)
    const result = await syncNewPools(minutes);

    // Clear caches if new pools were added
    if (result.dlmm > 0 || result.damm > 0) {
      try {
        await redis.del(
          cacheKeys.poolList('dlmm', 'mainnet-beta'),
          cacheKeys.poolList('damm-v2', 'mainnet-beta')
        );
        console.log('✅ Cache cleared for new pools');
      } catch (redisError) {
        console.error('⚠️ Redis cache clear error (non-fatal):', redisError);
      }
    }

    res.json({
      success: true,
      message: `Incremental sync complete`,
      newPools: {
        dlmm: result.dlmm,
        dammv2: result.damm,
        total: result.dlmm + result.damm
      }
    });
  } catch (error: any) {
    console.error('❌ Error in incremental sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/:address
 * Get a single pool by address (searches all protocols in database)
 * Query params: ?network=devnet
 */
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const network = (req.query.network as 'mainnet-beta' | 'devnet') || 'mainnet-beta';
  const cacheKey = `pool:${address}:${network}`;

  try {
    // Try cache first
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      console.log(`✅ Serving pool ${address} (${network}) from cache`);
      return res.json({ success: true, data: cached, cached: true, network });
    }

    // Query database for pool on specific network
    const pools = await getTopPools(undefined, 1, address, network);

    if (!pools || pools.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Pool not found on ${network}`,
        address,
        network
      });
    }

    // Cache for 5 minutes
    await setCached(cacheKey, pools[0], CACHE_TTL.POOL_DATA);
    console.log(`✅ Found pool ${address} on ${network} (${pools[0].protocol})`);
    res.json({ success: true, data: pools[0], cached: false, network });
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
    // Delete all pool caches (all networks)
    await redis.del(
      cacheKeys.poolList('dlmm', 'mainnet-beta'),
      cacheKeys.poolList('dlmm', 'devnet'),
      cacheKeys.poolList('damm-v2', 'mainnet-beta'),
      cacheKeys.poolList('damm-v2', 'devnet')
    );
    console.log('✅ Pool cache cleared (all networks)');

    res.json({ success: true, message: 'Pool cache will refresh on next request' });
  } catch (error: any) {
    console.error('❌ Error refreshing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/validate/:address
 * Validate a pool address and detect its type using Meteora SDKs
 */
router.get('/validate/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const { detectPoolType } = await import('../services/poolValidator');
    const poolType = await detectPoolType(address);

    if (poolType) {
      res.json({
        success: true,
        valid: true,
        poolType,
        address,
      });
    } else {
      res.json({
        success: true,
        valid: false,
        poolType: null,
        address,
        message: 'Not a valid DLMM or DAMM v2 pool',
      });
    }
  } catch (error: any) {
    console.error(`❌ Error validating pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pools/devnet/add
 * Add a devnet pool to track (fetch from on-chain and store in database)
 * Body: { address: string, protocol: 'dlmm' | 'damm-v2', name?: string }
 */
router.post('/devnet/add', async (req: Request, res: Response) => {
  const { address, protocol, name } = req.body;

  if (!address || !protocol) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: address, protocol',
    });
  }

  if (protocol !== 'dlmm' && protocol !== 'damm-v2') {
    return res.status(400).json({
      success: false,
      error: 'Invalid protocol. Must be "dlmm" or "damm-v2"',
    });
  }

  try {
    const { addDevnetPool } = await import('../services/devnetPoolService');
    const success = await addDevnetPool(address, protocol, name);

    if (success) {
      res.json({
        success: true,
        message: `Devnet pool ${address} added successfully`,
        address,
        protocol,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch or store devnet pool',
      });
    }
  } catch (error: any) {
    console.error(`❌ Error adding devnet pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pools/devnet/sync
 * Sync all known devnet pools
 */
router.post('/devnet/sync', async (req: Request, res: Response) => {
  try {
    const { syncDevnetPools } = await import('../services/devnetPoolService');
    const result = await syncDevnetPools();

    res.json({
      success: true,
      message: 'Devnet pool sync complete',
      synced: result.synced,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error('❌ Error syncing devnet pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/devnet/:address
 * Fetch a devnet pool directly from on-chain (no caching)
 * Query params: ?protocol=dlmm
 */
router.get('/devnet/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const protocol = req.query.protocol as 'dlmm' | 'damm-v2';

  if (!protocol) {
    return res.status(400).json({
      success: false,
      error: 'Missing protocol query parameter (?protocol=dlmm or ?protocol=damm-v2)',
    });
  }

  try {
    const { getDevnetPool } = await import('../services/devnetPoolService');
    const pool = await getDevnetPool(address, protocol);

    if (pool) {
      res.json({ success: true, data: pool, network: 'devnet' });
    } else {
      res.status(404).json({
        success: false,
        error: 'Pool not found on devnet or failed to fetch',
        address,
        protocol,
      });
    }
  } catch (error: any) {
    console.error(`❌ Error fetching devnet pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
