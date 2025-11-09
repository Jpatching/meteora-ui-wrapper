'use client';

import { useMemo, useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { motion } from 'framer-motion';

interface BinData {
  binId: number;
  price: number;
  liquidity: number;
  xAmount?: number;
  yAmount?: number;
}

interface InteractiveRangeSliderProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (price: number) => void;
  onMaxPriceChange: (price: number) => void;
  binData?: BinData[];
  binStep: number;
  tokenXSymbol: string;
  tokenYSymbol: string;
  disabled?: boolean;
  depositAmount?: number; // For showing liquidity distribution preview
}

export function InteractiveRangeSlider({
  currentPrice,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  binData = [],
  binStep,
  tokenXSymbol,
  tokenYSymbol,
  disabled = false,
  depositAmount = 0,
}: InteractiveRangeSliderProps) {
  const [minPriceInput, setMinPriceInput] = useState(minPrice.toFixed(6));
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice.toFixed(6));
  const [minPercentage, setMinPercentage] = useState(-10);
  const [maxPercentage, setMaxPercentage] = useState(10);
  const [hoveredBinPrice, setHoveredBinPrice] = useState<number | null>(null);

  // Update input fields when props change
  useEffect(() => {
    setMinPriceInput(minPrice.toFixed(6));
    setMaxPriceInput(maxPrice.toFixed(6));
  }, [minPrice, maxPrice]);
  // Calculate display range (wider than selected range for context)
  const displayRange = useMemo(() => {
    const range = maxPrice - minPrice;
    const displayMin = Math.max(0, minPrice - range * 0.5);
    const displayMax = maxPrice + range * 0.5;
    return { min: displayMin, max: displayMax, range: displayMax - displayMin };
  }, [minPrice, maxPrice]);

  // Calculate percentages for visualization
  const currentPricePercent = ((currentPrice - displayRange.min) / displayRange.range) * 100;
  const minPricePercent = ((minPrice - displayRange.min) / displayRange.range) * 100;
  const maxPricePercent = ((maxPrice - displayRange.min) / displayRange.range) * 100;

  // Normalize bin data with reactive selection highlighting
  const normalizedBins = useMemo(() => {
    console.log('🔄 Recalculating bins with range:', { minPrice, maxPrice, currentPrice });

    const binsInRange = binData.filter(
      b => b.price >= displayRange.min && b.price <= displayRange.max
    );
    const maxLiquidity = Math.max(...binsInRange.map(b => b.liquidity), 1);

    return binsInRange.map(bin => {
      const isInRange = bin.price >= minPrice && bin.price <= maxPrice;
      const distanceFromCurrent = Math.abs(bin.price - currentPrice);
      const rangeSize = maxPrice - minPrice;

      // Calculate intensity based on distance from current price (bell curve effect)
      const normalizedDistance = distanceFromCurrent / (rangeSize / 2);
      const intensity = isInRange ? Math.max(0.4, 1 - Math.pow(normalizedDistance, 1.2)) : 0.25;

      return {
        ...bin,
        heightPercent: (bin.liquidity / maxLiquidity) * 100,
        positionPercent: ((bin.price - displayRange.min) / displayRange.range) * 100,
        isInRange,
        isActive: distanceFromCurrent < currentPrice * 0.02,
        intensity, // For gradient brightness
      };
    });
  }, [binData, displayRange, minPrice, maxPrice, currentPrice]);

  // Calculate number of bins in selected range
  const numBins = useMemo(() => {
    if (minPrice <= 0 || maxPrice <= 0 || maxPrice <= minPrice) return 0;
    const binStepDecimal = binStep / 10000;
    const calculated = Math.ceil(Math.log(maxPrice / minPrice) / Math.log(1 + binStepDecimal));
    return isFinite(calculated) && !isNaN(calculated) ? calculated : 0;
  }, [minPrice, maxPrice, binStep]);

  // Convert price range to slider value range (0-1000 for precision)
  const sliderMin = 0;
  const sliderMax = 1000;
  const priceToSlider = (price: number) => {
    if (displayRange.range === 0) return sliderMin;
    return ((price - displayRange.min) / displayRange.range) * (sliderMax - sliderMin) + sliderMin;
  };
  const sliderToPrice = (value: number) => {
    return ((value - sliderMin) / (sliderMax - sliderMin)) * displayRange.range + displayRange.min;
  };

  const sliderValue = [priceToSlider(minPrice), priceToSlider(maxPrice)];

  const handleSliderChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      const [newMinSlider, newMaxSlider] = value;
      const newMin = sliderToPrice(newMinSlider);
      const newMax = sliderToPrice(newMaxSlider);

      onMinPriceChange(Math.max(0, newMin));
      onMaxPriceChange(Math.max(newMin * 1.001, newMax)); // Ensure max > min
    }
  };

  // Handle bin click for interactive range setting - Meteora style (always smart)
  const handleBinClick = (binPrice: number) => {
    if (disabled) return;

    // Smart detection: adjust the boundary closer to clicked bin
    const distToMin = Math.abs(binPrice - minPrice);
    const distToMax = Math.abs(binPrice - maxPrice);

    if (distToMin < distToMax) {
      // Closer to min boundary, adjust min
      const newMin = Math.min(binPrice, maxPrice * 0.99); // Ensure min < max
      onMinPriceChange(newMin);
    } else {
      // Closer to max boundary, adjust max
      const newMax = Math.max(binPrice, minPrice * 1.01); // Ensure max > min
      onMaxPriceChange(newMax);
    }
  };

  // Reset to default price range
  const handleResetPrice = () => {
    if (disabled) return;
    const defaultMin = currentPrice * 0.9;
    const defaultMax = currentPrice * 1.1;
    onMinPriceChange(defaultMin);
    onMaxPriceChange(defaultMax);
  };

  return (
    <div className="space-y-4">
      {/* Liquidity Distribution Chart - Meteora Style */}
      <div className="relative h-64 bg-background-secondary/50 rounded-lg border border-border overflow-hidden">
        {/* Status indicator - top right corner */}
        {normalizedBins.length > 0 && (
          <div className="absolute top-2 right-2 text-[10px] text-gray-400">
            {normalizedBins.length} bins
          </div>
        )}

        {/* Bins Container */}
        <div className="absolute inset-0 flex items-end justify-center gap-[2px] px-4 pb-4">
          {normalizedBins.length > 0 ? (
            normalizedBins.map((bin, i) => (
              <div
                key={`bin-${bin.binId || i}`}
                className={`relative group ${disabled ? '' : 'cursor-pointer'}`}
                style={{ flex: '1 1 0', maxWidth: '8px', minWidth: '2px', height: '100%' }}
                onClick={() => !disabled && handleBinClick(bin.price)}
                onMouseEnter={() => setHoveredBinPrice(bin.price)}
                onMouseLeave={() => setHoveredBinPrice(null)}
              >
                <div
                  className="absolute bottom-0 w-full rounded-sm transition-all duration-200"
                  style={{
                    height: `${bin.heightPercent}%`,
                    backgroundColor: bin.isInRange
                      ? bin.isActive ? '#10b981' : '#8b5cf6'
                      : '#4b5563',
                    opacity: bin.isInRange ? 0.9 : 0.3,
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-lg">
                  <div className="font-mono">${bin.price.toFixed(6)}</div>
                </div>
              </div>
            ))
          ) : (
            // Placeholder
            Array.from({ length: 50 }).map((_, i) => {
              const height = Math.random() * 60 + 20;
              return (
                <div
                  key={i}
                  className="relative"
                  style={{ flex: '1 1 0', maxWidth: '8px', minWidth: '2px', height: '100%' }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-sm bg-gray-600 opacity-20"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Current Price Line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-10"
          style={{ left: `${currentPricePercent}%` }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-sm">
            ${currentPrice.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Slider - Meteora style (between chart and inputs) */}
      <div className="px-1">
        <Slider
          range
          min={sliderMin}
          max={sliderMax}
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={disabled}
          styles={{
            track: {
              backgroundColor: 'rgba(75, 85, 99, 0.3)',
              height: 4,
            },
            tracks: {
              backgroundColor: '#8b5cf6',
              height: 4,
            },
            handle: {
              width: 14,
              height: 14,
              backgroundColor: 'white',
              border: '2px solid #8b5cf6',
              opacity: 1,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              marginTop: -5,
            },
            rail: {
              backgroundColor: 'rgba(75, 85, 99, 0.3)',
              height: 4,
            },
          }}
        />
      </div>

      {/* Min and Max Price Inputs - Below slider */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Min Price</label>
          <input
            type="number"
            step="any"
            value={minPriceInput}
            onChange={(e) => {
              setMinPriceInput(e.target.value);
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                onMinPriceChange(parsed);
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-background-secondary border border-border text-white text-sm font-mono focus:border-primary focus:outline-none disabled:opacity-50"
            placeholder="0.000000"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Max Price</label>
          <input
            type="number"
            step="any"
            value={maxPriceInput}
            onChange={(e) => {
              setMaxPriceInput(e.target.value);
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                onMaxPriceChange(parsed);
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-background-secondary border border-border text-white text-sm font-mono focus:border-primary focus:outline-none disabled:opacity-50"
            placeholder="0.000000"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{numBins} bins</span>
        <button
          onClick={handleResetPrice}
          disabled={disabled}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
