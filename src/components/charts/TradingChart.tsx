/**
 * TradingView-style interactive price chart
 * Uses lightweight-charts library for performance
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import type { OHLCDataPoint } from '@/lib/services/bitquery';

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
  background: '#0a0a0a',
  grid: '#1a1a1a',
  text: '#9ca3af',
  up: '#10b981',
  down: '#ef4444',
  volume: '#3b82f6',
  crosshair: '#6b7280',
};

export function TradingChart({
  data,
  chartType = 'candlestick',
  interval = '15m',
  height = 600,
  showVolume = true,
  loading = false,
  onIntervalChange,
  onChartTypeChange,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 1,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
        horzLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 1,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
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
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, interval]);

  // Update chart type
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove old series
    if (priceSeriesRef.current) {
      chartRef.current.removeSeries(priceSeriesRef.current);
    }

    // Create new series based on chart type
    let newSeries;

    if (chartType === 'candlestick') {
      newSeries = chartRef.current.addCandlestickSeries({
        upColor: CHART_COLORS.up,
        downColor: CHART_COLORS.down,
        borderUpColor: CHART_COLORS.up,
        borderDownColor: CHART_COLORS.down,
        wickUpColor: CHART_COLORS.up,
        wickDownColor: CHART_COLORS.down,
      });
    } else if (chartType === 'line') {
      newSeries = chartRef.current.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 2,
      });
    } else {
      newSeries = chartRef.current.addAreaSeries({
        topColor: 'rgba(139, 92, 246, 0.4)',
        bottomColor: 'rgba(139, 92, 246, 0.0)',
        lineColor: '#8b5cf6',
        lineWidth: 2,
      });
    }

    priceSeriesRef.current = newSeries as any;
  }, [chartType]);

  // Add volume series
  useEffect(() => {
    if (!chartRef.current || !showVolume) return;

    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
    }

    const volumeSeries = chartRef.current.addHistogramSeries({
      color: CHART_COLORS.volume,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chartRef.current.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeriesRef.current = volumeSeries;

    return () => {
      if (volumeSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
      }
    };
  }, [showVolume]);

  // Update chart data
  useEffect(() => {
    if (!priceSeriesRef.current || data.length === 0) return;

    if (chartType === 'candlestick') {
      const candleData: CandlestickData[] = data.map(d => ({
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

    // Update volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? CHART_COLORS.up : CHART_COLORS.down,
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
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
