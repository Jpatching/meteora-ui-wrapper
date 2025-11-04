/**
 * TradingView-style interactive price chart
 * Uses lightweight-charts library for performance
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import type { OHLCVDataPoint } from '@/lib/services/geckoterminal';

// Type alias for backwards compatibility
type OHLCDataPoint = OHLCVDataPoint;

export type ChartType = 'candlestick' | 'line' | 'area';
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface TradingChartProps {
  data: OHLCDataPoint[];
  chartType?: ChartType;
  interval?: TimeInterval;
  height?: number;
  showVolume?: boolean;
  loading?: boolean;
  onIntervalChange?: (interval: TimeInterval) => void;
  onChartTypeChange?: (type: ChartType) => void;
}

const INTERVALS: TimeInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

const CHART_COLORS = {
  background: '#0a0a0f',
  grid: '#27272a',
  text: '#f5f5f7',
  up: '#10b981',
  down: '#ef4444',
  volume: '#3b82f6',
  crosshair: '#6b7280',
};

export function TradingChart({
  data,
  chartType = 'candlestick',
  interval = '15m',
  height = 500,
  showVolume = true,
  loading = false,
  onIntervalChange,
  onChartTypeChange,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const priceSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize chart (runs once on mount)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: 1, // Normal crosshair mode
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: interval === '1m' || interval === '5m',
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
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

  // Manage series AND update data (merged to prevent race conditions)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove existing series first
    if (priceSeriesRef.current) {
      try {
        chart.removeSeries(priceSeriesRef.current);
      } catch (e) {
        console.warn('[TradingChart] Series already removed:', e);
      }
      priceSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      try {
        chart.removeSeries(volumeSeriesRef.current);
      } catch (e) {
        console.warn('[TradingChart] Volume series already removed:', e);
      }
      volumeSeriesRef.current = null;
    }

    // Add new series based on chart type
    try {
      if (chartType === 'candlestick') {
        priceSeriesRef.current = chart.addCandlestickSeries({
          upColor: CHART_COLORS.up,
          downColor: CHART_COLORS.down,
          borderVisible: true,
          wickUpColor: CHART_COLORS.up,
          wickDownColor: CHART_COLORS.down,
        });
      } else if (chartType === 'line') {
        priceSeriesRef.current = chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
        });
      } else {
        priceSeriesRef.current = chart.addAreaSeries({
          topColor: 'rgba(139, 92, 246, 0.4)',
          bottomColor: 'rgba(139, 92, 246, 0.0)',
          lineColor: '#8b5cf6',
          lineWidth: 2,
        });
      }

      // Add volume series if enabled
      if (showVolume) {
        volumeSeriesRef.current = chart.addHistogramSeries({
          color: CHART_COLORS.volume,
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });
      }
    } catch (error) {
      console.error('[TradingChart] Error adding chart series:', error);
      return; // Don't try to set data if series creation failed
    }

    // Set data immediately after series creation (atomic operation)
    if (priceSeriesRef.current && data && data.length > 0) {
      try {
        if (chartType === 'candlestick') {
          const candleData = data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
          priceSeriesRef.current.setData(candleData);
        } else {
          const lineData = data.map(d => ({
            time: d.time,
            value: d.close,
          }));
          priceSeriesRef.current.setData(lineData);
        }
      } catch (error) {
        console.error('[TradingChart] Error setting price data:', error);
      }
    }

    // Update volume data
    if (volumeSeriesRef.current && showVolume && data && data.length > 0) {
      try {
        const volumeData = data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? CHART_COLORS.up : CHART_COLORS.down,
        }));
        volumeSeriesRef.current.setData(volumeData);
      } catch (error) {
        console.error('[TradingChart] Error setting volume data:', error);
      }
    }

    // Fit content
    try {
      chart.timeScale().fitContent();
    } catch (error) {
      console.warn('[TradingChart] Error fitting content:', error);
    }

    // Cleanup only on unmount (not on every dependency change)
    return () => {
      if (priceSeriesRef.current) {
        try {
          chart.removeSeries(priceSeriesRef.current);
        } catch (e) {
          // Chart might already be disposed
        }
        priceSeriesRef.current = null;
      }
      if (volumeSeriesRef.current) {
        try {
          chart.removeSeries(volumeSeriesRef.current);
        } catch (e) {
          // Chart might already be disposed
        }
        volumeSeriesRef.current = null;
      }
    };
  }, [data, chartType, showVolume]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;

    if (!isFullscreen) {
      chartContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="relative">
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-4 gap-4">
        {/* Chart Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => onChartTypeChange?.('candlestick')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              chartType === 'candlestick'
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            Candles
          </button>
          <button
            onClick={() => onChartTypeChange?.('line')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => onChartTypeChange?.('area')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              chartType === 'area'
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            Area
          </button>
        </div>

        {/* Interval Selector */}
        <div className="flex gap-1">
          {INTERVALS.map(int => (
            <button
              key={int}
              onClick={() => onIntervalChange?.(int)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                interval === int
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
              }`}
            >
              {int.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded bg-background-secondary hover:bg-background-tertiary transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="relative rounded-lg overflow-hidden border border-border"
        style={{ height: isFullscreen ? '100vh' : `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-foreground-muted">Loading chart data...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
