/**
 * APR/APY Calculator for LP Positions
 * Calculates Annual Percentage Rate and Annual Percentage Yield
 */

export interface APRCalculationInput {
  // Unclaimed fees in USD
  unclaimedFeesUSD: number;
  // Current position value in USD
  positionValueUSD: number;
  // Days since position was created (for extrapolation)
  daysSinceCreation: number;
  // Optional: Liquidity mining rewards in USD
  lmRewardsUSD?: number;
}

export interface APRResult {
  // Simple APR (fees only, annualized)
  feeAPR: number;
  // APR including liquidity mining rewards
  totalAPR: number;
  // APY (compounded)
  apy: number;
  // Daily yield percentage
  dailyYield: number;
  // Projected yearly earnings in USD
  yearlyEarningsUSD: number;
}

/**
 * Calculate APR/APY for a position
 *
 * Formula:
 * - APR = (fees earned / position value) * (365 / days) * 100
 * - APY = (1 + dailyRate)^365 - 1 (assuming daily compounding)
 */
export function calculateAPR(input: APRCalculationInput): APRResult {
  const {
    unclaimedFeesUSD,
    positionValueUSD,
    daysSinceCreation,
    lmRewardsUSD = 0,
  } = input;

  // Prevent division by zero
  if (positionValueUSD <= 0 || daysSinceCreation <= 0) {
    return {
      feeAPR: 0,
      totalAPR: 0,
      apy: 0,
      dailyYield: 0,
      yearlyEarningsUSD: 0,
    };
  }

  // Calculate daily fees earned
  const dailyFeesUSD = unclaimedFeesUSD / daysSinceCreation;
  const dailyLMRewardsUSD = lmRewardsUSD / daysSinceCreation;
  const totalDailyEarningsUSD = dailyFeesUSD + dailyLMRewardsUSD;

  // Calculate daily yield as a percentage
  const dailyYield = (totalDailyEarningsUSD / positionValueUSD) * 100;

  // Calculate simple APR (annualized)
  const feeAPR = (dailyFeesUSD * 365 / positionValueUSD) * 100;
  const totalAPR = (totalDailyEarningsUSD * 365 / positionValueUSD) * 100;

  // Calculate APY (compound interest)
  // APY = (1 + dailyRate)^365 - 1
  const dailyRate = totalDailyEarningsUSD / positionValueUSD;
  const apy = (Math.pow(1 + dailyRate, 365) - 1) * 100;

  // Projected yearly earnings
  const yearlyEarningsUSD = totalDailyEarningsUSD * 365;

  return {
    feeAPR,
    totalAPR,
    apy,
    dailyYield,
    yearlyEarningsUSD,
  };
}

/**
 * Get color coding for APR display
 */
export function getAPRColorClass(apr: number): string {
  if (apr >= 100) return 'text-green-400';
  if (apr >= 50) return 'text-green-500';
  if (apr >= 20) return 'text-yellow-400';
  if (apr >= 5) return 'text-gray-300';
  return 'text-gray-500';
}

/**
 * Get performance rating based on APR
 */
export function getAPRRating(apr: number): 'excellent' | 'good' | 'moderate' | 'low' {
  if (apr >= 100) return 'excellent';
  if (apr >= 50) return 'good';
  if (apr >= 20) return 'moderate';
  return 'low';
}

/**
 * Format APR for display
 */
export function formatAPR(apr: number): string {
  if (apr >= 1000) {
    return `${(apr / 1000).toFixed(1)}k%`;
  }
  if (apr >= 100) {
    return `${apr.toFixed(0)}%`;
  }
  if (apr >= 1) {
    return `${apr.toFixed(1)}%`;
  }
  return `${apr.toFixed(2)}%`;
}

/**
 * Calculate APR for multiple positions (portfolio APR)
 */
export function calculatePortfolioAPR(positions: APRCalculationInput[]): APRResult {
  const totalValue = positions.reduce((sum, p) => sum + p.positionValueUSD, 0);
  const totalFees = positions.reduce((sum, p) => sum + p.unclaimedFeesUSD, 0);
  const totalLMRewards = positions.reduce((sum, p) => sum + (p.lmRewardsUSD || 0), 0);

  // Weight-average the days (by position value)
  const weightedDays = positions.reduce((sum, p) => {
    return sum + (p.daysSinceCreation * p.positionValueUSD);
  }, 0) / totalValue;

  return calculateAPR({
    unclaimedFeesUSD: totalFees,
    positionValueUSD: totalValue,
    daysSinceCreation: weightedDays || 1,
    lmRewardsUSD: totalLMRewards,
  });
}
