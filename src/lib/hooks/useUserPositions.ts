/**
 * Hook for fetching user's DLMM positions
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import DLMM from '@meteora-ag/dlmm';
import { PublicKey } from '@solana/web3.js';
import { rpcLimiter } from '@/lib/utils/rpcRateLimiter';

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
        // Use SDK method to get all positions for user with RPC rate limiting
        const cacheKey = `dlmm-positions-${publicKey.toBase58()}-${network}`;
        const positionsMap = await rpcLimiter.execute(
          () => DLMM.getAllLbPairPositionsByUser(
            connection,
            publicKey,
            {
              cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
            }
          ),
          cacheKey
        ).catch(error => {
          console.error('DLMM SDK Error:', error);
          // Return empty map on discriminator errors (SDK version mismatch)
          if (error.message?.includes('Invalid account discriminator')) {
            console.warn('⚠️ DLMM SDK version mismatch - skipping positions. Please update @meteora-ag/dlmm to latest version.');
            return new Map();
          }
          throw error;
        });

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

            // Get decimals once per position (outside loop for efficiency)
            const xDecimals = (tokenX as any).decimal || (tokenX as any).mint?.decimals || 9;
            const yDecimals = (tokenY as any).decimal || (tokenY as any).mint?.decimals || 9;

            for (const position of lbPairPositionsData) {
              // totalXAmount and totalYAmount are strings, feeX and feeY are BN objects
              totalBaseAmount += Number(position.positionData.totalXAmount) / Math.pow(10, xDecimals);
              totalQuoteAmount += Number(position.positionData.totalYAmount) / Math.pow(10, yDecimals);

              // feeX and feeY are BN objects - convert to string first
              const feeXRaw = typeof position.positionData.feeX === 'object'
                ? position.positionData.feeX.toString()
                : String(position.positionData.feeX || '0');
              const feeYRaw = typeof position.positionData.feeY === 'object'
                ? position.positionData.feeY.toString()
                : String(position.positionData.feeY || '0');

              totalFeesBase += Number(feeXRaw) / Math.pow(10, xDecimals);
              totalFeesQuote += Number(feeYRaw) / Math.pow(10, yDecimals);

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
    staleTime: 60000, // 60 seconds - longer cache for cost savings
    refetchInterval: false, // Manual refresh only to avoid RPC spam
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    retry: 2, // Only retry twice on failure
  });
}

/**
 * Fetch positions for a specific pool
 * Uses pool-specific SDK method for better accuracy
 */
export function useUserPositionsForPool(poolAddress: string | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { network } = useNetwork();

  return useQuery({
    queryKey: ['user-positions-pool', poolAddress, publicKey?.toBase58(), network],
    queryFn: async (): Promise<UserPosition[]> => {
      if (!publicKey || !poolAddress) return [];

      try {
        console.log(`[useUserPositionsForPool] Fetching positions for pool: ${poolAddress}`);

        // Create DLMM instance for this specific pool
        const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
          cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
        });

        // Use pool-specific method to get positions (more reliable than getAllLbPairPositionsByUser)
        const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(publicKey);

        console.log(`[useUserPositionsForPool] Found ${userPositions.length} position(s)`);

        const positions: UserPosition[] = [];

        // Get token decimals once
        // TokenReserve has a 'mint' property which is a Mint object with 'decimals'
        const tokenX = dlmmPool.tokenX;
        const tokenY = dlmmPool.tokenY;

        // CRITICAL: The property is 'decimals' (plural), not 'decimal'
        // Access it from tokenX.mint.decimals or tokenX.decimal (SDK might have both)
        const xDecimals = (tokenX as any).decimal || tokenX.mint?.decimals || 9;
        const yDecimals = (tokenY as any).decimal || tokenY.mint?.decimals || 9;

        console.log(`[useUserPositionsForPool] Token decimals: X=${xDecimals}, Y=${yDecimals}`);

        for (const position of userPositions) {
          try {
            const posAddr = position.publicKey.toString();
            console.log(`\n[useUserPositionsForPool] Processing position ${posAddr.slice(0, 8)}...`);

            // CRITICAL DEBUG: Log the ENTIRE position structure
            console.log(`[useUserPositionsForPool] FULL POSITION OBJECT:`, JSON.stringify(position, (key, value) => {
              // Convert BigNumber to string for logging
              if (value && typeof value === 'object' && value.constructor.name === 'BN') {
                return value.toString();
              }
              return value;
            }, 2).slice(0, 1000)); // First 1000 chars

            // Check what's actually in position
            console.log(`[useUserPositionsForPool] Position keys:`, Object.keys(position));
            console.log(`[useUserPositionsForPool] Position.positionData keys:`, Object.keys(position.positionData || {}));

            // Try to access amounts in different ways
            let totalXAmount = 0;
            let totalYAmount = 0;
            let unclaimedFeesX = 0;
            let unclaimedFeesY = 0;

            // Method 1: From positionData (aggregated)
            if (position.positionData) {
              const posData = position.positionData;

              // CRITICAL: totalXAmount and totalYAmount are STRINGS according to SDK
              // feeX and feeY are BN objects
              if (posData.totalXAmount) {
                // totalXAmount is already a string, just convert to number
                totalXAmount = Number(posData.totalXAmount) / Math.pow(10, xDecimals);
                console.log(`[useUserPositionsForPool] totalXAmount from positionData: ${totalXAmount} (raw: ${posData.totalXAmount})`);
              }

              if (posData.totalYAmount) {
                // totalYAmount is already a string, just convert to number
                totalYAmount = Number(posData.totalYAmount) / Math.pow(10, yDecimals);
                console.log(`[useUserPositionsForPool] totalYAmount from positionData: ${totalYAmount} (raw: ${posData.totalYAmount})`);
              }

              // feeX and feeY are BN objects, need to convert to string first
              if (posData.feeX) {
                const raw = typeof posData.feeX === 'object'
                  ? posData.feeX.toString()
                  : String(posData.feeX);
                unclaimedFeesX = Number(raw) / Math.pow(10, xDecimals);
                console.log(`[useUserPositionsForPool] feeX: ${unclaimedFeesX} (raw: ${raw})`);
              }

              if (posData.feeY) {
                const raw = typeof posData.feeY === 'object'
                  ? posData.feeY.toString()
                  : String(posData.feeY);
                unclaimedFeesY = Number(raw) / Math.pow(10, yDecimals);
                console.log(`[useUserPositionsForPool] feeY: ${unclaimedFeesY} (raw: ${raw})`);
              }
            }

            // Method 2: If amounts are still 0, try summing from bin data
            if (totalXAmount === 0 && totalYAmount === 0) {
              console.log(`[useUserPositionsForPool] ⚠️ Amounts are 0, trying to sum from bins...`);

              // The SDK might return position data differently
              // Check if there's a positionBinData array
              const bins = (position as any).positionBinData || (position as any).binData || [];
              console.log(`[useUserPositionsForPool] Found ${bins.length} bins in position`);

              for (const bin of bins) {
                if (bin.positionData) {
                  const xAmt = bin.positionData.totalXAmount || bin.positionData.xAmount || 0;
                  const yAmt = bin.positionData.totalYAmount || bin.positionData.yAmount || 0;

                  const xRaw = typeof xAmt === 'object' ? xAmt.toString() : String(xAmt);
                  const yRaw = typeof yAmt === 'object' ? yAmt.toString() : String(yAmt);

                  totalXAmount += Number(xRaw) / Math.pow(10, xDecimals);
                  totalYAmount += Number(yRaw) / Math.pow(10, yDecimals);
                }
              }

              console.log(`[useUserPositionsForPool] Summed from bins: X=${totalXAmount}, Y=${totalYAmount}`);
            }

            console.log(`[useUserPositionsForPool] Calculated amounts:`, {
              totalX: totalXAmount.toFixed(6),
              totalY: totalYAmount.toFixed(6),
              feesX: unclaimedFeesX.toFixed(6),
              feesY: unclaimedFeesY.toFixed(6),
            });

            // Get bin range - DLMM positions have lowerBinId and upperBinId
            // These define the price range of the position
            let minBinId = position.positionData?.lowerBinId;
            let maxBinId = position.positionData?.upperBinId;

            console.log(`[useUserPositionsForPool] Bin range from positionData:`, {
              lowerBinId: minBinId,
              upperBinId: maxBinId,
            });

            // If bin IDs are missing, try alternative sources
            if (minBinId === undefined || maxBinId === undefined) {
              console.log(`[useUserPositionsForPool] ⚠️  Bin IDs missing, checking alternatives...`);

              // Check if position has bin array
              const positionBins = (position as any).positionBinData || (position as any).bins || [];

              if (positionBins.length > 0) {
                console.log(`[useUserPositionsForPool] Found ${positionBins.length} bins in position`);

                // Extract min/max from bin array
                minBinId = Math.min(...positionBins.map((b: any) => b.binId || 0));
                maxBinId = Math.max(...positionBins.map((b: any) => b.binId || 0));

                console.log(`[useUserPositionsForPool] Extracted from bins: ${minBinId} → ${maxBinId}`);
              } else {
                // Last resort: use position itself
                minBinId = (position as any).lowerBinId ?? 0;
                maxBinId = (position as any).upperBinId ?? 0;
                console.log(`[useUserPositionsForPool] Using position keys: ${minBinId} → ${maxBinId}`);
              }
            }

            // Ensure valid bin IDs
            if (minBinId === undefined) minBinId = 0;
            if (maxBinId === undefined) maxBinId = 0;

            console.log(`[useUserPositionsForPool] Final bin range: ${minBinId} → ${maxBinId}`);

            positions.push({
              address: position.publicKey.toString(),
              poolAddress: poolAddress, // Use the pool address we queried with
              baseTokenAddress: tokenX.publicKey.toString(),
              quoteTokenAddress: tokenY.publicKey.toString(),
              baseSymbol: 'TOKEN_X', // TokenReserve type doesn't include symbol
              quoteSymbol: 'TOKEN_Y', // TokenReserve type doesn't include symbol
              baseAmount: totalXAmount,
              quoteAmount: totalYAmount,
              totalValue: 0, // TODO: Calculate USD value
              unclaimedFeesBase: unclaimedFeesX,
              unclaimedFeesQuote: unclaimedFeesY,
              lowerBinId: minBinId === Number.MAX_SAFE_INTEGER ? 0 : minBinId,
              upperBinId: maxBinId === Number.MIN_SAFE_INTEGER ? 0 : maxBinId,
              lastUpdated: new Date(),
            });
          } catch (error) {
            console.error('[useUserPositionsForPool] Failed to parse position:', error);
          }
        }

        console.log(`[useUserPositionsForPool] Parsed ${positions.length} position(s) successfully`);
        return positions;
      } catch (error: any) {
        console.error('[useUserPositionsForPool] Error:', error);

        // Handle SDK errors gracefully
        if (error.message?.includes('Invalid account discriminator')) {
          console.warn('[useUserPositionsForPool] SDK version mismatch - returning empty');
          return [];
        }

        return [];
      }
    },
    enabled: !!publicKey && !!poolAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: false, // Manual refresh only
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
