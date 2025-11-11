/**
 * Professional Trading Chart - Charting.ag style
 * Enhanced lightweight-charts with full feature set
 */

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import type { OHLCVDataPoint } from '@/lib/services/geckoterminal';
import type { BinData } from '@/lib/meteora/binDataService';

export type ChartMode = 'price' | 'mcap';
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface PositionRange {
  minPrice: number;
  maxPrice: number;
  color?: string;
  label?: string;
}

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
  // DLMM-specific props
  binData?: BinData[];
  showBinDistribution?: boolean;
  activeBinPrice?: number;
  positionRanges?: PositionRange[];
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
  // DLMM overlay colors
  activeBin: '#8b5cf6',           // Purple for active bin
  binLiquidity: 'rgba(139, 92, 246, 0.15)',  // Purple with transparency for bin histogram
  positionRange: 'rgba(16, 185, 129, 0.2)',  // Green for user positions
  positionBorder: '#10b981',
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
  binData,
  showBinDistribution = false,
  activeBinPrice,
  positionRanges = [],
}: TradingChartProProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maxLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const minLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  // DLMM overlay refs (charting.ag blue box style)
  const dlmmRangeAreaRef = useRef<ISeriesApi<'Area'> | null>(null);
  const dlmmRangeTopRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dlmmRangeBottomRef = useRef<ISeriesApi<'Line'> | null>(null);
  const activeBinLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const positionRangeLinesRef = useRef<ISeriesApi<'Line'>[]>([]);

  const [mode, setMode] = useState<ChartMode>('price');
  const [showHistory, setShowHistory] = useState(false);

  // Debug: Watch mode changes
  useEffect(() => {
    console.log('🎯 Mode state changed to:', mode);
  }, [mode]);

  // Calculate price range (max/min) from OHLC data
  const priceRange = useMemo(() => {
    if (!data || data.length === 0) return { max: 0, min: 0 };

    const prices = data.map(d => d.high);
    const max = Math.max(...prices);
    const min = Math.min(...prices);

    return { max, min };
  }, [data]);

  // Calculate DLMM liquidity range (charting.ag blue box)
  const dlmmRange = useMemo(() => {
    if (!binData || binData.length === 0) {
      console.log('📊 TradingChartPro - No bin data');
      return { max: 0, min: 0 };
    }

    const binPrices = binData.map(bin => bin.price);
    const max = Math.max(...binPrices);
    const min = Math.min(...binPrices);

    console.log(`📊 TradingChartPro - DLMM Range calculated:`, {
      binCount: binData.length,
      minPrice: min,
      maxPrice: max,
      firstBinPrice: binData[0]?.price,
      lastBinPrice: binData[binData.length - 1]?.price,
    });

    return { max, min };
  }, [binData]);

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

  // Calculate circulating supply from current market cap and price
  const circulatingSupply = useMemo(() => {
    if (!marketCap || !currentPrice || currentPrice === 0) {
      console.log('⚠️ Cannot calculate circulating supply:', { marketCap, currentPrice });
      return null;
    }
    const supply = marketCap / currentPrice;
    console.log('✅ Circulating supply calculated:', supply, '(MCap:', marketCap, '/ Price:', currentPrice, ')');
    return supply;
  }, [marketCap, currentPrice]);

  // Update chart data
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;

    console.log('📊 Chart update triggered - Mode:', mode, 'CircSupply:', circulatingSupply);

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
    });

    volumeSeriesRef.current = volumeSeries;

    // Set data (time must be in seconds for lightweight-charts)
    // Transform to market cap if mode is 'mcap' and we have circulating supply
    const candleData = data.map((d, idx) => {
      if (mode === 'mcap' && circulatingSupply) {
        if (idx === 0) {
          console.log('💰 MCap mode - Sample transformation:', {
            originalClose: d.close,
            transformedClose: d.close * circulatingSupply,
            circulatingSupply
          });
        }
        return {
          time: d.time as any,
          open: d.open * circulatingSupply,
          high: d.high * circulatingSupply,
          low: d.low * circulatingSupply,
          close: d.close * circulatingSupply,
        };
      }
      if (idx === 0) {
        console.log('💵 Price mode - Original close:', d.close);
      }
      return {
        time: d.time as any,  // Cast to any to handle time type mismatch
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      };
    });

    const volumeData = data.map(d => ({
      time: d.time as any,  // Cast to any to handle time type mismatch
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
        { time: data[0].time as any, value: priceRange.max },
        { time: data[data.length - 1].time as any, value: priceRange.max },
      ];

      const minData = [
        { time: data[0].time as any, value: priceRange.min },
        { time: data[data.length - 1].time as any, value: priceRange.min },
      ];

      maxLine.setData(maxData);
      minLine.setData(minData);
    }

    // Add DLMM liquidity range box (charting.ag blue shaded area)
    if (showBinDistribution && dlmmRange.max > 0 && dlmmRange.min > 0 && data.length > 0) {
      // Remove existing DLMM range visuals
      if (dlmmRangeAreaRef.current) {
        chart.removeSeries(dlmmRangeAreaRef.current);
        dlmmRangeAreaRef.current = null;
      }
      if (dlmmRangeTopRef.current) {
        chart.removeSeries(dlmmRangeTopRef.current);
        dlmmRangeTopRef.current = null;
      }
      if (dlmmRangeBottomRef.current) {
        chart.removeSeries(dlmmRangeBottomRef.current);
        dlmmRangeBottomRef.current = null;
      }

      // Create shaded area series (blue transparent fill)
      const dlmmRangeArea = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.15)',      // Blue with 15% opacity (top)
        bottomColor: 'rgba(59, 130, 246, 0.05)',   // Blue with 5% opacity (bottom - gradient)
        lineColor: 'transparent',                   // No border line
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });

      dlmmRangeAreaRef.current = dlmmRangeArea;

      // Create horizontal lines for top and bottom of range (cyan/blue dotted)
      const dlmmRangeTop = chart.addLineSeries({
        color: '#0cbef3',  // Cyan color matching charting.ag
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      const dlmmRangeBottom = chart.addLineSeries({
        color: '#0cbef3',  // Cyan color matching charting.ag
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      dlmmRangeTopRef.current = dlmmRangeTop;
      dlmmRangeBottomRef.current = dlmmRangeBottom;

      // Set data for shaded area (fill between max and min)
      const areaData = data.map(d => ({
        time: d.time as any,
        value: dlmmRange.max,  // Area series uses single value, we'll use CSS to fill down
      }));

      dlmmRangeArea.setData(areaData);

      // Set data for top and bottom horizontal lines
      const topLineData = [
        { time: data[0].time as any, value: dlmmRange.max },
        { time: data[data.length - 1].time as any, value: dlmmRange.max },
      ];

      const bottomLineData = [
        { time: data[0].time as any, value: dlmmRange.min },
        { time: data[data.length - 1].time as any, value: dlmmRange.min },
      ];

      dlmmRangeTop.setData(topLineData);
      dlmmRangeBottom.setData(bottomLineData);
    }

    // Add active bin price marker (purple horizontal line)
    if (activeBinPrice && activeBinPrice > 0 && data.length > 0) {
      if (activeBinLineRef.current) {
        chart.removeSeries(activeBinLineRef.current);
        activeBinLineRef.current = null;
      }

      const activeBinLine = chart.addLineSeries({
        color: CHART_COLORS.activeBin,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
        title: 'Active Bin',
      });

      activeBinLineRef.current = activeBinLine;

      const activeBinData = [
        { time: data[0].time as any, value: activeBinPrice },
        { time: data[data.length - 1].time as any, value: activeBinPrice },
      ];

      activeBinLine.setData(activeBinData);
    }

    // Add user position range markers (green shaded areas)
    if (positionRanges && positionRanges.length > 0 && data.length > 0) {
      // Clear existing position lines
      positionRangeLinesRef.current.forEach(line => {
        try {
          chart.removeSeries(line);
        } catch (e) {
          // Already removed
        }
      });
      positionRangeLinesRef.current = [];

      // Add a line for each position range (min and max)
      positionRanges.forEach((range, index) => {
        const minLine = chart.addLineSeries({
          color: range.color || CHART_COLORS.positionBorder,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          title: range.label || `Position ${index + 1} Min`,
        });

        const maxLine = chart.addLineSeries({
          color: range.color || CHART_COLORS.positionBorder,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          title: range.label || `Position ${index + 1} Max`,
        });

        const minData = [
          { time: data[0].time as any, value: range.minPrice },
          { time: data[data.length - 1].time as any, value: range.minPrice },
        ];

        const maxData = [
          { time: data[0].time as any, value: range.maxPrice },
          { time: data[data.length - 1].time as any, value: range.maxPrice },
        ];

        minLine.setData(minData);
        maxLine.setData(maxData);

        positionRangeLinesRef.current.push(minLine, maxLine);
      });
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [data, priceRange, dlmmRange, binData, showBinDistribution, activeBinPrice, positionRanges, mode, circulatingSupply]);

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
            onClick={() => {
              console.log('🔘 Price button clicked');
              setMode('price');
            }}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'price'
                ? 'text-white border-b-2 border-[#3b82f6]'
                : 'text-[#8f98ad] hover:text-white'
            }`}
          >
            Price
          </button>
          <button
            onClick={() => {
              console.log('🔘 MCap button clicked - Current mode:', mode, 'Will set to: mcap');
              setMode('mcap');
              console.log('🔘 After setMode - mode:', mode);
            }}
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
          {tokenSymbol} / USDT - {mode === 'mcap' ? 'Market Cap' : 'Exchange'}
        </div>
        <div className="text-lg font-semibold text-white">
          {mode === 'mcap' && marketCap ? (
            `$${(marketCap / 1_000_000).toFixed(2)}M`
          ) : (
            `$${currentPrice.toFixed(4)}`
          )}
        </div>
      </div>


      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="relative rounded-lg overflow-hidden border border-[#2a2e3e]"
        style={{ height: `${height}px` }}
      >
        {/* DLMM Range Labels (charting.ag style - positioned on left, next to lines) */}
        {showBinDistribution && dlmmRange.max > 0 && priceRange.max > 0 && (
          <>
            {(() => {
              // Calculate vertical position based on price range
              const totalPriceRange = priceRange.max - priceRange.min;
              const maxPositionPercent = ((priceRange.max - dlmmRange.max) / totalPriceRange) * 80 + 10; // 10-90% of chart height
              const minPositionPercent = ((priceRange.max - dlmmRange.min) / totalPriceRange) * 80 + 10;

              return (
                <>
                  <div
                    className="absolute left-4 z-10 pointer-events-none text-xs text-[#0cbef3] bg-[#1a1e2e]/80 px-1 rounded"
                    style={{ top: `${maxPositionPercent}%` }}
                  >
                    max: ${dlmmRange.max.toFixed(6)}
                  </div>
                  <div
                    className="absolute left-4 z-10 pointer-events-none text-xs text-[#0cbef3] bg-[#1a1e2e]/80 px-1 rounded"
                    style={{ top: `${minPositionPercent}%` }}
                  >
                    min: ${dlmmRange.min.toFixed(6)}
                  </div>
                </>
              );
            })()}
          </>
        )}

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
