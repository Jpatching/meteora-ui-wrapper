/**
 * React Hook for Real-time Bin Data Tracking
 * Provides live updates of active bin, bin distributions, and position ranges
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  BinDataService,
  createBinDataService,
  type BinData,
  type ActiveBinInfo,
  type PositionRangeData,
} from '@/lib/meteora/binDataService';

export interface UseBinDataOptions {
  poolAddress: string;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds
  binRange?: number; // number of bins around active to fetch
}

export interface UseBinDataReturn {
  activeBin: ActiveBinInfo | null;
  binsAroundActive: BinData[];
  binsBetweenPrices: (minPrice: number, maxPrice: number) => Promise<BinData[]>;
  getPositionRange: (positionAddress: string) => Promise<PositionRangeData>;
  shouldRebalance: (positionAddress: string, threshold?: number) => Promise<any>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useBinData({
  poolAddress,
  enabled = true,
  refreshInterval = 5000, // 5 seconds default
  binRange = 50,
}: UseBinDataOptions): UseBinDataReturn {
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [activeBin, setActiveBin] = useState<ActiveBinInfo | null>(null);
  const [binsAroundActive, setBinsAroundActive] = useState<BinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<BinDataService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef<boolean>(false); // Prevent double-fetch

  // Initialize service
  useEffect(() => {
    if (!enabled || !poolAddress || !connection) {
      return;
    }

    try {
      serviceRef.current = createBinDataService(
        connection,
        poolAddress,
        network as 'mainnet-beta' | 'devnet' | 'localhost'
      );
      hasFetchedRef.current = false; // Reset fetch flag when service reinitializes
    } catch (err) {
      console.error('[useBinData] Failed to create service:', err);
      setError(err as Error);
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      hasFetchedRef.current = false;
    };
  }, [enabled, poolAddress, connection, network]);

  // Fetch bin data - memoized with stable reference
  const fetchBinData = useCallback(async () => {
    if (!serviceRef.current || !enabled) {
      console.log('[useBinData] Skipping fetch: service or enabled check failed', {
        hasService: !!serviceRef.current,
        enabled
      });
      return;
    }

    try {
      console.log('[useBinData] Starting bin data fetch...', { network, poolAddress });
      setIsLoading(true);
      setError(null);

      // OPTIMIZATION: For devnet pools, try to fetch bin data from backend first
      // This avoids RPC rate limits and is much faster
      if (network === 'devnet') {
        try {
          console.log('[useBinData] Attempting to fetch devnet bin data from backend...');
          const response = await fetch(`/api/pools/${poolAddress}?network=devnet`);

          if (response.ok) {
            const poolData = await response.json();

            // Check if backend has bin data stored
            if (poolData.metadata?.bins && poolData.metadata.bins.length > 0) {
              console.log('[useBinData] ✅ Using bin data from backend!', {
                binsCount: poolData.metadata.bins.length,
                activeBin: poolData.metadata.active_bin
              });

              // Set active bin info
              const activeBinData = poolData.metadata.bins.find((b: any) => b.isActive);
              if (activeBinData || poolData.metadata.active_bin) {
                setActiveBin({
                  binId: poolData.metadata.active_bin,
                  price: parseFloat(poolData.metadata.current_price || '0'),
                  pricePerToken: parseFloat(poolData.metadata.current_price || '0'),
                  supply: 0,
                  xAmount: parseFloat(poolData.metadata.reserve_x || '0'),
                  yAmount: parseFloat(poolData.metadata.reserve_y || '0'),
                });
              }

              // Set bins
              setBinsAroundActive(poolData.metadata.bins.map((b: any) => ({
                binId: b.binId,
                price: b.price,
                pricePerToken: b.price,
                liquidityX: b.liquidityX,
                liquidityY: b.liquidityY,
                totalLiquidity: b.totalLiquidity,
                isActive: b.isActive || b.binId === poolData.metadata.active_bin,
              })));

              setIsLoading(false);
              hasFetchedRef.current = true;
              console.log('[useBinData] ✅ Devnet bin data loaded from backend');
              return; // Skip RPC fetch
            }
          }

          console.log('[useBinData] Backend has no bin data, falling back to RPC...');
        } catch (backendError) {
          console.warn('[useBinData] Backend fetch failed, falling back to RPC:', backendError);
        }
      }

      // Fallback: Fetch from RPC (mainnet or devnet without backend data)
      console.log('[useBinData] Fetching from RPC...');

      // Fetch active bin
      const active = await serviceRef.current.getActiveBin();
      console.log('[useBinData] Active bin fetched:', active);
      setActiveBin(active);

      // Fetch bins around active
      const bins = await serviceRef.current.getBinsAroundActiveBin(binRange);
      console.log('[useBinData] Bins fetched:', {
        count: bins.length,
        withLiquidity: bins.filter(b => b.totalLiquidity > 0).length
      });
      setBinsAroundActive(bins);

      setIsLoading(false);
      hasFetchedRef.current = true;
      console.log('[useBinData] ✅ Fetch complete');
    } catch (err: any) {
      // Log ALL errors with full details for debugging
      console.error('[useBinData] ❌ Error fetching bin data:', {
        error: err,
        message: err?.message,
        stack: err?.stack?.split('\n').slice(0, 3),
      });
      setError(err as Error);
      setIsLoading(false);
      // Clear interval on error to prevent spam
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, binRange]);

  // Initial fetch - run ONCE when service is ready
  useEffect(() => {
    if (enabled && serviceRef.current && !hasFetchedRef.current) {
      // Debounce to prevent React Strict Mode double-invoke
      const timeoutId = setTimeout(() => {
        fetchBinData();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, poolAddress, connection, network]); // Only depend on service initialization deps

  // Set up auto-refresh - separate effect with stable dependencies
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || !serviceRef.current) return;

    intervalRef.current = setInterval(() => {
      if (serviceRef.current) {
        fetchBinData();
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, poolAddress, fetchBinData]); // Include poolAddress to reset on pool change

  // Helper function to get bins between prices
  const binsBetweenPrices = useCallback(
    async (minPrice: number, maxPrice: number): Promise<BinData[]> => {
      if (!serviceRef.current) {
        throw new Error('BinDataService not initialized');
      }
      return serviceRef.current.getBinsBetweenPrices(minPrice, maxPrice);
    },
    []
  );

  // Helper function to get position range data
  const getPositionRange = useCallback(
    async (positionAddress: string): Promise<PositionRangeData> => {
      if (!serviceRef.current) {
        throw new Error('BinDataService not initialized');
      }
      return serviceRef.current.getPositionRangeData(positionAddress);
    },
    []
  );

  // Helper function to check if rebalancing is needed
  const shouldRebalance = useCallback(
    async (positionAddress: string, threshold: number = 0.1) => {
      if (!serviceRef.current) {
        throw new Error('BinDataService not initialized');
      }
      return serviceRef.current.shouldRebalancePosition(positionAddress, threshold);
    },
    []
  );

  return {
    activeBin,
    binsAroundActive,
    binsBetweenPrices,
    getPositionRange,
    shouldRebalance,
    isLoading,
    error,
    refresh: fetchBinData,
  };
}

/**
 * Hook for tracking multiple positions with rebalance alerts
 */
export function usePositionMonitor(
  poolAddress: string,
  positionAddresses: string[],
  options?: {
    checkInterval?: number;
    rebalanceThreshold?: number;
    onRebalanceNeeded?: (position: string, reason: string) => void;
  }
) {
  const { connection } = useConnection();
  const { network } = useNetwork();

  const [positionStates, setPositionStates] = useState<
    Record<
      string,
      {
        needsRebalance: boolean;
        reason?: string;
        lastCheck: number;
        currentPrice: number;
      }
    >
  >({});

  const serviceRef = useRef<BinDataService | null>(null);

  const checkInterval = options?.checkInterval || 30000; // 30 seconds
  const rebalanceThreshold = options?.rebalanceThreshold || 0.1;

  useEffect(() => {
    if (!poolAddress || !connection) return;

    serviceRef.current = createBinDataService(
      connection,
      poolAddress,
      network as 'mainnet-beta' | 'devnet' | 'localhost'
    );

    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
      }
    };
  }, [poolAddress, connection, network]);

  const checkPositions = useCallback(async () => {
    if (!serviceRef.current || positionAddresses.length === 0) return;

    const newStates: typeof positionStates = {};

    for (const positionAddress of positionAddresses) {
      try {
        const result = await serviceRef.current.shouldRebalancePosition(
          positionAddress,
          rebalanceThreshold
        );

        newStates[positionAddress] = {
          needsRebalance: result.shouldRebalance,
          reason: result.reason,
          lastCheck: Date.now(),
          currentPrice: result.currentPrice,
        };

        // Trigger callback if rebalance needed
        if (result.shouldRebalance && options?.onRebalanceNeeded) {
          options.onRebalanceNeeded(positionAddress, result.reason || 'Unknown reason');
        }
      } catch (error) {
        console.error(`[usePositionMonitor] Error checking position ${positionAddress}:`, error);
      }
    }

    setPositionStates(newStates);
  }, [positionAddresses, rebalanceThreshold, options]);

  // Initial check and interval
  useEffect(() => {
    checkPositions();

    const interval = setInterval(checkPositions, checkInterval);

    return () => clearInterval(interval);
  }, [checkPositions, checkInterval]);

  return {
    positionStates,
    refresh: checkPositions,
  };
}
