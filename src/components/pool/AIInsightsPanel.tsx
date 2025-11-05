/**
 * AI Insights Panel - Interactive Edition
 * Live AI-powered predictions with actionable recommendations
 *
 * Features:
 * - Real-time price prediction with live updates
 * - Volatility forecast and fee spike alerts
 * - Position health scoring with action buttons
 * - One-click rebalance recommendations
 * - Expected APR projections
 * - Interactive suggestions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBinData } from '@/lib/hooks/useBinData';
import { createPositionAnalytics, type PositionHealthScore, type RebalanceRecommendation } from '@/lib/ai/positionAnalytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface AIInsightsPanelProps {
  poolAddress: string;
  positionAddress?: string; // Optional: if user has a position
}

export function AIInsightsPanel({ poolAddress, positionAddress }: AIInsightsPanelProps) {
  const [mounted, setMounted] = useState(false);

  const { activeBin, binsAroundActive, getPositionRange, isLoading } = useBinData({
    poolAddress,
    enabled: mounted, // Only enable after mount
    refreshInterval: 10000, // 10 seconds
  });

  const [analytics] = useState(() => createPositionAnalytics());
  const [positionHealth, setPositionHealth] = useState<PositionHealthScore | null>(null);
  const [rebalanceRec, setRebalanceRec] = useState<RebalanceRecommendation | null>(null);

  // Ensure client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update analytics with historical data
  useEffect(() => {
    if (activeBin && binsAroundActive.length > 0 && typeof activeBin.price === 'number') {
      // Add current data point to history
      analytics.addHistoricalData({
        timestamp: Date.now(),
        binId: activeBin.binId,
        price: activeBin.price,
        volume: activeBin.supply || 0, // Using supply as volume proxy
        liquidity: (activeBin.xAmount || 0) + (activeBin.yAmount || 0),
      });
    }
  }, [activeBin, binsAroundActive, analytics]);

  // Analyze position if user has one
  useEffect(() => {
    if (!positionAddress || !activeBin) return;

    const analyzePosition = async () => {
      try {
        const positionRange = await getPositionRange(positionAddress);

        // Calculate health score
        const health = analytics.analyzePositionHealth(positionRange, activeBin);
        setPositionHealth(health);

        // Generate rebalance recommendation
        const rec = analytics.generateRebalanceRecommendation(positionRange, activeBin);
        setRebalanceRec(rec);
      } catch (error) {
        console.error('Error analyzing position:', error);
      }
    };

    analyzePosition();
  }, [positionAddress, activeBin, getPositionRange, analytics]);

  // Don't render analytics until mounted (prevent hydration mismatch)
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <span>🤖 AI Insights</span>
              <span className="text-xs font-normal text-gray-400">(Beta)</span>
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

  const pricePrediction = analytics.predictNextPrice(60); // 1 hour ahead
  const volatility = analytics.forecastVolatility();

  if (isLoading && !activeBin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
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
          <div className="flex items-center gap-2">
            <span>🤖 AI Insights</span>
            <span className="text-xs font-normal text-gray-400">(Beta)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Price Prediction */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              📈 Price Prediction (1h)
            </h3>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Predicted Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    ${pricePrediction.predictedPrice.toFixed(8)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    pricePrediction.trend === 'bullish'
                      ? 'bg-green-500/20 text-green-400'
                      : pricePrediction.trend === 'bearish'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {pricePrediction.trend === 'bullish' ? '↗' : pricePrediction.trend === 'bearish' ? '↘' : '→'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pricePrediction.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold">
                    {(pricePrediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Volatility Forecast */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              ⚡ Volatility Forecast
            </h3>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Current Volatility</span>
                <span className="text-white font-semibold">{volatility.currentVolatility.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Predicted Volatility</span>
                <span className="text-warning font-semibold">{volatility.predictedVolatility.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Fee Spike Probability</span>
                <span className={`font-semibold ${
                  volatility.feeSpikeProbability > 0.7 ? 'text-error' :
                  volatility.feeSpikeProbability > 0.4 ? 'text-warning' : 'text-success'
                }`}>
                  {(volatility.feeSpikeProbability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Optimal Bin Spread</span>
                  <span className="text-primary font-semibold">±{volatility.optimalBinSpread} bins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Position Health (if user has position) */}
          {positionHealth && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                💊 Position Health
              </h3>
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Health Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold gradient-text">
                      {positionHealth.score.toFixed(0)}/100
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      positionHealth.status === 'healthy'
                        ? 'bg-green-500/20 text-green-400'
                        : positionHealth.status === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {positionHealth.status}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      positionHealth.status === 'healthy'
                        ? 'bg-green-500'
                        : positionHealth.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${positionHealth.score}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Stays Active</span>
                    <span className="text-white font-semibold">
                      {(positionHealth.staysActiveProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Days Until Rebalance</span>
                    <span className="text-white font-semibold">
                      {positionHealth.daysUntilRebalance.toFixed(1)}
                    </span>
                  </div>
                </div>

                {positionHealth.recommendations.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Recommendations:</p>
                    <ul className="space-y-1">
                      {positionHealth.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rebalance Recommendation (if needed) */}
          {rebalanceRec && rebalanceRec.shouldRebalance && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                🔄 Rebalance Recommendation
              </h3>
              <div className={`p-4 rounded-lg border ${
                rebalanceRec.urgency === 'high'
                  ? 'bg-red-500/10 border-red-500/30'
                  : rebalanceRec.urgency === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">Urgency</span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold uppercase ${
                    rebalanceRec.urgency === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : rebalanceRec.urgency === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rebalanceRec.urgency}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Suggested Price Range</span>
                    <span className="text-white font-semibold">
                      ${rebalanceRec.suggestedMinPrice.toFixed(8)} - ${rebalanceRec.suggestedMaxPrice.toFixed(8)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Expected Fee APR</span>
                    <span className="text-success font-semibold text-lg">
                      {rebalanceRec.expectedFeeAPR.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Reasoning:</p>
                  <ul className="space-y-1">
                    {rebalanceRec.reasoning.map((reason, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              <strong>Note:</strong> AI predictions are probabilistic and based on historical patterns. Always do your own research and consider market conditions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
