'use client';

import { motion } from 'framer-motion';

export type StrategyType = 'spot' | 'curve' | 'bidAsk';

interface StrategySelectorProps {
  selected: StrategyType;
  onChange: (strategy: StrategyType) => void;
  disabled?: boolean;
}

const strategies = [
  {
    type: 'spot' as StrategyType,
    label: 'Spot',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" strokeWidth="2" rx="2" />
      </svg>
    ),
    description: 'Concentrated liquidity in a narrow price range',
  },
  {
    type: 'curve' as StrategyType,
    label: 'Curve',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 20 Q8 4, 12 12 T21 4" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    description: 'Curved distribution following a custom shape',
  },
  {
    type: 'bidAsk' as StrategyType,
    label: 'Bid-Ask',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 12h8M13 12h8M7 8l-4 4 4 4M17 8l4 4-4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: 'Split liquidity on both sides of current price',
  },
];

export function StrategySelector({ selected, onChange, disabled }: StrategySelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Strategy
      </label>
      <div className="grid grid-cols-3 gap-3">
        {strategies.map((strategy) => {
          const isSelected = selected === strategy.type;

          return (
            <motion.button
              key={strategy.type}
              onClick={() => !disabled && onChange(strategy.type)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Icon */}
              <div className={`mb-2 ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                {strategy.icon}
              </div>

              {/* Label */}
              <span className="text-sm font-semibold">
                {strategy.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  layoutId="strategy-selected"
                  className="absolute inset-0 rounded-lg border-2 border-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 mt-2">
        {strategies.find(s => s.type === selected)?.description}
      </p>
    </div>
  );
}
