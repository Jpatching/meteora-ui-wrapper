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
      <svg className="w-12 h-8" viewBox="0 0 48 32" fill="none">
        {/* Spot: ALL bars same height - uniform concentrated liquidity */}
        <rect x="18" y="8" width="2" height="16" className="fill-current" />
        <rect x="21" y="8" width="2" height="16" className="fill-current" />
        <rect x="24" y="8" width="2" height="16" className="fill-current" />
        <rect x="27" y="8" width="2" height="16" className="fill-current" />
        <rect x="30" y="8" width="2" height="16" className="fill-current" />
      </svg>
    ),
    description: 'Concentrated liquidity in a narrow price range',
  },
  {
    type: 'curve' as StrategyType,
    label: 'Curve',
    icon: (
      <svg className="w-12 h-8" viewBox="0 0 48 32" fill="none">
        {/* Curve: Bell curve shape */}
        <rect x="4" y="24" width="2" height="4" className="fill-current" opacity="0.2" />
        <rect x="8" y="20" width="2" height="8" className="fill-current" opacity="0.3" />
        <rect x="12" y="16" width="2" height="12" className="fill-current" opacity="0.4" />
        <rect x="16" y="10" width="2" height="18" className="fill-current" opacity="0.5" />
        <rect x="20" y="4" width="2" height="24" className="fill-current" opacity="0.7" />
        <rect x="24" y="0" width="2" height="32" className="fill-current" />
        <rect x="28" y="4" width="2" height="24" className="fill-current" opacity="0.7" />
        <rect x="32" y="10" width="2" height="18" className="fill-current" opacity="0.5" />
        <rect x="36" y="16" width="2" height="12" className="fill-current" opacity="0.4" />
        <rect x="40" y="20" width="2" height="8" className="fill-current" opacity="0.3" />
        <rect x="44" y="24" width="2" height="4" className="fill-current" opacity="0.2" />
      </svg>
    ),
    description: 'Curved distribution following a custom shape',
  },
  {
    type: 'bidAsk' as StrategyType,
    label: 'Bid-Ask',
    icon: (
      <svg className="w-12 h-8" viewBox="0 0 48 32" fill="none">
        {/* Bid-Ask: Two groups of bars on each side */}
        <rect x="4" y="8" width="2" height="16" className="fill-current" />
        <rect x="8" y="10" width="2" height="12" className="fill-current" opacity="0.7" />
        <rect x="12" y="14" width="2" height="8" className="fill-current" opacity="0.4" />
        <rect x="16" y="18" width="2" height="4" className="fill-current" opacity="0.2" />

        <rect x="30" y="18" width="2" height="4" className="fill-current" opacity="0.2" />
        <rect x="34" y="14" width="2" height="8" className="fill-current" opacity="0.4" />
        <rect x="38" y="10" width="2" height="12" className="fill-current" opacity="0.7" />
        <rect x="42" y="8" width="2" height="16" className="fill-current" />
      </svg>
    ),
    description: 'Split liquidity on both sides of current price',
  },
];

export function StrategySelector({ selected, onChange, disabled }: StrategySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {strategies.map((strategy) => {
        const isSelected = selected === strategy.type;

        return (
          <button
            key={strategy.type}
            onClick={() => !disabled && onChange(strategy.type)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all
              ${isSelected
                ? 'border-primary bg-primary/10 text-white'
                : 'border-border-light bg-background-secondary/30 text-gray-400 hover:border-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Bar Icon */}
            <div className={`mb-1.5 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
              {strategy.icon}
            </div>

            {/* Label */}
            <span className="text-xs font-medium">
              {strategy.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
