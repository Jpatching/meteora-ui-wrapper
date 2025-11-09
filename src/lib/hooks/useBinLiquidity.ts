/**
 * Hook for fetching real bin liquidity distribution from DLMM pools
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import DLMM from '@meteora-ag/dlmm';
import { PublicKey } from '@solana/web3.js';

export interface BinLiquidity {
  binId: number;
  price: number;
  xAmount: number;
  yAmount: number;
  liquidity: number;
}

/**
 * Fetch bin liquidity distribution for a specific pool
 */
export function useBinLiquidity(poolAddress: string | null) {
  const { connection } = useConnection();
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['bin-liquidity', poolAddress, network],
    queryFn: async (): Promise<BinLiquidity[]> => {
      if (!poolAddress) return [];

      try {
        console.log(`🔍 Fetching bin liquidity for pool: ${poolAddress}`);

        // Create DLMM instance
        const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
          cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
        });

        // Get bin arrays with liquidity data
        const binArrays = await dlmmPool.getBinArrays();

        const result: BinLiquidity[] = [];

        // Process each bin array
        for (const binArray of binArrays) {
          const binsInArray = (binArray as any).bins || [];
          for (const bin of binsInArray) {
            // Only include bins with liquidity
            if (bin.xAmount > 0 || bin.yAmount > 0) {
              result.push({
                binId: bin.binId,
                price: bin.price,
                xAmount: bin.xAmount,
                yAmount: bin.yAmount,
                liquidity: bin.xAmount + bin.yAmount, // Simple sum, could be weighted
              });
            }
          }
        }

        // Sort by bin ID
        result.sort((a, b) => a.binId - b.binId);

        console.log(`✅ Fetched ${result.length} bins with liquidity`);

        return result;
      } catch (error: any) {
        console.error('❌ Error fetching bin liquidity:', error);
        // Return empty array on error to prevent UI from breaking
        return [];
      }
    },
    enabled: !!poolAddress && !!connection,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
    retry: 1, // Retry once on failure
  });
}

/**
 * Get active bin ID for a pool
 */
export function useActiveBin(poolAddress: string | null) {
  const { connection } = useConnection();
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['active-bin', poolAddress, network],
    queryFn: async (): Promise<number | null> => {
      if (!poolAddress) return null;

      try {
        const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
          cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
        });

        // Get active bin from pool state
        const activeBinId = dlmmPool.lbPair.activeId;

        console.log(`✅ Active bin ID: ${activeBinId}`);

        return activeBinId;
      } catch (error: any) {
        console.error('❌ Error fetching active bin:', error);
        return null;
      }
    },
    enabled: !!poolAddress && !!connection,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });
}
