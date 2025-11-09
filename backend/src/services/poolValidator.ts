/**
 * Pool Validator Service
 * Validates that pool addresses are actually valid DLMM/DAMM pools using Meteora SDKs
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';

const RPC_ENDPOINT = process.env.MAINNET_RPC || 'https://api.mainnet-beta.solana.com';

/**
 * Validate if an address is a valid DLMM pool
 * Returns true if the pool can be loaded with DLMM SDK
 */
export async function validateDLMMPool(poolAddress: string): Promise<boolean> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const pubkey = new PublicKey(poolAddress);

    // Try to create DLMM instance - will throw if invalid
    const dlmmPool = await DLMM.create(connection, pubkey, {
      cluster: 'mainnet-beta',
    });

    // Check if pool has valid data
    if (!dlmmPool.lbPair || !dlmmPool.lbPair.activeId) {
      console.warn(`⚠️ DLMM pool ${poolAddress} loaded but has no active bin`);
      return false;
    }

    console.log(`✅ Validated DLMM pool ${poolAddress}`);
    return true;
  } catch (error: any) {
    // Check if it's a discriminator error (not a DLMM pool)
    if (error.message?.includes('Invalid account discriminator')) {
      console.warn(`⚠️ ${poolAddress} is not a valid DLMM pool (discriminator error)`);
      return false;
    }

    // Other errors (network, etc.)
    console.error(`❌ Error validating DLMM pool ${poolAddress}:`, error.message);
    return false;
  }
}

/**
 * Validate if an address is a valid DAMM v2 pool
 * Returns true if the pool can be loaded with DAMM SDK
 */
export async function validateDAMMPool(poolAddress: string): Promise<boolean> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const pubkey = new PublicKey(poolAddress);

    // Try to create AMM instance - will throw if invalid
    const ammPool = await AmmImpl.create(connection, pubkey);

    // Check if pool has valid data
    if (!ammPool.poolState) {
      console.warn(`⚠️ DAMM pool ${poolAddress} loaded but has no pool state`);
      return false;
    }

    console.log(`✅ Validated DAMM v2 pool ${poolAddress}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error validating DAMM pool ${poolAddress}:`, error.message);
    return false;
  }
}

/**
 * Validate a pool and determine its type
 * Returns the protocol type if valid, null if invalid
 */
export async function detectPoolType(poolAddress: string): Promise<'dlmm' | 'damm-v2' | null> {
  // Try DLMM first (more common)
  const isDLMM = await validateDLMMPool(poolAddress);
  if (isDLMM) {
    return 'dlmm';
  }

  // Try DAMM v2
  const isDAMM = await validateDAMMPool(poolAddress);
  if (isDAMM) {
    return 'damm-v2';
  }

  return null;
}

/**
 * Batch validate pools with rate limiting
 * Validates pools in chunks to avoid RPC rate limits
 */
export async function batchValidatePools(
  pools: Array<{ address: string; expectedType: 'dlmm' | 'damm-v2' }>,
  chunkSize: number = 10,
  delayMs: number = 1000
): Promise<Array<{ address: string; valid: boolean; detectedType: string | null }>> {
  const results: Array<{ address: string; valid: boolean; detectedType: string | null }> = [];

  for (let i = 0; i < pools.length; i += chunkSize) {
    const chunk = pools.slice(i, i + chunkSize);

    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async (pool) => {
        const detectedType = await detectPoolType(pool.address);
        return {
          address: pool.address,
          valid: detectedType === pool.expectedType,
          detectedType,
        };
      })
    );

    results.push(...chunkResults);

    // Log progress
    console.log(`✅ Validated ${Math.min(i + chunkSize, pools.length)}/${pools.length} pools`);

    // Delay between chunks to avoid rate limits
    if (i + chunkSize < pools.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
