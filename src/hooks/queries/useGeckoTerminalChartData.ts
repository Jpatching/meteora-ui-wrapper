/**
 * React Query hook for GeckoTerminal chart data
 * Provides OHLCV data for Solana DEX pools with caching and auto-refresh
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getGeckoTerminalOHLCV,
  getPoolAddressForToken,
  calculate24hChange,
  INTERVAL_TO_TIMEFRAME,
  getAggregateForInterval,
  getLimitForInterval,
  type OHLCVDataPoint,
  type GeckoTerminalTimeframe,
} from '@/lib/services/geckoterminal';
import { Pool } from '@/lib/jupiter/types';

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface UseGeckoTerminalChartDataOptions {
  pool: Pool | null;
  interval?: TimeInterval;
  limit?: number; // Override default limit
  enabled?: boolean; // Allow disabling the query
}

export interface UseGeckoTerminalChartDataReturn {
  data: OHLCVDataPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  currentPrice: number;
  priceChange24h: number;
}

/**
 * Hook to fetch chart data from GeckoTerminal API
 *
 * @example
 * ```tsx
 * const { data, loading, currentPrice, priceChange24h } = useGeckoTerminalChartData({
 *   pool,
 *   interval: '15m',
 * });
 * ```
 */
export function useGeckoTerminalChartData({
  pool,
  interval = '15m',
  limit,
  enabled = true,
}: UseGeckoTerminalChartDataOptions): UseGeckoTerminalChartDataReturn {
  const timeframe = INTERVAL_TO_TIMEFRAME[interval] as GeckoTerminalTimeframe;
  const aggregate = getAggregateForInterval(interval);
  const candleLimit = limit || getLimitForInterval(interval);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['geckoterminal-chart', pool?.baseAsset?.id, interval, candleLimit],
    enabled: enabled && !!pool?.baseAsset?.id,
    queryFn: async (): Promise<{
      candles: OHLCVDataPoint[];
      currentPrice: number;
      priceChange24h: number;
    }> => {
      if (!pool?.baseAsset?.id) {
        throw new Error('Pool base asset ID is required');
      }

      // Step 1: Get pool address from DEXScreener
      const poolAddress = await getPoolAddressForToken(pool.baseAsset.id);

      if (!poolAddress) {
        // Fallback: use existing pool price data
        console.warn('[useGeckoTerminalChartData] No pool found, using fallback price');
        const currentPrice = pool.baseAsset.usdPrice || 0;
        const priceChange24h = pool.baseAsset.stats24h?.priceChange || 0;

        // Create a single synthetic candle
        const now = Math.floor(Date.now() / 1000);
        return {
          candles: [{
            time: now,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: pool.volume24h || 0,
          }],
          currentPrice,
          priceChange24h,
        };
      }

      // Step 2: Fetch OHLCV data from GeckoTerminal
      const candles = await getGeckoTerminalOHLCV(
        poolAddress,
        timeframe,
        aggregate,
        candleLimit
      );

      if (candles.length === 0) {
        // Fallback if no candles returned
        console.warn('[useGeckoTerminalChartData] No candles returned, using fallback');
        const currentPrice = pool.baseAsset.usdPrice || 0;
        const priceChange24h = pool.baseAsset.stats24h?.priceChange || 0;

        const now = Math.floor(Date.now() / 1000);
        return {
          candles: [{
            time: now,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: pool.volume24h || 0,
          }],
          currentPrice,
          priceChange24h,
        };
      }

      // Calculate price metrics
      const { currentPrice, priceChange24h } = calculate24hChange(candles);

      return {
        candles,
        currentPrice,
        priceChange24h,
      };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 90000, // 90 seconds (conservative to respect rate limits)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: data?.candles || [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
    currentPrice: data?.currentPrice || pool?.baseAsset?.usdPrice || 0,
    priceChange24h: data?.priceChange24h || pool?.baseAsset?.stats24h?.priceChange || 0,
  };
}
