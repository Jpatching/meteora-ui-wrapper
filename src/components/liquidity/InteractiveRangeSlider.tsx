'use client';

import { useMemo, useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { motion } from 'framer-motion';
import { StrategyType } from './StrategySelector';

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
  depositType?: 'token-x' | 'token-y' | 'dual' | 'none'; // Track which token(s) being deposited
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
  depositType = 'none',
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

  // Normalize bin data with reactive selection highlighting AND strategy-based shapes
  const normalizedBins = useMemo(() => {
    if (binData.length === 0) {
      return [];
    }

    // Only log occasionally to reduce console spam
    if (Math.random() < 0.1) {
      console.log('🔄 [InteractiveRangeSlider] Bins recalculated:', { minPrice, maxPrice, totalBins: binData.length });
    }

    const binsInRange = binData.filter(
      b => b.price >= displayRange.min && b.price <= displayRange.max
    );
    const maxLiquidity = Math.max(...binsInRange.map(b => b.liquidity), 1);

    return binsInRange.map((bin, index) => {
      const isInRange = bin.price >= minPrice && bin.price <= maxPrice;
      const distanceFromCurrent = Math.abs(bin.price - currentPrice);
      const rangeSize = maxPrice - minPrice;

      // Calculate position from center for strategy-based shaping
      const centerIndex = binsInRange.length / 2;
      const centerDistance = Math.abs(index - centerIndex) / centerIndex;

      // Apply strategy-based height transformation
      let baseHeightPercent = (bin.liquidity / maxLiquidity) * 100;
      let heightPercent: number;

      if (strategy === 'spot') {
        // Spot: Uniform height (flatten the distribution)
        heightPercent = 70; // All bins same height
      } else if (strategy === 'curve') {
        // Curve: Bell curve (enhance center, reduce edges)
        const curveMultiplier = 0.4 + (1 - centerDistance) * 0.6; // 0.4 to 1.0
        heightPercent = baseHeightPercent * curveMultiplier;
      } else if (strategy === 'bidAsk') {
        // Bid-Ask: V-shape (enhance edges, reduce center)
        const vShapeMultiplier = 0.4 + centerDistance * 0.6; // 0.4 to 1.0
        heightPercent = baseHeightPercent * vShapeMultiplier;
      } else {
        // Default to original
        heightPercent = baseHeightPercent;
      }

      // Calculate intensity based on distance from current price
      const normalizedDistance = distanceFromCurrent / (rangeSize / 2);
      const intensity = isInRange ? Math.max(0.4, 1 - Math.pow(normalizedDistance, 1.2)) : 0.25;

      return {
        ...bin,
        heightPercent: Math.max(heightPercent, 40), // Minimum 40% for visibility
        positionPercent: ((bin.price - displayRange.min) / displayRange.range) * 100,
        isInRange,
        isActive: distanceFromCurrent < currentPrice * 0.02,
        intensity, // For gradient brightness
      };
    });
  }, [binData, displayRange, minPrice, maxPrice, currentPrice, strategy]);

  // Calculate number of bins in selected range
  const numBins = useMemo(() => {
    if (minPrice <= 0 || maxPrice <= 0 || maxPrice <= minPrice) return 0;
    const binStepDecimal = binStep / 10000;
    const calculated = Math.ceil(Math.log(maxPrice / minPrice) / Math.log(1 + binStepDecimal));
    return isFinite(calculated) && !isNaN(calculated) ? calculated : 0;
  }, [minPrice, maxPrice, binStep]);

  // Bin snapping utilities - convert price to nearest valid bin
  const priceToBinId = (price: number) => {
    if (currentPrice <= 0 || price <= 0) return 0;
    const binStepDecimal = binStep / 10000;
    return Math.round(Math.log(price / currentPrice) / Math.log(1 + binStepDecimal));
  };

  const binIdToPrice = (binId: number) => {
    const binStepDecimal = binStep / 10000;
    return currentPrice * Math.pow(1 + binStepDecimal, binId);
  };

  const snapPriceToNearestBin = (price: number) => {
    const binId = priceToBinId(price);
    return binIdToPrice(binId);
  };

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
      let newMin = sliderToPrice(newMinSlider);
      let newMax = sliderToPrice(newMaxSlider);

      // Enforce single-sided deposit constraints
      if (depositType === 'token-x') {
        // Token X: minPrice must be <= currentPrice (active bin must be included or to the left)
        // Allow a small tolerance for rounding
        const maxAllowedMin = currentPrice * 1.001;
        if (newMin > maxAllowedMin) {
          console.warn(`[RangeSlider] Token X deposit: constraining minPrice from ${newMin.toFixed(6)} to ${currentPrice.toFixed(6)}`);
          newMin = currentPrice;
        }
      } else if (depositType === 'token-y') {
        // Token Y: maxPrice must be >= currentPrice (active bin must be included or to the right)
        const minAllowedMax = currentPrice * 0.999;
        if (newMax < minAllowedMax) {
          console.warn(`[RangeSlider] Token Y deposit: constraining maxPrice from ${newMax.toFixed(6)} to ${currentPrice.toFixed(6)}`);
          newMax = currentPrice;
        }
      }

      onMinPriceChange(Math.max(0, newMin));
      onMaxPriceChange(Math.max(newMin * 1.001, newMax)); // Ensure max > min
    }
  };

  // Handle slider release - snap to nearest bins
  const handleSliderAfterChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      const [newMinSlider, newMaxSlider] = value;
      let newMin = sliderToPrice(newMinSlider);
      let newMax = sliderToPrice(newMaxSlider);

      // Snap to nearest bins
      const snappedMin = snapPriceToNearestBin(newMin);
      const snappedMax = snapPriceToNearestBin(newMax);

      // Enforce single-sided deposit constraints on snapped values
      let finalMin = snappedMin;
      let finalMax = snappedMax;

      if (depositType === 'token-x') {
        const maxAllowedMin = currentPrice * 1.001;
        if (finalMin > maxAllowedMin) {
          finalMin = snapPriceToNearestBin(currentPrice);
        }
      } else if (depositType === 'token-y') {
        const minAllowedMax = currentPrice * 0.999;
        if (finalMax < minAllowedMax) {
          finalMax = snapPriceToNearestBin(currentPrice);
        }
      }

      // Ensure max > min after snapping
      if (finalMax <= finalMin) {
        const binStepDecimal = binStep / 10000;
        finalMax = finalMin * (1 + binStepDecimal);
      }

      console.log(`[RangeSlider] Snapped prices: ${newMin.toFixed(6)} → ${finalMin.toFixed(6)}, ${newMax.toFixed(6)} → ${finalMax.toFixed(6)}`);

      onMinPriceChange(Math.max(0, finalMin));
      onMaxPriceChange(finalMax);
    }
  };

  // Handle bin click for interactive range setting - Meteora style (always smart)
  const handleBinClick = (binPrice: number) => {
    if (disabled) return;

    // Snap the clicked price to nearest bin first
    const snappedPrice = snapPriceToNearestBin(binPrice);

    // Smart detection: adjust the boundary closer to clicked bin
    const distToMin = Math.abs(snappedPrice - minPrice);
    const distToMax = Math.abs(snappedPrice - maxPrice);

    if (distToMin < distToMax) {
      // Closer to min boundary, adjust min
      const newMin = Math.min(snappedPrice, maxPrice * 0.99); // Ensure min < max
      onMinPriceChange(newMin);
    } else {
      // Closer to max boundary, adjust max
      const newMax = Math.max(snappedPrice, minPrice * 1.01); // Ensure max > min
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

  // Calculate percentage change from current price
  const minPriceChange = ((minPrice - currentPrice) / currentPrice) * 100;
  const maxPriceChange = ((maxPrice - currentPrice) / currentPrice) * 100;

  // Generate 5 evenly spaced price labels across display range
  const priceLabels = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const price = displayRange.min + (displayRange.range * i) / 4;
      return price;
    });
  }, [displayRange]);

  return (
    <div className="space-y-2">
      {/* Current Price Label - charting.ag style */}
      <div className="text-xs text-gray-400">
        Current Price: ${currentPrice.toFixed(6)}
      </div>

      {/* Liquidity Distribution Chart - charting.ag style (BLUE in range, GRAY outside) */}
      <div className="relative h-24 bg-background-secondary/30 rounded overflow-hidden">
        {/* Bins Container */}
        <div className="absolute inset-0 flex items-end justify-start gap-[1px] px-2 pb-1">
          {normalizedBins.length > 0 ? (
            normalizedBins.map((bin, i) => (
              <div
                key={`bin-${bin.binId || i}`}
                className={`relative group ${disabled ? '' : 'cursor-pointer'}`}
                style={{ flex: '1 1 0', maxWidth: '4px', minWidth: '1px', height: '100%' }}
                onClick={() => !disabled && handleBinClick(bin.price)}
                onMouseEnter={() => setHoveredBinPrice(bin.price)}
                onMouseLeave={() => setHoveredBinPrice(null)}
              >
                {/* Individual bin - BLUE if in range, GRAY if outside */}
                <div
                  className="absolute bottom-0 w-full transition-all duration-150"
                  style={{
                    height: `${Math.max(bin.heightPercent, 40)}%`, // Minimum 40% height for visibility
                    backgroundColor: bin.isInRange ? '#3b82f6' : '#6b7280', // Blue in range, gray outside
                    opacity: bin.isInRange ? 1 : 0.4, // Full opacity in range, faded outside
                  }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-lg">
                  <div className="font-mono">${bin.price.toFixed(6)}</div>
                  <div className="text-[9px] text-gray-400">{bin.isInRange ? 'In Range' : 'Out of Range'}</div>
                </div>
              </div>
            ))
          ) : (
            // Placeholder bins that respond to price range selection
            Array.from({ length: 50 }).map((_, i) => {
              const height = Math.random() * 60 + 20;
              // Calculate this bin's price position across the display range
              const binPosition = (i / 50) * 100; // 0-100%
              const binPrice = displayRange.min + (binPosition / 100) * displayRange.range;

              // Check if this placeholder bin is in the user's selected range
              const isInSelectedRange = binPrice >= minPrice && binPrice <= maxPrice;

              return (
                <div
                  key={i}
                  className="relative group"
                  style={{ flex: '1 1 0', maxWidth: '8px', minWidth: '2px', height: '100%' }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-sm transition-all duration-200"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isInSelectedRange ? '#8b5cf6' : '#4b5563',
                      opacity: isInSelectedRange ? 0.5 : 0.2
                    }}
                  />
                  {/* Tooltip for placeholder bins */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-lg">
                    <div className="font-mono">${binPrice.toFixed(6)}</div>
                    <div className="text-[9px] text-gray-400">Preview</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Draggable Range Slider - charting.ag style */}
      <div className="relative px-1">
        <Slider
          range
          min={sliderMin}
          max={sliderMax}
          value={sliderValue}
          onChange={handleSliderChange}
          onAfterChange={handleSliderAfterChange}
          disabled={disabled}
          styles={{
            track: {
              backgroundColor: 'rgba(75, 85, 99, 0.3)',
              height: 4,
            },
            tracks: {
              backgroundColor: '#3b82f6',
              height: 4,
            },
            handle: {
              width: 12,
              height: 12,
              backgroundColor: 'white',
              border: '2px solid #3b82f6',
              opacity: 1,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              marginTop: -4,
            },
            rail: {
              backgroundColor: 'rgba(75, 85, 99, 0.3)',
              height: 4,
            },
          }}
        />
      </div>

      {/* Price Labels - 5 points across the chart (charting.ag style) */}
      <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
        {priceLabels.map((price, i) => (
          <span key={i}>${price.toFixed(4)}</span>
        ))}
      </div>

      {/* Min Price / numBins / Max Price - charting.ag style */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Min Price with percentage */}
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
            onBlur={(e) => {
              // Snap to nearest bin when user finishes editing
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                const snapped = snapPriceToNearestBin(parsed);
                onMinPriceChange(snapped);
                setMinPriceInput(snapped.toFixed(6));
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
            onBlur={(e) => {
              // Snap to nearest bin when user finishes editing
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                const snapped = snapPriceToNearestBin(parsed);
                onMaxPriceChange(snapped);
                setMaxPriceInput(snapped.toFixed(6));
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-background-secondary border border-border text-white text-sm font-mono focus:border-primary focus:outline-none disabled:opacity-50"
            placeholder="0.000000"
          />
        </div>
      </div>

      {/* Min and Max Price Inputs - Below (hidden for charting.ag style, can show on click) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-white transition-colors">
          Advanced Price Controls
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
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
      </details>

      {/* Reset button */}
      <div className="flex items-center justify-end">
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
