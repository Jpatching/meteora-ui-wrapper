/**
 * Fetch real pool details (binStep, baseFee) from Meteora SDK
 */

'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import DynamicAmm from '@meteora-ag/dynamic-amm-sdk';

export interface PoolDetails {
  binStep?: number;
  baseFee?: number; // in basis points (100 = 1%)
}

// Network-specific RPC endpoints
const RPC_ENDPOINTS = {
  'mainnet-beta': process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
  'devnet': process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com',
  'localnet': 'http://localhost:8899',
};

// Connection cache per network
const connectionCache = new Map<string, Connection>();

function getConnection(network: 'mainnet-beta' | 'devnet' | 'localnet' = 'mainnet-beta') {
  if (!connectionCache.has(network)) {
    const endpoint = RPC_ENDPOINTS[network];
    connectionCache.set(network, new Connection(endpoint, 'confirmed'));
  }
  return connectionCache.get(network)!;
}

// Cache pool details to avoid repeated fetches
const poolDetailsCache = new Map<string, PoolDetails>();

/**
 * Fetch DLMM pool details
 */
async function fetchDLMMDetails(
  poolAddress: string,
  network: 'mainnet-beta' | 'devnet' | 'localnet' = 'mainnet-beta'
): Promise<PoolDetails> {
  try {
    const conn = getConnection(network);
    // Map 'localnet' to 'localhost' for DLMM SDK compatibility
    const cluster = network === 'localnet' ? 'localhost' : network;
    const dlmmInstance = await DLMM.create(conn, new PublicKey(poolAddress), {
      cluster: cluster as 'mainnet-beta' | 'devnet' | 'localhost',
    });

    await dlmmInstance.refetchStates();

    const details = {
      binStep: dlmmInstance.lbPair.binStep,
      baseFee: dlmmInstance.lbPair.parameters.baseFactor,
    };

    console.log(`✅ Fetched DLMM details for ${poolAddress} on ${network}:`, details);
    return details;
  } catch (error) {
    console.error(`❌ Failed to fetch DLMM details for ${poolAddress} on ${network}:`, error);
    return {};
  }
}

/**
 * Fetch DAMM pool details
 */
async function fetchDAMMDetails(
  poolAddress: string,
  network: 'mainnet-beta' | 'devnet' | 'localnet' = 'mainnet-beta'
): Promise<PoolDetails> {
  try {
    const conn = getConnection(network);
    const dammPool = await DynamicAmm.create(conn, new PublicKey(poolAddress));
    await dammPool.updateState();

    const details = {
      baseFee: dammPool.poolState.fees.tradeFeeNumerator.toNumber() / 100, // Convert to bps
    };

    console.log(`✅ Fetched DAMM details for ${poolAddress} on ${network}:`, details);
    return details;
  } catch (error) {
    console.error(`❌ Failed to fetch DAMM details for ${poolAddress} on ${network}:`, error);
    return {};
  }
}

/**
 * Fetch pool details based on pool type
 */
export async function fetchPoolDetails(
  poolAddress: string,
  poolType: string,
  network: 'mainnet-beta' | 'devnet' | 'localnet' = 'mainnet-beta'
): Promise<PoolDetails> {
  // Create network-aware cache key
  const cacheKey = `${poolAddress}:${network}`;

  // Check cache first
  if (poolDetailsCache.has(cacheKey)) {
    return poolDetailsCache.get(cacheKey)!;
  }

  let details: PoolDetails = {};

  if (poolType === 'dlmm') {
    details = await fetchDLMMDetails(poolAddress, network);
  } else if (poolType === 'damm-v1' || poolType === 'damm-v2' || poolType === 'damm') {
    details = await fetchDAMMDetails(poolAddress, network);
  }

  // Cache the result with network-aware key
  if (Object.keys(details).length > 0) {
    poolDetailsCache.set(cacheKey, details);
  }

  return details;
}

/**
 * Format fee for display
 */
export function formatFee(baseFee: number | undefined): string {
  if (!baseFee) return '0.30%';
  return `${(baseFee / 100).toFixed(2)}%`;
}

/**
 * Format pool details for display
 */
export function formatPoolDetails(details: PoolDetails, poolType: string): string {
  if (poolType === 'dlmm' && details.binStep && details.baseFee) {
    return `binStep: ${details.binStep} | fee: ${formatFee(details.baseFee)}`;
  }

  if (details.baseFee) {
    return `fee: ${formatFee(details.baseFee)}`;
  }

  // Fallback defaults
  if (poolType === 'dlmm') return 'binStep: 2 | fee: 0.01%';
  if (poolType.startsWith('damm')) return 'fee: 0.25%';
  return 'fee: 0.30%';
}
