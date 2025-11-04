/**
 * Hook for fetching user's DLMM positions
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import DLMM from '@meteora-ag/dlmm';
import { PublicKey } from '@solana/web3.js';

export interface UserPosition {
  address: string;
  poolAddress: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseAmount: number;
  quoteAmount: number;
  totalValue: number;
  unclaimedFeesBase: number;
  unclaimedFeesQuote: number;
  lowerBinId: number;
  upperBinId: number;
  lastUpdated: Date;
}

/**
 * Fetch all user positions across all DLMM pools
 */
export function useUserPositions() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['user-positions', publicKey?.toBase58(), network],
    queryFn: async (): Promise<UserPosition[]> => {
      if (!publicKey) return [];

      try {
        // Use SDK method to get all positions for user
        const positionsMap = await DLMM.getAllLbPairPositionsByUser(
          connection,
          publicKey,
          {
            cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
          }
        );

        const positions: UserPosition[] = [];

        for (const [positionKey, positionData] of positionsMap.entries()) {
          try {
            const { lbPair, tokenX, tokenY, lbPairPositionsData } = positionData;

            // Calculate totals across all bins for this position
            let totalBaseAmount = 0;
            let totalQuoteAmount = 0;
            let totalFeesBase = 0;
            let totalFeesQuote = 0;
            let minBinId = Number.MAX_SAFE_INTEGER;
            let maxBinId = Number.MIN_SAFE_INTEGER;

            for (const position of lbPairPositionsData) {
              const xDecimals = (tokenX as any).decimal || 9;
              const yDecimals = (tokenY as any).decimal || 9;

              totalBaseAmount += Number(position.positionData.totalXAmount) / Math.pow(10, xDecimals);
              totalQuoteAmount += Number(position.positionData.totalYAmount) / Math.pow(10, yDecimals);
              totalFeesBase += Number(position.positionData.feeX) / Math.pow(10, xDecimals);
              totalFeesQuote += Number(position.positionData.feeY) / Math.pow(10, yDecimals);

              const positionBinId = (position as any).binId || 0;
              if (positionBinId < minBinId) minBinId = positionBinId;
              if (positionBinId > maxBinId) maxBinId = positionBinId;
            }

            positions.push({
              address: positionKey.toString(),
              poolAddress: (lbPair as any).publicKey?.toString() || '',
              baseTokenAddress: (tokenX as any).publicKey?.toString() || '',
              quoteTokenAddress: (tokenY as any).publicKey?.toString() || '',
              baseSymbol: (tokenX as any).symbol || 'UNKNOWN',
              quoteSymbol: (tokenY as any).symbol || 'UNKNOWN',
              baseAmount: totalBaseAmount,
              quoteAmount: totalQuoteAmount,
              totalValue: 0, // TODO: Calculate USD value using prices
              unclaimedFeesBase: totalFeesBase,
              unclaimedFeesQuote: totalFeesQuote,
              lowerBinId: minBinId === Number.MAX_SAFE_INTEGER ? 0 : minBinId,
              upperBinId: maxBinId === Number.MIN_SAFE_INTEGER ? 0 : maxBinId,
              lastUpdated: new Date(),
            });
          } catch (error) {
            console.error('Failed to parse position:', error);
          }
        }

        return positions;
      } catch (error) {
        console.error('Failed to fetch user positions:', error);
        return [];
      }
    },
    enabled: !!publicKey,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
  });
}

/**
 * Fetch positions for a specific pool
 */
export function useUserPositionsForPool(poolAddress: string | null) {
  const { data: allPositions, isLoading, error } = useUserPositions();

  const positions = poolAddress
    ? allPositions?.filter(p => p.poolAddress === poolAddress) || []
    : [];

  return {
    data: positions,
    isLoading,
    error,
  };
}
