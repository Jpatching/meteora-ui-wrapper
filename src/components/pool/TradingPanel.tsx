/**
 * Trading Panel - Jupiter swap integration
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { useState } from 'react';

interface TradingPanelProps {
  pool: Pool;
}

export function TradingPanel({ pool }: TradingPanelProps) {
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1.0');

  return (
    <div className="bg-background border border-border-light rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Swap</h3>

      {/* Swap Form */}
      <div className="space-y-4">
        {/* From Token */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">You Pay</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:border-primary focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
              <span className="text-sm font-semibold text-white">SOL</span>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">You Receive</label>
          <div className="relative">
            <input
              type="text"
              value={amount ? (parseFloat(amount) * 100).toFixed(2) : ''}
              readOnly
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:border-primary focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {pool.baseAsset.icon ? (
                <img src={pool.baseAsset.icon} alt={pool.baseAsset.symbol} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary"></div>
              )}
              <span className="text-sm font-semibold text-white">{pool.baseAsset.symbol}</span>
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="flex items-center justify-between py-2 border-t border-border-light">
          <span className="text-xs text-gray-400">Slippage</span>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs text-right focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>

        {/* Swap Button */}
        <a
          href={`https://jup.ag/swap/SOL-${pool.baseAsset.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
        >
          Swap via Jupiter
        </a>

        {/* Quick Trade Options */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <a
            href={`https://jup.ag/swap/SOL-${pool.baseAsset.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-center text-xs text-gray-300 transition-colors"
          >
            Trade {pool.baseAsset.symbol}
          </a>
          <a
            href={`https://jup.ag/swap/${pool.baseAsset.id}-USDC`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-center text-xs text-gray-300 transition-colors"
          >
            Trade USDC
          </a>
        </div>
      </div>
    </div>
  );
}
