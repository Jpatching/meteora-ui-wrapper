/**
 * Meteora Pool Metadata Service
 * Fetches and caches binStep and fee data for all Meteora pools
 */

import { fetchAllDLMMPools, MeteoraPool } from './meteoraApi';
import { fetchDAMMv2Pools, DAMMPool } from './dammApi';

export interface PoolMetadata {
  binStep?: number;
  baseFeePercentage?: string;
  poolType: 'dlmm' | 'damm-v1' | 'damm-v2' | 'unknown';
}

// Global cache of pool metadata by pool address
const metadataCache = new Map<string, PoolMetadata>();
let isFetching = false;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all Meteora pool metadata and build lookup cache
 */
async function fetchAllMetadata(): Promise<void> {
  if (isFetching) return;

  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION && metadataCache.size > 0) {
    // Cache is still fresh
    return;
  }

  isFetching = true;
  console.log('🔄 Fetching Meteora pool metadata...');

  try {
    // Fetch DLMM pools
    const [dlmmPools, dammPools] = await Promise.all([
      fetchAllDLMMPools({ network: 'mainnet-beta' }).catch(err => {
        console.error('Failed to fetch DLMM pools:', err);
        return [] as MeteoraPool[];
      }),
      fetchDAMMv2Pools({ network: 'mainnet-beta' }).catch(err => {
        console.error('Failed to fetch DAMM v2 pools:', err);
        return [] as DAMMPool[];
      }),
    ]);

    // Build cache from DLMM pools
    dlmmPools.forEach(pool => {
      metadataCache.set(pool.address.toLowerCase(), {
        binStep: pool.bin_step,
        baseFeePercentage: pool.base_fee_percentage,
        poolType: 'dlmm',
      });
    });

    // Build cache from DAMM v2 pools
    dammPools.forEach(pool => {
      // DAMM pools don't have base_fee_percentage in the same format
      // They typically have a standard 0.25% fee
      metadataCache.set(pool.pool_address.toLowerCase(), {
        baseFeePercentage: '0.25', // Standard DAMM fee
        poolType: 'damm-v2',
      });
    });

    lastFetchTime = now;
    console.log(`✅ Cached metadata for ${metadataCache.size} Meteora pools`);
  } finally {
    isFetching = false;
  }
}

/**
 * Get metadata for a specific pool
 */
export async function getPoolMetadata(poolAddress: string): Promise<PoolMetadata | null> {
  // Ensure cache is populated
  await fetchAllMetadata();

  // Lookup in cache
  const metadata = metadataCache.get(poolAddress.toLowerCase());
  return metadata || null;
}

/**
 * Get metadata for multiple pools (batch)
 */
export async function getPoolsMetadata(poolAddresses: string[]): Promise<Map<string, PoolMetadata>> {
  await fetchAllMetadata();

  const result = new Map<string, PoolMetadata>();
  poolAddresses.forEach(address => {
    const metadata = metadataCache.get(address.toLowerCase());
    if (metadata) {
      result.set(address, metadata);
    }
  });

  return result;
}

/**
 * Format binStep and fee for display
 */
export function formatPoolMetadata(metadata: PoolMetadata | null): string {
  if (!metadata) return '-';

  if (metadata.poolType === 'dlmm' && metadata.binStep !== undefined && metadata.baseFeePercentage !== undefined) {
    const feePercent = parseFloat(metadata.baseFeePercentage);
    return `binStep: ${metadata.binStep} | fee: ${feePercent.toFixed(2)}%`;
  }

  if (metadata.baseFeePercentage !== undefined) {
    const feePercent = parseFloat(metadata.baseFeePercentage);
    return `fee: ${feePercent.toFixed(2)}%`;
  }

  return '-';
}

/**
 * Prefetch metadata (call this on app load)
 */
export function prefetchMetadata(): void {
  fetchAllMetadata().catch(err => {
    console.error('Failed to prefetch metadata:', err);
  });
}
