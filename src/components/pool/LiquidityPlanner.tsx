/**
 * Liquidity Planner - Auto-AI LP Management
 * AI-powered liquidity position suggestions
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LiquidityPlannerProps {
  pool: Pool;
}

interface AISuggestion {
  strategy: 'spot' | 'curve' | 'bidAsk';
  minPrice: number;
  maxPrice: number;
  expectedAPR: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  reasoning: string;
}

export function LiquidityPlanner({ pool }: LiquidityPlannerProps) {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Generate AI suggestion
  useEffect(() => {
    // Simulate AI analysis
    setTimeout(() => {
      const currentPrice = pool.baseAsset.usdPrice || 1;
      const volatility = Math.abs(pool.baseAsset.stats24h?.priceChange || 5);

      // Determine strategy based on volatility
      let strategy: 'spot' | 'curve' | 'bidAsk';
      let riskLevel: 'low' | 'medium' | 'high';
      let minPrice, maxPrice;

      if (volatility < 5) {
        // Low volatility - concentrated liquidity
        strategy = 'spot';
        riskLevel = 'medium';
        minPrice = currentPrice * 0.95; // ±5%
        maxPrice = currentPrice * 1.05;
      } else if (volatility < 15) {
        // Medium volatility - balanced approach
        strategy = 'bidAsk';
        riskLevel = 'medium';
        minPrice = currentPrice * 0.85; // ±15%
        maxPrice = currentPrice * 1.15;
      } else {
        // High volatility - wide range
        strategy = 'curve';
        riskLevel = 'high';
        minPrice = currentPrice * 0.7; // ±30%
        maxPrice = currentPrice * 1.3;
      }

      // Calculate expected APR based on pool metrics
      const tvl = pool.baseAsset.liquidity || 1;
      const volume24h = pool.volume24h || 0;
      const feeRate = 0.003; // 0.3% average
      const expectedAPR = ((volume24h * feeRate * 365) / tvl) * 100;

      setSuggestion({
        strategy,
        minPrice,
        maxPrice,
        expectedAPR: Math.min(Math.max(expectedAPR, 5), 200), // Cap between 5-200%
        riskLevel,
        confidence: volatility < 10 ? 85 : volatility < 20 ? 70 : 60,
        reasoning: `Based on ${volatility.toFixed(1)}% 24h volatility, I recommend a ${strategy} strategy with ${riskLevel} risk. This range balances fee capture with IL protection.`
      });
      setIsAnalyzing(false);
    }, 1500);
  }, [pool]);

  const handleApplySuggestion = () => {
    // Navigate to add liquidity page with pre-filled parameters
    const params = new URLSearchParams({
      pool: pool.id,
      strategy: suggestion?.strategy || 'curve',
      minPrice: suggestion?.minPrice.toString() || '',
      maxPrice: suggestion?.maxPrice.toString() || '',
    });
    router.push(`/dlmm/seed-lfg?${params.toString()}`);
  };

  if (isAnalyzing) {
    return (
      <div className="bg-background border border-border-light rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Liquidity Planner</h3>
            <p className="text-xs text-gray-400">Analyzing optimal position...</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-success to-primary animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-gray-400 text-center">AI is analyzing market conditions...</p>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return null;
  }

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Liquidity Suggestion</h3>
            <p className="text-xs text-gray-400">Optimized for your capital efficiency</p>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-primary"
              style={{ width: `${suggestion.confidence}%` }}
            ></div>
          </div>
          <span className="text-xs font-semibold text-success">{suggestion.confidence}% confident</span>
        </div>
      </div>

      {/* Suggestion Details */}
      <div className="p-6 space-y-4">
        {/* Strategy */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Recommended Strategy</div>
          <div className="px-3 py-2 bg-gray-800 rounded-lg flex items-center justify-between">
            <span className="text-sm font-semibold text-white capitalize">{suggestion.strategy}</span>
            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
              suggestion.riskLevel === 'low' ? 'bg-success/20 text-success' :
              suggestion.riskLevel === 'medium' ? 'bg-warning/20 text-warning' :
              'bg-error/20 text-error'
            }`}>
              {suggestion.riskLevel} risk
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Optimal Price Range</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Min Price</div>
              <div className="text-sm font-semibold text-white">
                ${suggestion.minPrice.toFixed(6)}
              </div>
            </div>
            <div className="px-3 py-2 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Max Price</div>
              <div className="text-sm font-semibold text-white">
                ${suggestion.maxPrice.toFixed(6)}
              </div>
            </div>
          </div>
        </div>

        {/* Expected APR */}
        <div>
          <div className="text-xs text-gray-400 mb-2">Expected APR</div>
          <div className="px-3 py-2 bg-gradient-to-r from-success/20 to-primary/20 border border-success/30 rounded-lg">
            <div className="text-2xl font-bold text-success">
              {suggestion.expectedAPR.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Based on current volume and fees
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div>
          <div className="text-xs text-gray-400 mb-2">AI Analysis</div>
          <div className="px-3 py-2 bg-gray-800/50 rounded-lg text-xs text-gray-300 leading-relaxed">
            {suggestion.reasoning}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleApplySuggestion}
            className="w-full px-4 py-3 bg-gradient-to-r from-success to-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Apply Suggestion
          </button>

          <button
            onClick={() => setIsAnalyzing(true)}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Regenerate Suggestion
          </button>
        </div>

        {/* Disclaimer */}
        <div className="pt-2 border-t border-border-light">
          <p className="text-[10px] text-gray-500 text-center">
            AI suggestions are not financial advice. DYOR before providing liquidity.
          </p>
        </div>
      </div>
    </div>
  );
}
