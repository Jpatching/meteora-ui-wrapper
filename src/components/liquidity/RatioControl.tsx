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

      {/* Percentage labels - charting.ag style */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{tokenXSymbol} {tokenXPercentage}%</span>
        <span className="text-gray-400">{tokenYSymbol} {tokenYPercentage}%</span>
      </div>

      {/* Progress bar - charting.ag style (solid blue, no gradient) */}
      <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: '100%' }}
          animate={{ width: `${tokenXPercentage}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>
    </div>
  );
}
