/**
 * Devnet Pool Service
 * Fetches pool data from devnet using Meteora SDKs (on-chain)
 * APIs only serve mainnet, so we need to fetch devnet pools directly from on-chain
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import AmmImpl from '@meteora-ag/dynamic-amm-sdk';
import { db } from '../config/database';
import { getTokenMetadata } from './tokenMetadataService';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const devnetConnection = new Connection(DEVNET_RPC, 'confirmed');

interface DevnetPoolConfig {
  address: string;
  protocol: 'dlmm' | 'damm-v2';
  name?: string;
}

/**
 * Known devnet pools for testing
 * Users can add their own pools here or we can store them in database
 */
const KNOWN_DEVNET_POOLS: DevnetPoolConfig[] = [
  // SOL-USDC DLMM pool created for testing
  // This will be populated after running create-sol-usdc-devnet-pool.ts
  // Uncomment and add the pool address once created:
  // { address: 'YOUR_POOL_ADDRESS_HERE', protocol: 'dlmm', name: 'SOL-USDC' },
];

/**
 * Fetch DLMM pool data from devnet using SDK
 */
async function fetchDLMMPoolFromDevnet(poolAddress: string): Promise<any> {
  try {
    console.log(`🔍 Fetching DLMM pool ${poolAddress} from devnet...`);

    const dlmmPool = await DLMM.create(
      devnetConnection,
      new PublicKey(poolAddress),
      { cluster: 'devnet' }
    );

    const poolState = dlmmPool.lbPair;
    const activeBin = dlmmPool.lbPair.activeId;

    // Fetch token metadata
    const [tokenAMetadata, tokenBMetadata] = await Promise.all([
      getTokenMetadata(poolState.tokenXMint.toBase58()),
      getTokenMetadata(poolState.tokenYMint.toBase58()),
    ]);

    // Calculate TVL from reserves (approximate)
    const reserveX = Number(dlmmPool.lbPair.reserveX) / 1e9; // Adjust decimals
    const reserveY = Number(dlmmPool.lbPair.reserveY) / 1e9; // Adjust decimals

    return {
      address: poolAddress,
      name: `${tokenAMetadata?.symbol || 'UNKNOWN'}-${tokenBMetadata?.symbol || 'UNKNOWN'}`,
      protocol: 'dlmm',
      token_a_mint: poolState.tokenXMint.toBase58(),
      token_b_mint: poolState.tokenYMint.toBase58(),
      token_a_symbol: tokenAMetadata?.symbol || 'UNKNOWN',
      token_b_symbol: tokenBMetadata?.symbol || 'UNKNOWN',
      tvl: 0, // Would need price data to calculate
      volume_24h: 0, // Not available on-chain
      fees_24h: 0, // Not available on-chain
      apr: 0, // Not available on-chain
      metadata: {
        bin_step: poolState.binStep,
        active_bin: activeBin,
        reserve_x: reserveX,
        reserve_y: reserveY,
        network: 'devnet',
      },
      network: 'devnet',
    };
  } catch (error: any) {
    console.error(`❌ Error fetching DLMM pool ${poolAddress} from devnet:`, error.message);
    return null;
  }
}

/**
 * Fetch DAMM v2 pool data from devnet using SDK
 */
async function fetchDAMMv2PoolFromDevnet(poolAddress: string): Promise<any> {
  try {
    console.log(`🔍 Fetching DAMM v2 pool ${poolAddress} from devnet...`);

    // Use AmmImpl.create() static factory method
    const amm = await AmmImpl.create(devnetConnection, new PublicKey(poolAddress));

    if (!amm) {
      console.error(`❌ Pool ${poolAddress} not found on devnet`);
      return null;
    }

    const poolState = amm.poolState;

    // Fetch token metadata
    const [tokenAMetadata, tokenBMetadata] = await Promise.all([
      getTokenMetadata(poolState.tokenAMint.toBase58()),
      getTokenMetadata(poolState.tokenBMint.toBase58()),
    ]);

    return {
      address: poolAddress,
      name: `${tokenAMetadata?.symbol || 'UNKNOWN'}-${tokenBMetadata?.symbol || 'UNKNOWN'}`,
      protocol: 'damm-v2',
      token_a_mint: poolState.tokenAMint.toBase58(),
      token_b_mint: poolState.tokenBMint.toBase58(),
      token_a_symbol: tokenAMetadata?.symbol || 'UNKNOWN',
      token_b_symbol: tokenBMetadata?.symbol || 'UNKNOWN',
      tvl: 0, // Would need price data to calculate
      volume_24h: 0, // Not available on-chain
      fees_24h: 0, // Not available on-chain
      apr: 0, // Not available on-chain
      metadata: {
        pool_type: poolState.poolType,
        network: 'devnet',
      },
      network: 'devnet',
    };
  } catch (error: any) {
    console.error(`❌ Error fetching DAMM v2 pool ${poolAddress} from devnet:`, error.message);
    return null;
  }
}

/**
 * Sync a single devnet pool to database
 */
async function syncDevnetPool(config: DevnetPoolConfig): Promise<boolean> {
  try {
    let poolData;

    if (config.protocol === 'dlmm') {
      poolData = await fetchDLMMPoolFromDevnet(config.address);
    } else if (config.protocol === 'damm-v2') {
      poolData = await fetchDAMMv2PoolFromDevnet(config.address);
    }

    if (!poolData) {
      return false;
    }

    // Override name if provided in config
    if (config.name) {
      poolData.name = config.name;
    }

    // Upsert to database
    await db.query(
      `INSERT INTO pools (
        pool_address, pool_name, protocol,
        token_a_mint, token_b_mint,
        token_a_symbol, token_b_symbol,
        tvl, volume_24h, fees_24h, apr,
        metadata, network, last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (pool_address, network)
      DO UPDATE SET
        pool_name = EXCLUDED.pool_name,
        token_a_symbol = EXCLUDED.token_a_symbol,
        token_b_symbol = EXCLUDED.token_b_symbol,
        tvl = EXCLUDED.tvl,
        metadata = EXCLUDED.metadata,
        last_synced_at = NOW()`,
      [
        poolData.address,
        poolData.name,
        poolData.protocol,
        poolData.token_a_mint,
        poolData.token_b_mint,
        poolData.token_a_symbol,
        poolData.token_b_symbol,
        poolData.tvl,
        poolData.volume_24h,
        poolData.fees_24h,
        poolData.apr,
        JSON.stringify(poolData.metadata),
        'devnet',
      ]
    );

    console.log(`✅ Synced devnet pool: ${poolData.name} (${config.protocol})`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error syncing devnet pool ${config.address}:`, error.message);
    return false;
  }
}

/**
 * Sync all known devnet pools
 */
export async function syncDevnetPools(): Promise<{ synced: number; failed: number }> {
  console.log(`🔄 Syncing ${KNOWN_DEVNET_POOLS.length} known devnet pools...`);

  let synced = 0;
  let failed = 0;

  for (const pool of KNOWN_DEVNET_POOLS) {
    const success = await syncDevnetPool(pool);
    if (success) {
      synced++;
    } else {
      failed++;
    }
  }

  console.log(`✅ Devnet pool sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Add a new devnet pool to track
 */
export async function addDevnetPool(address: string, protocol: 'dlmm' | 'damm-v2', name?: string): Promise<boolean> {
  console.log(`➕ Adding devnet pool: ${address} (${protocol})`);

  const config: DevnetPoolConfig = { address, protocol, name };
  const success = await syncDevnetPool(config);

  if (success) {
    // Store in database so we can track it
    // Could add a separate table for tracked devnet pools
    KNOWN_DEVNET_POOLS.push(config);
  }

  return success;
}

/**
 * Fetch a specific devnet pool by address
 */
export async function getDevnetPool(address: string, protocol: 'dlmm' | 'damm-v2'): Promise<any> {
  if (protocol === 'dlmm') {
    return await fetchDLMMPoolFromDevnet(address);
  } else if (protocol === 'damm-v2') {
    return await fetchDAMMv2PoolFromDevnet(address);
  }
  return null;
}
