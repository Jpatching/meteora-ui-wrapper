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
    };
  }, [enabled, poolAddress, connection, network]);

  // Fetch bin data
  const fetchBinData = useCallback(async () => {
    if (!serviceRef.current || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch active bin
      const active = await serviceRef.current.getActiveBin();
      setActiveBin(active);

      // Fetch bins around active
      const bins = await serviceRef.current.getBinsAroundActiveBin(binRange);
      setBinsAroundActive(bins);

      setIsLoading(false);
    } catch (err: any) {
      // Don't spam console with errors for invalid pools
      const errorMessage = err?.message || 'Unknown error';
      if (!errorMessage.includes('Invalid DLMM pool account')) {
        console.error('[useBinData] Error fetching bin data:', err);
      }
      setError(err as Error);
      setIsLoading(false);
      // Clear interval on error to prevent spam
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, binRange]);

  // Initial fetch and re-fetch when pool changes
  useEffect(() => {
    if (enabled && serviceRef.current) {
      fetchBinData();
    }
  }, [enabled, fetchBinData, poolAddress]); // Added poolAddress to trigger re-fetch

  // Set up auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      fetchBinData();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchBinData]);

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
