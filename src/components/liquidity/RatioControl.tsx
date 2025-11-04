'use client';

import { motion } from 'framer-motion';

export type RatioType = 'one-side' | '50-50';

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
  const oneSideActive = selected === 'one-side';
  const fiftyFiftyActive = selected === '50-50';

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Ratio
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* One-Side Button */}
        <motion.button
          onClick={() => !disabled && onChange('one-side')}
          disabled={disabled}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          className={`
            relative px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold
            ${oneSideActive
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          One-Side
          {oneSideActive && (
            <motion.div
              layoutId="ratio-selected"
              className="absolute inset-0 rounded-lg border-2 border-primary"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>

        {/* 50:50 Button */}
        <motion.button
          onClick={() => !disabled && onChange('50-50')}
          disabled={disabled}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          className={`
            relative px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold
            ${fiftyFiftyActive
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          50:50
          {fiftyFiftyActive && (
            <motion.div
              layoutId="ratio-selected"
              className="absolute inset-0 rounded-lg border-2 border-primary"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      </div>

      {/* Token Distribution Display */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">
            {tokenXSymbol}
          </span>
          <span className="text-sm font-semibold text-white">
            {tokenXPercentage.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">
            {tokenYSymbol}
          </span>
          <span className="text-sm font-semibold text-white">
            {tokenYPercentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Visual Percentage Bar */}
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: '100%' }}
          animate={{ width: `${tokenXPercentage}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>
    </div>
  );
}
