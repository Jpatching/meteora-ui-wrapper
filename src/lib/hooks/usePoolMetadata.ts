/**
 * Hook to fetch pool metadata (binStep, baseFee) from Meteora SDK
 * Similar to useBinLiquidity - fetches REAL on-chain data
 */

'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import DynamicAmm from '@meteora-ag/dynamic-amm-sdk';

interface PoolMetadata {
  binStep?: number;
  baseFee?: number; // in basis points
  isLoading: boolean;
  error?: string;
}

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
let connection: Connection | null = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }
  return connection;
}

export function usePoolMetadata(poolAddress: string, poolType: string): PoolMetadata {
  const [metadata, setMetadata] = useState<PoolMetadata>({
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchMetadata() {
      if (!poolAddress || !poolType) {
        setMetadata({ isLoading: false });
        return;
      }

      try {
        const conn = getConnection();

        if (poolType === 'dlmm') {
          // Fetch DLMM pool metadata
          const dlmmInstance = await DLMM.create(conn, new PublicKey(poolAddress), {
            cluster: 'mainnet-beta',
          });

          await dlmmInstance.refetchStates();

          if (mounted) {
            setMetadata({
              binStep: dlmmInstance.lbPair.binStep,
              baseFee: dlmmInstance.lbPair.parameters.baseFactor,
              isLoading: false,
            });
          }
        } else if (poolType.startsWith('damm')) {
          // Fetch DAMM pool metadata
          const dammPool = await DynamicAmm.create(conn, new PublicKey(poolAddress));
          await dammPool.updateState();

          if (mounted) {
            setMetadata({
              baseFee: dammPool.poolState.fees.tradeFeeNumerator.toNumber() / 100,
              isLoading: false,
            });
          }
        } else {
          if (mounted) {
            setMetadata({ isLoading: false });
          }
        }
      } catch (error: any) {
        console.error(`Failed to fetch metadata for ${poolAddress}:`, error);
        if (mounted) {
          setMetadata({
            isLoading: false,
            error: error.message,
          });
        }
      }
    }

    fetchMetadata();

    return () => {
      mounted = false;
    };
  }, [poolAddress, poolType]);

  return metadata;
}
