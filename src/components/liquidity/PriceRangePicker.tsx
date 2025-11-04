'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useBinLiquidity } from '@/lib/hooks/useBinLiquidity';

interface PriceRangePickerProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (price: number) => void;
  onMaxPriceChange: (price: number) => void;
  binLiquidity?: { binId: number; price: number; liquidity: number }[];
  tokenXSymbol?: string;
  tokenYSymbol?: string;
  disabled?: boolean;
  poolAddress?: string; // Add pool address for fetching real bin data
}

export function PriceRangePicker({
  currentPrice,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  binLiquidity = [],
  tokenXSymbol = 'Token X',
  tokenYSymbol = 'Token Y',
  disabled,
  poolAddress,
}: PriceRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);

  // Fetch real bin liquidity data if pool address provided
  const { data: fetchedBins = [] } = useBinLiquidity(poolAddress || null);

  // Use fetched bins if available, otherwise use prop or empty array
  const activeBins = fetchedBins.length > 0 ? fetchedBins : binLiquidity;

  // Calculate display range (wider than selected range for better UX)
  // Display range is 3x the selected range to allow adjustment
  const selectedRange = maxPrice - minPrice;
  const displayMin = Math.max(0, minPrice - selectedRange);
  const displayMax = maxPrice + selectedRange;
  const displayRange = displayMax - displayMin;

  // Calculate percentages for visualization
  const currentPricePercent = ((currentPrice - displayMin) / displayRange) * 100;
  const minPricePercent = ((minPrice - displayMin) / displayRange) * 100;
  const maxPricePercent = ((maxPrice - displayMin) / displayRange) * 100;

  // Calculate number of bins in selected range
  const numBins = activeBins.filter(b => b.price >= minPrice && b.price <= maxPrice).length ||
    Math.ceil((maxPrice - minPrice) / (currentPrice * 0.01)); // Estimate ~1% bins

  // Normalize bin liquidity for histogram (only bins in display range)
  const binsInRange = activeBins.filter(b => b.price >= displayMin && b.price <= displayMax);
  const maxLiquidity = Math.max(...binsInRange.map(b => b.liquidity), 1);
  const normalizedBins = binsInRange.map(bin => ({
    ...bin,
    heightPercent: (bin.liquidity / maxLiquidity) * 100,
    positionPercent: ((bin.price - displayMin) / displayRange) * 100,
  }));

  // Handle mouse drag for price adjustment
  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || disabled) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newPrice = displayMin + (percent / 100) * displayRange;

    if (isDraggingMin) {
      // Don't allow min to go above max or current price
      const clampedPrice = Math.max(displayMin, Math.min(newPrice, Math.min(maxPrice - (maxPrice * 0.01), currentPrice)));
      onMinPriceChange(clampedPrice);
    } else if (isDraggingMax) {
      // Don't allow max to go below min or current price
      const clampedPrice = Math.min(displayMax, Math.max(newPrice, Math.max(minPrice + (minPrice * 0.01), currentPrice)));
      onMaxPriceChange(clampedPrice);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingMin(false);
    setIsDraggingMax(false);
  };

  useEffect(() => {
    if (isDraggingMin || isDraggingMax) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingMin, isDraggingMax, minPrice, maxPrice, currentPrice, displayMin, displayMax, displayRange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Price Range
        </label>
        <span className="text-xs text-gray-400">
          {numBins} bins
        </span>
      </div>

      {/* Histogram Container */}
      <div
        ref={containerRef}
        className="relative h-32 rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden"
      >
        {/* Selected Range Highlight */}
        <div
          className="absolute top-0 bottom-0 bg-primary/5 border-l-2 border-r-2 border-primary/30"
          style={{
            left: `${minPricePercent}%`,
            width: `${maxPricePercent - minPricePercent}%`,
          }}
        />

        {/* Bin Histogram */}
        <div className="absolute inset-0">
          {normalizedBins.length > 0 ? (
            normalizedBins.map((bin, i) => (
              <div
                key={i}
                className="absolute bottom-0 rounded-t transition-all"
                style={{
                  left: `${bin.positionPercent}%`,
                  width: `${Math.max(0.5, 100 / Math.max(binsInRange.length, 50))}%`,
                  height: `${bin.heightPercent}%`,
                  background: bin.price < currentPrice
                    ? 'rgba(139, 92, 246, 0.6)' // Purple for left side
                    : 'rgba(59, 130, 246, 0.6)', // Blue for right side
                }}
              />
            ))
          ) : (
            // Placeholder bars if no liquidity data
            Array.from({ length: 40 }).map((_, i) => {
              const position = (i / 40) * 100;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 rounded-t bg-gray-700/30"
                  style={{
                    left: `${position}%`,
                    width: '2%',
                    height: `${Math.random() * 60 + 20}%`,
                  }}
                />
              );
            })
          )}
        </div>

        {/* Current Price Line */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-success"
          style={{ left: `${currentPricePercent}%` }}
          initial={false}
          animate={{ left: `${currentPricePercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-success text-white text-[10px] font-semibold rounded whitespace-nowrap">
            ${currentPrice.toFixed(6)}
          </div>
        </motion.div>

        {/* Min Price Handle */}
        <motion.div
          className={`absolute top-0 bottom-0 w-1 cursor-ew-resize ${isDraggingMin ? 'bg-primary' : 'bg-gray-400 hover:bg-primary'}`}
          style={{ left: `${minPricePercent}%` }}
          onMouseDown={() => !disabled && setIsDraggingMin(true)}
          whileHover={{ scaleX: 1.5 }}
        >
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-700 text-white text-[10px] font-medium rounded whitespace-nowrap">
            ${minPrice.toFixed(6)}
          </div>
        </motion.div>

        {/* Max Price Handle */}
        <motion.div
          className={`absolute top-0 bottom-0 w-1 cursor-ew-resize ${isDraggingMax ? 'bg-primary' : 'bg-gray-400 hover:bg-primary'}`}
          style={{ left: `${maxPricePercent}%` }}
          onMouseDown={() => !disabled && setIsDraggingMax(true)}
          whileHover={{ scaleX: 1.5 }}
        >
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-700 text-white text-[10px] font-medium rounded whitespace-nowrap">
            ${maxPrice.toFixed(6)}
          </div>
        </motion.div>
      </div>

      {/* Price Inputs */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-gray-400 mb-1">Min Price</label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => !disabled && onMinPriceChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            step="0.000001"
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <span className="block text-gray-500 mt-0.5 text-[10px]">
            ${minPrice.toFixed(6)}
          </span>
        </div>

        <div>
          <label className="block text-gray-400 mb-1">Current</label>
          <div className="px-2 py-1.5 rounded bg-gray-800/50 border border-success/30 text-success text-xs font-semibold text-center">
            {currentPrice.toFixed(6)}
          </div>
          <span className="block text-gray-500 mt-0.5 text-[10px] text-center">
            {tokenXSymbol}/{tokenYSymbol}
          </span>
        </div>

        <div>
          <label className="block text-gray-400 mb-1">Max Price</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => !disabled && onMaxPriceChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            step="0.000001"
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <span className="block text-gray-500 mt-0.5 text-[10px]">
            ${maxPrice.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}
