'use client';

import { motion } from 'framer-motion';

export type RatioType = 'one-side-x' | '50-50' | 'one-side-y';

interface RatioControlProps {
  selected: RatioType;
  onChange: (ratio: RatioType) => void;
  tokenXSymbol?: string;
  tokenYSymbol?: string;
  tokenXPercentage?: number;
  tokenYPercentage?: number;
  disabled?: boolean;
}

export function RatioControl({
  selected,
  onChange,
  tokenXSymbol = 'Token X',
  tokenYSymbol = 'Token Y',
  tokenXPercentage = 100,
  tokenYPercentage = 0,
  disabled,
}: RatioControlProps) {
  return (
    <div className="space-y-3">
      {/* Three ratio buttons - charting.ag style */}
      <div className="grid grid-cols-3 gap-2">
        {/* One-Side Token X */}
        <button
          onClick={() => !disabled && onChange('one-side-x')}
          disabled={disabled}
          className={`
            px-3 py-2.5 rounded-lg border transition-all text-xs font-medium
            ${selected === 'one-side-x'
              ? 'border-primary bg-primary/10 text-white'
              : 'border-border-light bg-background-secondary/30 text-gray-400 hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="text-center">
            <div>One-Side</div>
            <div className="text-[10px] mt-0.5">{tokenXSymbol}</div>
          </div>
        </button>

        {/* 50:50 */}
        <button
          onClick={() => !disabled && onChange('50-50')}
          disabled={disabled}
          className={`
            px-3 py-2.5 rounded-lg border transition-all text-xs font-medium
            ${selected === '50-50'
              ? 'border-primary bg-primary/10 text-white'
              : 'border-border-light bg-background-secondary/30 text-gray-400 hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          50:50
        </button>

        {/* One-Side Token Y */}
        <button
          onClick={() => !disabled && onChange('one-side-y')}
          disabled={disabled}
          className={`
            px-3 py-2.5 rounded-lg border transition-all text-xs font-medium
            ${selected === 'one-side-y'
              ? 'border-primary bg-primary/10 text-white'
              : 'border-border-light bg-background-secondary/30 text-gray-400 hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="text-center">
            <div>One-Side</div>
            <div className="text-[10px] mt-0.5">{tokenYSymbol}</div>
          </div>
        </button>
      </div>

      {/* Percentage labels + Slider - charting.ag style */}
      <div className="space-y-1">
        {/* Percentage labels above slider */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{tokenXSymbol} {tokenXPercentage}%</span>
          <span className="text-gray-400">{tokenYSymbol} {tokenYPercentage}%</span>
        </div>

        {/* Slider bar with handle */}
        <div className="relative h-1 rounded-full bg-gray-700">
          {/* Blue fill (tokenX percentage) */}
          <motion.div
            className="absolute h-full bg-primary rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: `${tokenXPercentage}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />

          {/* Slider handle (dot at the split point) */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-primary shadow-lg"
            initial={{ left: '100%' }}
            animate={{ left: `${tokenXPercentage}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ marginLeft: '-6px' }} // Center the dot on the position
          />
        </div>
      </div>
    </div>
  );
}
