/**
 * Pools API Routes
 * Fetches from PostgreSQL database (synced from Meteora APIs)
 * Uses Redis for caching
 */

import { Router, Request, Response } from 'express';
import { redis, getCached, setCached, CACHE_TTL, cacheKeys } from '../config/redis';
import { syncAllPools, getPoolsByToken, getTopPools } from '../services/poolSyncService';
import { autoIndexPool } from '../services/devnetPoolSyncService';

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
 * Add a devnet pool directly to database (no SDK fetching)
 * Body: {
 *   address: string,
 *   protocol: 'dlmm' | 'damm-v2',
 *   token_a_mint: string,
 *   token_b_mint: string,
 *   name?: string,
 *   token_a_symbol?: string,
 *   token_b_symbol?: string,
 *   bin_step?: number,
 *   active_bin?: number,
 *   reserve_x?: number,
 *   reserve_y?: number,
 *   pool_type?: number,
 *   tvl?: number
 * }
 */
router.post('/devnet/add', async (req: Request, res: Response) => {
  const { address, protocol, token_a_mint, token_b_mint } = req.body;

  if (!address || !protocol || !token_a_mint || !token_b_mint) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: address, protocol, token_a_mint, token_b_mint',
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
    const success = await addDevnetPool(req.body);

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
        error: 'Failed to store devnet pool',
      });
    }
  } catch (error: any) {
    console.error(`❌ Error adding devnet pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/devnet
 * Get all devnet pools from database
 * Query params: ?protocol=dlmm
 */
router.get('/devnet', async (req: Request, res: Response) => {
  const protocol = req.query.protocol as 'dlmm' | 'damm-v2' | undefined;

  try {
    const { getDevnetPools } = await import('../services/devnetPoolService');
    const pools = await getDevnetPools(protocol);

    res.json({
      success: true,
      data: pools,
      count: pools.length,
      network: 'devnet',
    });
  } catch (error: any) {
    console.error('❌ Error fetching devnet pools:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pools/devnet/:address
 * Get a devnet pool from database
 */
router.get('/devnet/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const { getDevnetPool } = await import('../services/devnetPoolService');
    const pool = await getDevnetPool(address);

    if (pool) {
      res.json({ success: true, data: pool, network: 'devnet' });
    } else {
      res.status(404).json({
        success: false,
        error: 'Pool not found in database',
        address,
        network: 'devnet',
      });
    }
  } catch (error: any) {
    console.error(`❌ Error fetching devnet pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/pools/devnet/:address
 * Delete a devnet pool from database
 */
router.delete('/devnet/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const { deleteDevnetPool } = await import('../services/devnetPoolService');
    const success = await deleteDevnetPool(address);

    if (success) {
      res.json({
        success: true,
        message: `Devnet pool ${address} deleted successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Pool not found',
      });
    }
  } catch (error: any) {
    console.error(`❌ Error deleting devnet pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pools/auto-index
 * Auto-index a devnet pool by fetching from chain
 * Body: { address: string, poolType?: 'dlmm' | 'damm-v2' }
 *
 * This endpoint automatically:
 * 1. Fetches pool data from devnet RPC
 * 2. Extracts token info, reserves, and metadata
 * 3. Stores in database for future queries
 * 4. Returns the indexed pool data
 */
router.post('/auto-index', async (req: Request, res: Response) => {
  const { address, poolType } = req.body;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: address',
    });
  }

  try {
    console.log(`[API] Auto-indexing devnet pool: ${address} (type: ${poolType || 'auto-detect'})`);

    const result = await autoIndexPool(address, poolType);

    if (result.success) {
      // Clear cache for this pool
      const cacheKey = `pool:${address}:devnet`;
      await redis.del(cacheKey);

      // Clear devnet pool list cache
      await redis.del(
        cacheKeys.poolList('dlmm', 'devnet'),
        cacheKeys.poolList('damm-v2', 'devnet')
      );

      res.json({
        success: true,
        message: result.alreadyExists
          ? `Pool ${address} was already indexed`
          : `Pool ${address} successfully indexed from chain`,
        poolAddress: result.poolAddress,
        poolType: result.poolType,
        alreadyExists: result.alreadyExists || false,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to index pool',
        poolAddress: result.poolAddress,
        poolType: result.poolType,
      });
    }
  } catch (error: any) {
    console.error(`❌ Error auto-indexing pool ${address}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
