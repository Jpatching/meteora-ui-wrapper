/**
 * Hook for fetching and managing chart OHLCV data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import {
  bitqueryClient,
  GET_DLMM_OHLC,
  SUBSCRIBE_TO_TRADES,
  transformOHLCData,
  type OHLCDataPoint,
  type Trade,
} from '@/lib/services/bitquery';

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

const INTERVAL_SECONDS: Record<TimeInterval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

const INTERVAL_DURATION: Record<TimeInterval, string> = {
  '1m': '24 hours',
  '5m': '3 days',
  '15m': '7 days',
  '1h': '30 days',
  '4h': '90 days',
  '1d': '1 year',
  '1w': '2 years',
};

export interface UseChartDataOptions {
  poolAddress: string;
  interval?: TimeInterval;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface UseChartDataReturn {
  data: OHLCDataPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  currentPrice: number | null;
  priceChange24h: number | null;
}

export function useChartData({
  poolAddress,
  interval = '15m',
  autoRefresh = false,
  refreshInterval = 30000, // 30s
}: UseChartDataOptions): UseChartDataReturn {
  const [chartData, setChartData] = useState<OHLCDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);

  // Calculate time range for the query
  const getTimeRange = useCallback(() => {
    const now = new Date();
    const duration = INTERVAL_DURATION[interval];
    const match = duration.match(/(\d+)\s+(hour|day|year)s?/);

    if (!match) return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), till: now };

    const [, amount, unit] = match;
    const milliseconds = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    }[unit];

    const from = new Date(now.getTime() - parseInt(amount) * (milliseconds || 0));
    return { from, till: now };
  }, [interval]);

  const { from, till } = getTimeRange();

  // Fetch OHLC data
  const { data, loading, error, refetch } = useQuery(GET_DLMM_OHLC, {
    client: bitqueryClient,
    variables: {
      pool: poolAddress,
      from: from.toISOString(),
      till: till.toISOString(),
      interval: INTERVAL_SECONDS[interval],
    },
    skip: !poolAddress,
    pollInterval: autoRefresh ? refreshInterval : undefined,
  });

  // Subscribe to real-time trades for live price updates
  const { data: tradeData } = useSubscription(SUBSCRIBE_TO_TRADES, {
    client: bitqueryClient,
    variables: { pool: poolAddress },
    skip: !poolAddress || !autoRefresh,
  });

  // Transform and update chart data
  useEffect(() => {
    if (data) {
      const transformed = transformOHLCData(data);
      setChartData(transformed);

      // Update current price from latest candle
      if (transformed.length > 0) {
        const latest = transformed[transformed.length - 1];
        setCurrentPrice(latest.close);

        // Calculate 24h price change
        const dayAgo = Date.now() / 1000 - 86400;
        const dayAgoCandle = transformed.find(c => c.time >= dayAgo);

        if (dayAgoCandle) {
          const change = ((latest.close - dayAgoCandle.open) / dayAgoCandle.open) * 100;
          setPriceChange24h(change);
        }
      }
    }
  }, [data]);

  // Update price from real-time trades
  useEffect(() => {
    if (tradeData?.Solana?.DEXTrades?.[0]) {
      const latestTrade = tradeData.Solana.DEXTrades[0];
      const price = parseFloat(latestTrade.Trade.Price || 0);

      if (price > 0) {
        setCurrentPrice(price);

        // Update the latest candle with the new price
        setChartData(prev => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          const lastCandle = { ...updated[updated.length - 1] };

          lastCandle.close = price;
          lastCandle.high = Math.max(lastCandle.high, price);
          lastCandle.low = Math.min(lastCandle.low, price);
          lastCandle.volume += parseFloat(latestTrade.Trade.Amount || 0);

          updated[updated.length - 1] = lastCandle;
          return updated;
        });
      }
    }
  }, [tradeData]);

  return {
    data: chartData,
    loading,
    error: error as Error | null,
    refetch,
    currentPrice,
    priceChange24h,
  };
}
