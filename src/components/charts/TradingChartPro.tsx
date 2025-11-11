/**
 * Professional Trading Chart - Charting.ag style
 * Enhanced lightweight-charts with full feature set
 */

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import type { OHLCVDataPoint } from '@/lib/services/geckoterminal';

export type ChartMode = 'price' | 'mcap';
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface TradingChartProProps {
  data: OHLCVDataPoint[];
  interval?: TimeInterval;
  height?: number;
  loading?: boolean;
  onIntervalChange?: (interval: TimeInterval) => void;
  tokenSymbol?: string;
  tokenName?: string;
  currentPrice?: number;
  marketCap?: number;
}

const INTERVALS: TimeInterval[] = ['1m', '5m', '15m', '1h', '1d'];

const CHART_COLORS = {
  background: '#1a1e2e',
  backgroundSecondary: '#151922',
  grid: '#2a2e3e',
  gridSubtle: '#1f2330',
  text: '#8f98ad',
  textBright: '#ffffff',
  up: '#3fcfb4',      // Charting.ag green
  down: '#fe4761',    // Charting.ag red
  volumeUp: 'rgba(63, 207, 180, 0.3)',
  volumeDown: 'rgba(254, 71, 97, 0.3)',
  accent: '#3b82f6',  // Blue for active elements
  cyan: '#0cbef3',    // Cyan for current price
  rangeLineColor: '#3b82f6',
};

export function TradingChartPro({
  data,
  interval = '15m',
  height = 500,
  loading = false,
  onIntervalChange,
  tokenSymbol = 'TOKEN',
  tokenName = 'Token',
  currentPrice = 0,
  marketCap,
}: TradingChartProProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maxLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const minLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [mode, setMode] = useState<ChartMode>('price');
  const [showHistory, setShowHistory] = useState(false);

  // Calculate price range (max/min)
  const priceRange = useMemo(() => {
    if (!data || data.length === 0) return { max: 0, min: 0 };

    const prices = data.map(d => d.high);
    const max = Math.max(...prices);
    const min = Math.min(...prices);

    return { max, min };
  }, [data]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: {
          color: CHART_COLORS.gridSubtle,
          style: LineStyle.Solid,
        },
        horzLines: {
          color: CHART_COLORS.gridSubtle,
          style: LineStyle.Solid,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: CHART_COLORS.accent,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CHART_COLORS.accent,
        },
        horzLine: {
          color: CHART_COLORS.accent,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CHART_COLORS.accent,
        },
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: interval === '1m' || interval === '5m',
        barSpacing: 6,        // Charting.ag ultra-thin candles
        minBarSpacing: 2,
        rightOffset: 10,
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Space for volume
        },
      },
      height,
      width: chartContainerRef.current.clientWidth,
    });

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [height, interval]);

  // Update chart data
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;

    // Remove existing series
    if (candlestickSeriesRef.current) {
      chart.removeSeries(candlestickSeriesRef.current);
      candlestickSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }
    if (maxLineRef.current) {
      chart.removeSeries(maxLineRef.current);
      maxLineRef.current = null;
    }
    if (minLineRef.current) {
      chart.removeSeries(minLineRef.current);
      minLineRef.current = null;
    }

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: true,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: CHART_COLORS.volumeUp,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeriesRef.current = volumeSeries;

    // Set data
    const candleData = data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    }));

    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Add max/min range lines (horizontal dotted lines)
    if (priceRange.max > 0 && priceRange.min > 0) {
      const maxLine = chart.addLineSeries({
        color: CHART_COLORS.rangeLineColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      const minLine = chart.addLineSeries({
        color: CHART_COLORS.rangeLineColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      maxLineRef.current = maxLine;
      minLineRef.current = minLine;

      // Create horizontal lines for max/min
      const maxData = [
        { time: data[0].time, value: priceRange.max },
        { time: data[data.length - 1].time, value: priceRange.max },
      ];

      const minData = [
        { time: data[0].time, value: priceRange.min },
        { time: data[data.length - 1].time, value: priceRange.min },
      ];

      maxLine.setData(maxData);
      minLine.setData(minData);
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [data, priceRange]);

  return (
    <div className="relative">
      {/* Top Control Bar - Charting.ag Style */}
      <div className="flex items-center justify-between mb-3 gap-4">
        {/* Left: Timeframe Pills */}
        <div className="flex gap-1">
          {INTERVALS.map(int => (
            <button
              key={int}
              onClick={() => onIntervalChange?.(int)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                interval === int
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/25'
                  : 'bg-[#1f2330] text-[#8f98ad] hover:bg-[#2a2e3e] hover:text-white'
              }`}
            >
              {int.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Center: Price/MCap Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('price')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'price'
                ? 'text-white border-b-2 border-[#3b82f6]'
                : 'text-[#8f98ad] hover:text-white'
            }`}
          >
            Price
          </button>
          <button
            onClick={() => setMode('mcap')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'mcap'
                ? 'text-white border-b-2 border-[#3b82f6]'
                : 'text-[#8f98ad] hover:text-white'
            }`}
          >
            MCap
          </button>
        </div>

        {/* Right: History Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1f2330] text-[#8f98ad] hover:bg-[#2a2e3e] hover:text-white text-xs font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          History
        </button>
      </div>

      {/* Token Info Bar - Top Left of Chart */}
      <div className="absolute top-16 left-4 z-10 pointer-events-none">
        <div className="text-xs text-[#8f98ad] mb-1">
          {tokenSymbol} / USDT - Exchange
        </div>
        <div className="text-lg font-semibold text-white">
          ${currentPrice.toFixed(4)}
        </div>
      </div>

      {/* Max/Min Price Labels - Right Side */}
      {priceRange.max > 0 && (
        <>
          <div className="absolute top-16 right-4 z-10 pointer-events-none text-xs text-[#3b82f6]">
            max: ${priceRange.max.toFixed(6)}
          </div>
          <div className="absolute bottom-32 right-4 z-10 pointer-events-none text-xs text-[#3b82f6]">
            min: ${priceRange.min.toFixed(6)}
          </div>
        </>
      )}

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="relative rounded-lg overflow-hidden border border-[#2a2e3e]"
        style={{ height: `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1e2e]/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-[#8f98ad]">Loading chart data...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
