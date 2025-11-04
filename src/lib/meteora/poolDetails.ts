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

// Use public RPC - can be slow but works
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
let connection: Connection | null = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }
  return connection;
}

// Cache pool details to avoid repeated fetches
const poolDetailsCache = new Map<string, PoolDetails>();

/**
 * Fetch DLMM pool details
 */
async function fetchDLMMDetails(poolAddress: string): Promise<PoolDetails> {
  try {
    const conn = getConnection();
    const dlmmInstance = await DLMM.create(conn, new PublicKey(poolAddress), {
      cluster: 'mainnet-beta',
    });

    await dlmmInstance.refetchStates();

    const details = {
      binStep: dlmmInstance.lbPair.binStep,
      baseFee: dlmmInstance.lbPair.parameters.baseFactor,
    };

    console.log(`✅ Fetched DLMM details for ${poolAddress}:`, details);
    return details;
  } catch (error) {
    console.error(`❌ Failed to fetch DLMM details for ${poolAddress}:`, error);
    return {};
  }
}

/**
 * Fetch DAMM pool details
 */
async function fetchDAMMDetails(poolAddress: string): Promise<PoolDetails> {
  try {
    const conn = getConnection();
    const dammPool = await DynamicAmm.create(conn, new PublicKey(poolAddress));
    await dammPool.updateState();

    const details = {
      baseFee: dammPool.poolState.fees.tradeFeeNumerator.toNumber() / 100, // Convert to bps
    };

    console.log(`✅ Fetched DAMM details for ${poolAddress}:`, details);
    return details;
  } catch (error) {
    console.error(`❌ Failed to fetch DAMM details for ${poolAddress}:`, error);
    return {};
  }
}

/**
 * Fetch pool details based on pool type
 */
export async function fetchPoolDetails(
  poolAddress: string,
  poolType: string
): Promise<PoolDetails> {
  // Check cache first
  if (poolDetailsCache.has(poolAddress)) {
    return poolDetailsCache.get(poolAddress)!;
  }

  let details: PoolDetails = {};

  if (poolType === 'dlmm') {
    details = await fetchDLMMDetails(poolAddress);
  } else if (poolType === 'damm-v1' || poolType === 'damm-v2' || poolType === 'damm') {
    details = await fetchDAMMDetails(poolAddress);
  }

  // Cache the result
  if (Object.keys(details).length > 0) {
    poolDetailsCache.set(poolAddress, details);
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
