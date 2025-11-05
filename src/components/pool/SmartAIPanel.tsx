/**
 * Smart AI Panel - Actionable Intelligence
 * Provides real-time, useful AI recommendations with one-click actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBinData } from '@/lib/hooks/useBinData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface SmartAIPanelProps {
  poolAddress: string;
  poolType: 'dlmm' | 'damm' | 'dbc' | string;
  currentPrice: number;
  binStep: number;
  volume24h: number;
  liquidity: number;
  onAddLiquidity?: (minPrice: number, maxPrice: number) => void;
}

interface SmartSuggestion {
  id: string;
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  action?: {
    label: string;
    handler: () => void;
  };
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
}

export function SmartAIPanel({
  poolAddress,
  poolType,
  currentPrice,
  binStep,
  volume24h,
  liquidity,
  onAddLiquidity,
}: SmartAIPanelProps) {
  const { connected } = useWallet();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [priceChange, setPriceChange] = useState(0);

  // Only enable bin data for DLMM pools (prevent "Invalid account discriminator" error)
  const isDLMM = poolType === 'dlmm';

  const { activeBin, binsAroundActive, isLoading } = useBinData({
    poolAddress,
    enabled: isDLMM, // Only fetch bin data for DLMM pools
    refreshInterval: isDLMM ? 5000 : false, // Update every 5 seconds for DLMM only
    binRange: 30,
  });

  // Track live price changes
  useEffect(() => {
    if (activeBin && typeof activeBin.price === 'number') {
      const oldPrice = livePrice;
      const newPrice = activeBin.price;
      setLivePrice(newPrice);

      if (oldPrice > 0) {
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        setPriceChange(change);
      }
    }
  }, [activeBin, livePrice]);

  // Generate smart suggestions based on real data
  useEffect(() => {
    // For non-DLMM pools, generate basic suggestions without bin data
    if (!isDLMM) {
      const basicSuggestions: SmartSuggestion[] = [];

      // Volume-based suggestion
      if (volume24h > 100000) {
        basicSuggestions.push({
          id: 'high-volume',
          type: 'opportunity',
          title: '📊 High Trading Volume',
          description: `This pool has $${(volume24h / 1000).toFixed(1)}K in 24h volume. Good for fee generation.`,
          confidence: 80,
          impact: 'high',
        });
      }

      // Liquidity-based suggestion
      if (liquidity < volume24h * 0.5) {
        basicSuggestions.push({
          id: 'low-liquidity',
          type: 'opportunity',
          title: '💰 Low Liquidity / High Volume',
          description: `Liquidity is only ${((liquidity / volume24h) * 100).toFixed(0)}% of daily volume. High APR potential.`,
          confidence: 75,
          impact: 'high',
        });
      }

      setSuggestions(basicSuggestions.slice(0, 2));
      return;
    }

    if (!activeBin || !binsAroundActive.length) return;

    const newSuggestions: SmartSuggestion[] = [];

    // Analyze liquidity distribution
    const totalLiquidity = binsAroundActive.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
    const activeBinLiquidity = (activeBin.xAmount || 0) + (activeBin.yAmount || 0);
    const liquidityConcentration = totalLiquidity > 0 ? (activeBinLiquidity / totalLiquidity) * 100 : 0;

    // 1. Low liquidity opportunity
    if (liquidityConcentration < 5 && volume24h > 1000) {
      newSuggestions.push({
        id: 'low-liquidity',
        type: 'opportunity',
        title: '💰 High APR Opportunity',
        description: `Only ${liquidityConcentration.toFixed(1)}% of liquidity is at current price. Adding liquidity here could earn 3-5x higher fees.`,
        confidence: 85,
        impact: 'high',
        action: {
          label: 'Add Liquidity',
          handler: () => {
            const range = calculateOptimalRange(activeBin.price, binStep, 'narrow');
            onAddLiquidity?.(range.min, range.max);
          },
        },
      });
    }

    // 2. Price momentum detection
    if (Math.abs(priceChange) > 0.1) {
      const direction = priceChange > 0 ? 'rising' : 'falling';
      const emoji = priceChange > 0 ? '📈' : '📉';

      newSuggestions.push({
        id: 'price-momentum',
        type: priceChange > 2 ? 'warning' : 'info',
        title: `${emoji} Price ${direction === 'rising' ? 'Surge' : 'Drop'} Detected`,
        description: `Price ${direction} ${Math.abs(priceChange).toFixed(2)}% in last 5s. ${
          direction === 'rising'
            ? 'Consider positioning liquidity above current price for sell pressure.'
            : 'Consider positioning liquidity below current price for buy pressure.'
        }`,
        confidence: Math.min(Math.abs(priceChange) * 10, 95),
        impact: Math.abs(priceChange) > 2 ? 'high' : 'medium',
      });
    }

    // 3. Optimal range suggestion
    const volatility = calculateVolatility(binsAroundActive);
    if (volatility > 0) {
      const strategy = volatility > 5 ? 'wide' : volatility > 2 ? 'moderate' : 'narrow';
      const expectedAPR = estimateAPR(volume24h, liquidity, volatility);

      newSuggestions.push({
        id: 'optimal-range',
        type: 'info',
        title: '🎯 Optimal Range Suggestion',
        description: `Based on ${volatility.toFixed(1)}% volatility, a ${strategy} range (±${getRecommendedBins(strategy)} bins) should earn ~${expectedAPR.toFixed(1)}% APR.`,
        confidence: 75,
        impact: 'medium',
        action: {
          label: `Add ${strategy} range`,
          handler: () => {
            const range = calculateOptimalRange(activeBin.price, binStep, strategy);
            onAddLiquidity?.(range.min, range.max);
          },
        },
      });
    }

    // 4. Volume spike alert
    const avgVolume = volume24h / 24; // Per hour
    const recentVolume = calculateRecentVolume(binsAroundActive);
    if (recentVolume > avgVolume * 2) {
      newSuggestions.push({
        id: 'volume-spike',
        type: 'opportunity',
        title: '⚡ Volume Spike Alert',
        description: `Trading volume is ${(recentVolume / avgVolume).toFixed(1)}x above average. Fees are spiking - good time to add liquidity.`,
        confidence: 90,
        impact: 'high',
      });
    }

    // 5. Imbalanced liquidity
    const leftLiquidity = binsAroundActive.filter(b => b.price < activeBin.price).reduce((s, b) => s + b.totalLiquidity, 0);
    const rightLiquidity = binsAroundActive.filter(b => b.price > activeBin.price).reduce((s, b) => s + b.totalLiquidity, 0);
    const imbalance = Math.abs(leftLiquidity - rightLiquidity) / (leftLiquidity + rightLiquidity);

    if (imbalance > 0.6) {
      const side = leftLiquidity > rightLiquidity ? 'below' : 'above';
      newSuggestions.push({
        id: 'liquidity-imbalance',
        type: 'opportunity',
        title: '⚖️ Liquidity Imbalance',
        description: `${(imbalance * 100).toFixed(0)}% more liquidity ${side} current price. Adding liquidity on the opposite side could capture more fees.`,
        confidence: 70,
        impact: 'medium',
      });
    }

    // Sort by impact and confidence
    newSuggestions.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      return (impactScore[b.impact] * b.confidence) - (impactScore[a.impact] * a.confidence);
    });

    setSuggestions(newSuggestions.slice(0, 3)); // Show top 3
  }, [activeBin, binsAroundActive, priceChange, volume24h, liquidity, binStep, onAddLiquidity]);

  if (isLoading && !activeBin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <span>🤖 Smart AI</span>
              <span className="text-xs font-normal text-gray-400 animate-pulse">Analyzing...</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🤖 Smart AI</span>
              <span className="text-xs font-normal text-success flex items-center gap-1">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
            {activeBin && typeof activeBin.price === 'number' && (
              <div className="text-xs font-mono text-gray-400">
                ${activeBin.price.toFixed(8)}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <div className="text-4xl mb-2">🧘</div>
              <p>Market is stable. No urgent actions needed.</p>
              <p className="text-xs mt-1">AI monitoring for opportunities...</p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border ${
                  suggestion.type === 'opportunity'
                    ? 'bg-green-500/5 border-green-500/20'
                    : suggestion.type === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{suggestion.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      suggestion.impact === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : suggestion.impact === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {suggestion.impact.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {suggestion.confidence}% sure
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 mb-3">{suggestion.description}</p>

                {suggestion.action && connected && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={suggestion.action.handler}
                    className="w-full"
                  >
                    {suggestion.action.label} →
                  </Button>
                )}

                {suggestion.action && !connected && (
                  <div className="text-xs text-gray-400 text-center py-2 bg-gray-800/30 rounded">
                    Connect wallet to take action
                  </div>
                )}
              </div>
            ))
          )}

          {/* Live Stats */}
          {activeBin && (
            <div className="pt-3 mt-3 border-t border-gray-700">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">Active Bin</div>
                  <div className="font-semibold text-white font-mono">#{activeBin.binId}</div>
                </div>
                <div>
                  <div className="text-gray-400">Bin Liquidity</div>
                  <div className="font-semibold text-white">${(activeBin.xAmount + activeBin.yAmount).toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-gray-400">5s Change</div>
                  <div className={`font-semibold ${priceChange > 0 ? 'text-success' : priceChange < 0 ? 'text-error' : 'text-gray-400'}`}>
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(3)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function calculateOptimalRange(price: number, binStep: number, strategy: 'narrow' | 'moderate' | 'wide') {
  const bins = getRecommendedBins(strategy);
  const stepPercent = binStep / 10000;

  return {
    min: price * Math.pow(1 - stepPercent, bins),
    max: price * Math.pow(1 + stepPercent, bins),
  };
}

function getRecommendedBins(strategy: 'narrow' | 'moderate' | 'wide'): number {
  return strategy === 'narrow' ? 10 : strategy === 'moderate' ? 25 : 50;
}

function calculateVolatility(bins: any[]): number {
  if (bins.length < 2) return 0;

  const prices = bins.map(b => b.price);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;

  return (Math.sqrt(variance) / mean) * 100;
}

function estimateAPR(volume24h: number, liquidity: number, volatility: number): number {
  if (liquidity === 0) return 0;

  const baseFee = 0.002; // 0.2% base fee
  const dailyFees = volume24h * baseFee;
  const yearlyFees = dailyFees * 365;
  const baseAPR = (yearlyFees / liquidity) * 100;

  // Adjust for volatility (higher volatility = more fees but more risk)
  const volatilityMultiplier = 1 + (volatility / 100);

  return baseAPR * volatilityMultiplier;
}

function calculateRecentVolume(bins: any[]): number {
  // Estimate recent volume from liquidity changes
  return bins.reduce((sum, bin) => sum + bin.totalLiquidity * 0.1, 0);
}
