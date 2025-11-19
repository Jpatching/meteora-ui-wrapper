'use client';

import { useMemo } from 'react';
import { useBinData } from '@/lib/hooks/useBinData';
import { InteractiveRangeSlider } from './InteractiveRangeSlider';

interface PriceRangePickerProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (price: number) => void;
  onMaxPriceChange: (price: number) => void;
  binLiquidity?: { binId: number; price: number; liquidity: number; xAmount?: number; yAmount?: number }[];
  tokenXSymbol?: string;
  tokenYSymbol?: string;
  disabled?: boolean;
  poolAddress?: string;
  binStep?: number;
  depositType?: 'token-x' | 'token-y' | 'dual' | 'none';
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
  binStep = 20,
  depositType = 'none',
}: PriceRangePickerProps) {
  // Fetch real bin liquidity data if pool address provided using the unified hook
  const { binsAroundActive, isLoading } = useBinData({
    poolAddress: poolAddress || '',
    enabled: !!poolAddress,
    refreshInterval: 5000,
    binRange: 50,
  });

  // Use fetched bins if available, otherwise use prop or empty array
  const activeBins = binsAroundActive.length > 0 ? binsAroundActive : binLiquidity;

  // Transform bin data to match InteractiveRangeSlider interface
  const binData = useMemo(() => {
    return activeBins.map((bin: any) => ({
      binId: bin.binId || 0,
      price: bin.price,
      liquidity: bin.totalLiquidity || bin.liquidity || 0,
      xAmount: bin.liquidityX || bin.xAmount || 0,
      yAmount: bin.liquidityY || bin.yAmount || 0,
    }));
  }, [activeBins]);

  // Reset to default range
  const handleResetPrice = () => {
    const binStepDecimal = binStep / 10000;
    const defaultMin = currentPrice * Math.pow(1 + binStepDecimal, -50);
    const defaultMax = currentPrice * Math.pow(1 + binStepDecimal, 50);
    onMinPriceChange(defaultMin);
    onMaxPriceChange(defaultMax);
  };

  return (
    <div className="space-y-3">
      {/* Reset Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleResetPrice}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-background-tertiary rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Range
        </button>
      </div>

      {/* Interactive Range Slider with Bin Visualization */}
      <InteractiveRangeSlider
        currentPrice={currentPrice}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={onMinPriceChange}
        onMaxPriceChange={onMaxPriceChange}
        binData={binData}
        binStep={binStep}
        tokenXSymbol={tokenXSymbol}
        tokenYSymbol={tokenYSymbol}
        disabled={disabled}
        depositType={depositType}
      />
    </div>
  );
}
