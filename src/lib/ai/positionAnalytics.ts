/**
 * AI-Powered Position Analytics
 * Provides predictive insights for optimal liquidity positioning
 *
 * Features:
 * - Price prediction overlay
 * - Volatility forecasting
 * - Position health scoring
 * - Auto-rebalance recommendations
 * - Fee APR predictions
 */

import { BinData, ActiveBinInfo, PositionRangeData } from '@/lib/meteora/binDataService';

export interface PricePredict {
  predictedBinId: number;
  predictedPrice: number;
  confidence: number; // 0-1
  timeHorizon: number; // minutes
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface VolatilityForecast {
  currentVolatility: number; // percentage
  predictedVolatility: number;
  feeSpikeProbability: number; // 0-1
  optimalBinSpread: number; // suggested bin range
}

export interface PositionHealthScore {
  score: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
  staysActiveProb: number; // probability position stays in range (0-1)
  daysUntilRebalance: number;
  recommendations: string[];
}

export interface RebalanceRecommendation {
  shouldRebalance: boolean;
  urgency: 'low' | 'medium' | 'high';
  suggestedMinBinId: number;
  suggestedMaxBinId: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  expectedFeeAPR: number;
  reasoning: string[];
}

export interface BinHistory {
  timestamp: number;
  binId: number;
  price: number;
  volume: number;
  liquidity: number;
}

/**
 * Position Analytics Engine
 */
export class PositionAnalyticsEngine {
  private binHistory: BinHistory[] = [];
  private maxHistorySize: number = 1000;

  /**
   * Add historical bin data point
   */
  addHistoricalData(data: BinHistory): void {
    this.binHistory.push(data);

    // Keep only recent history
    if (this.binHistory.length > this.maxHistorySize) {
      this.binHistory = this.binHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Predict next price movement based on historical patterns
   * Uses weighted moving average and momentum indicators
   */
  predictNextPrice(timeHorizonMinutes: number = 15): PricePredict {
    if (this.binHistory.length < 10) {
      // Not enough data, return neutral prediction
      const latest = this.binHistory[this.binHistory.length - 1];
      return {
        predictedBinId: latest?.binId || 0,
        predictedPrice: latest?.price || 0,
        confidence: 0.1,
        timeHorizon: timeHorizonMinutes,
        trend: 'neutral',
      };
    }

    // Calculate weighted moving average (recent data weighted more)
    const weights = this.binHistory.map((_, i) => i + 1);
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    const wmaPrice = this.binHistory.reduce((sum, data, i) => {
      return sum + (data.price * weights[i]) / weightSum;
    }, 0);

    // Calculate momentum (price change velocity)
    const recent20 = this.binHistory.slice(-20);
    const momentum = recent20.reduce((sum, data, i) => {
      if (i === 0) return 0;
      return sum + (data.price - recent20[i - 1].price);
    }, 0) / recent20.length;

    // Predict next price
    const predictedPrice = wmaPrice + (momentum * timeHorizonMinutes / 15);

    // Calculate confidence based on data consistency
    const priceVariance = this.calculateVariance(this.binHistory.map(d => d.price));
    const confidence = Math.max(0.1, Math.min(0.95, 1 - (priceVariance / wmaPrice)));

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (momentum > 0.001 * wmaPrice) {
      trend = 'bullish';
    } else if (momentum < -0.001 * wmaPrice) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }

    // Convert price to bin ID (approximate)
    const latest = this.binHistory[this.binHistory.length - 1];
    const priceDiff = predictedPrice - latest.price;
    const binDiff = Math.round(priceDiff / latest.price * 100); // Approximate
    const predictedBinId = latest.binId + binDiff;

    return {
      predictedBinId,
      predictedPrice,
      confidence,
      timeHorizon: timeHorizonMinutes,
      trend,
    };
  }

  /**
   * Forecast volatility and fee spike probability
   */
  forecastVolatility(): VolatilityForecast {
    if (this.binHistory.length < 20) {
      return {
        currentVolatility: 0,
        predictedVolatility: 0,
        feeSpikeProbability: 0,
        optimalBinSpread: 100,
      };
    }

    // Calculate current volatility (standard deviation of price changes)
    const priceChanges = [];
    for (let i = 1; i < this.binHistory.length; i++) {
      const change = (this.binHistory[i].price - this.binHistory[i - 1].price) / this.binHistory[i - 1].price;
      priceChanges.push(change);
    }

    const currentVolatility = Math.sqrt(this.calculateVariance(priceChanges));

    // Predict future volatility using exponential moving average
    const recent10 = priceChanges.slice(-10);
    const recentVolatility = Math.sqrt(this.calculateVariance(recent10));
    const predictedVolatility = currentVolatility * 0.7 + recentVolatility * 0.3;

    // Calculate fee spike probability (high volatility = higher fees)
    const volatilityThreshold = 0.05; // 5%
    const feeSpikeProbability = Math.min(1, predictedVolatility / volatilityThreshold);

    // Calculate optimal bin spread based on volatility
    const baseSpread = 50;
    const optimalBinSpread = Math.ceil(baseSpread * (1 + predictedVolatility * 10));

    return {
      currentVolatility: currentVolatility * 100, // Convert to percentage
      predictedVolatility: predictedVolatility * 100,
      feeSpikeProbability,
      optimalBinSpread,
    };
  }

  /**
   * Calculate position health score
   */
  analyzePositionHealth(
    positionRange: PositionRangeData,
    activeBin: ActiveBinInfo
  ): PositionHealthScore {
    const binRange = positionRange.maxBinId - positionRange.minBinId;
    const distanceFromMin = activeBin.binId - positionRange.minBinId;
    const distanceFromMax = positionRange.maxBinId - activeBin.binId;

    // Calculate how centered the position is
    const centeredness = 1 - Math.abs(0.5 - (distanceFromMin / binRange));

    // Predict if price will stay in range
    const prediction = this.predictNextPrice(60); // 1 hour ahead
    const willStayInRange =
      prediction.predictedBinId >= positionRange.minBinId &&
      prediction.predictedBinId <= positionRange.maxBinId;

    const staysActiveProb = willStayInRange ? prediction.confidence : (1 - prediction.confidence);

    // Calculate score (0-100)
    let score = centeredness * 50 + staysActiveProb * 50;

    // Adjust score based on trend alignment
    if (prediction.trend === 'bullish' && distanceFromMax > distanceFromMin) {
      score += 10; // Good positioning for uptrend
    } else if (prediction.trend === 'bearish' && distanceFromMin > distanceFromMax) {
      score += 10; // Good positioning for downtrend
    }

    score = Math.max(0, Math.min(100, score));

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 70) {
      status = 'healthy';
    } else if (score >= 40) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    // Estimate days until rebalance needed
    const volatility = this.forecastVolatility();
    const daysUntilRebalance = score > 70
      ? Math.max(1, 7 / (1 + volatility.predictedVolatility / 10))
      : score > 40
        ? Math.max(0.5, 3 / (1 + volatility.predictedVolatility / 10))
        : 0.1;

    // Generate recommendations
    const recommendations: string[] = [];
    if (score < 70) {
      recommendations.push('Consider rebalancing soon to optimize fee capture');
    }
    if (!willStayInRange) {
      recommendations.push(`Price predicted to move ${prediction.trend}, adjust range accordingly`);
    }
    if (volatility.feeSpikeProbability > 0.7) {
      recommendations.push('High volatility expected - fees may spike, but position risk increases');
    }
    if (centeredness < 0.5) {
      recommendations.push('Position is off-center - may miss trading activity');
    }

    return {
      score,
      status,
      staysActiveProb,
      daysUntilRebalance,
      recommendations,
    };
  }

  /**
   * Generate rebalance recommendation
   */
  generateRebalanceRecommendation(
    currentPosition: PositionRangeData,
    activeBin: ActiveBinInfo
  ): RebalanceRecommendation {
    const health = this.analyzePositionHealth(currentPosition, activeBin);
    const volatility = this.forecastVolatility();
    const prediction = this.predictNextPrice(60);

    const shouldRebalance = health.score < 60 || health.staysActiveProb < 0.5;

    let urgency: 'low' | 'medium' | 'high';
    if (health.score < 30 || !health.staysActiveProb) {
      urgency = 'high';
    } else if (health.score < 60) {
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    // Calculate suggested range centered around predicted price
    const suggestedBinSpread = volatility.optimalBinSpread;
    const centerBinId = prediction.predictedBinId;

    const suggestedMinBinId = centerBinId - Math.floor(suggestedBinSpread / 2);
    const suggestedMaxBinId = centerBinId + Math.ceil(suggestedBinSpread / 2);

    // Approximate prices (would use actual bin-to-price conversion in production)
    const binStepPercent = 0.01; // 1% per bin (approximate)
    const suggestedMinPrice = prediction.predictedPrice * Math.pow(1 - binStepPercent, suggestedBinSpread / 2);
    const suggestedMaxPrice = prediction.predictedPrice * Math.pow(1 + binStepPercent, suggestedBinSpread / 2);

    // Estimate expected APR based on volatility and liquidity concentration
    const baseAPR = 20; // 20% base APR
    const volatilityMultiplier = 1 + volatility.predictedVolatility / 10;
    const expectedFeeAPR = baseAPR * volatilityMultiplier;

    // Generate reasoning
    const reasoning: string[] = [];
    if (shouldRebalance) {
      reasoning.push(`Position health score is ${health.score.toFixed(0)}/100`);
      reasoning.push(`Predicted ${prediction.trend} trend with ${(prediction.confidence * 100).toFixed(0)}% confidence`);
      reasoning.push(`Optimal bin spread: ±${suggestedBinSpread} bins based on volatility`);
      reasoning.push(`Expected fee APR: ${expectedFeeAPR.toFixed(1)}% with new range`);
    } else {
      reasoning.push('Position is well-positioned, no immediate rebalancing needed');
      reasoning.push(`Current health score: ${health.score.toFixed(0)}/100`);
    }

    return {
      shouldRebalance,
      urgency,
      suggestedMinBinId,
      suggestedMaxBinId,
      suggestedMinPrice,
      suggestedMaxPrice,
      expectedFeeAPR,
      reasoning,
    };
  }

  /**
   * Helper: Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.binHistory = [];
  }

  /**
   * Export history for persistence
   */
  exportHistory(): BinHistory[] {
    return [...this.binHistory];
  }

  /**
   * Import history from storage
   */
  importHistory(history: BinHistory[]): void {
    this.binHistory = history.slice(-this.maxHistorySize);
  }
}

/**
 * Factory function
 */
export function createPositionAnalytics(): PositionAnalyticsEngine {
  return new PositionAnalyticsEngine();
}
