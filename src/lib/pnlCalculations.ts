/**
 * PNL calculation utilities for position tracking
 */

import type { UserPosition, TokenPrice } from '@/types/positions';

export interface PNLResult {
  // Current values
  currentValueUSD: number;
  currentBaseValue: number;
  currentQuoteValue: number;

  // PNL breakdown
  unrealizedPNL: number; // Excluding fees
  unrealizedPNLPercent: number;
  totalPNL: number; // Including fees
  totalPNLPercent: number;

  // Fees
  feesEarnedUSD: number;
  feesEarnedBase: number;
  feesEarnedQuote: number;

  // Performance metrics
  dailyAPR: number;
  weeklyAPR: number;
  monthlyAPR: number;
  annualizedAPR: number;

  // Time metrics
  daysActive: number;
  hoursActive: number;
}

/**
 * Calculate PNL for a position
 */
export function calculatePNL(
  position: UserPosition,
  basePriceUSD: number,
  quotePriceUSD: number
): PNLResult {
  // Current values
  const currentBaseValue = position.baseAmount * basePriceUSD;
  const currentQuoteValue = position.quoteAmount * quotePriceUSD;
  const currentValueUSD = currentBaseValue + currentQuoteValue;

  // Fees in USD
  const feesEarnedBase = position.unclaimedFeesBase;
  const feesEarnedQuote = position.unclaimedFeesQuote;
  const feesEarnedUSD = (feesEarnedBase * basePriceUSD) + (feesEarnedQuote * quotePriceUSD);

  // PNL calculations
  const unrealizedPNL = currentValueUSD - position.initialValueUSD;
  const unrealizedPNLPercent = position.initialValueUSD > 0
    ? (unrealizedPNL / position.initialValueUSD) * 100
    : 0;

  const totalPNL = unrealizedPNL + feesEarnedUSD;
  const totalPNLPercent = position.initialValueUSD > 0
    ? (totalPNL / position.initialValueUSD) * 100
    : 0;

  // Time metrics
  const now = Date.now();
  const millisActive = now - position.createdAt;
  const daysActive = millisActive / (1000 * 60 * 60 * 24);
  const hoursActive = millisActive / (1000 * 60 * 60);

  // APR calculations (annualized returns)
  const dailyReturn = daysActive > 0 ? totalPNL / daysActive : 0;
  const dailyAPR = position.initialValueUSD > 0
    ? (dailyReturn / position.initialValueUSD) * 100
    : 0;

  const weeklyReturn = daysActive >= 7 ? (totalPNL / daysActive) * 7 : totalPNL;
  const weeklyAPR = position.initialValueUSD > 0
    ? (weeklyReturn / position.initialValueUSD) * 100
    : 0;

  const monthlyReturn = daysActive >= 30 ? (totalPNL / daysActive) * 30 : totalPNL;
  const monthlyAPR = position.initialValueUSD > 0
    ? (monthlyReturn / position.initialValueUSD) * 100
    : 0;

  const annualizedAPR = position.initialValueUSD > 0 && daysActive > 0
    ? ((totalPNL / position.initialValueUSD) * (365 / daysActive)) * 100
    : 0;

  return {
    currentValueUSD,
    currentBaseValue,
    currentQuoteValue,
    unrealizedPNL,
    unrealizedPNLPercent,
    totalPNL,
    totalPNLPercent,
    feesEarnedUSD,
    feesEarnedBase,
    feesEarnedQuote,
    dailyAPR,
    weeklyAPR,
    monthlyAPR,
    annualizedAPR,
    daysActive,
    hoursActive,
  };
}

/**
 * Calculate impermanent loss
 */
export function calculateImpermanentLoss(
  initialBaseAmount: number,
  initialQuoteAmount: number,
  currentBaseAmount: number,
  currentQuoteAmount: number,
  initialBasePriceUSD: number,
  initialQuotePriceUSD: number,
  currentBasePriceUSD: number,
  currentQuotePriceUSD: number
): {
  impermanentLoss: number;
  impermanentLossPercent: number;
} {
  // Value if held (HODL value)
  const hodlValue =
    initialBaseAmount * currentBasePriceUSD +
    initialQuoteAmount * currentQuotePriceUSD;

  // Current LP position value
  const lpValue =
    currentBaseAmount * currentBasePriceUSD +
    currentQuoteAmount * currentQuotePriceUSD;

  const impermanentLoss = lpValue - hodlValue;
  const impermanentLossPercent = hodlValue > 0 ? (impermanentLoss / hodlValue) * 100 : 0;

  return {
    impermanentLoss,
    impermanentLossPercent,
  };
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format APR
 */
export function formatAPR(apr: number): string {
  if (apr >= 1000) {
    return `${(apr / 1000).toFixed(1)}K%`;
  }
  return `${apr.toFixed(2)}%`;
}

/**
 * Get color class for PNL value
 */
export function getPNLColorClass(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';
  return 'text-foreground-secondary';
}

/**
 * Get trend icon for PNL
 */
export function getPNLTrendIcon(value: number): string {
  if (value > 0) return '📈';
  if (value < 0) return '📉';
  return '➡️';
}

/**
 * Calculate position health score (0-100)
 */
export function calculateHealthScore(pnl: PNLResult): number {
  let score = 50; // Base score

  // PNL contribution (max +30, min -30)
  const pnlContribution = Math.max(-30, Math.min(30, pnl.totalPNLPercent * 0.3));
  score += pnlContribution;

  // APR contribution (max +20)
  const aprContribution = Math.min(20, pnl.annualizedAPR * 0.2);
  score += aprContribution;

  // Activity time contribution (max +10 after 30 days)
  const timeContribution = Math.min(10, (pnl.daysActive / 30) * 10);
  score += timeContribution;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get health score color
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-warning';
  return 'text-error';
}

/**
 * Get health score label
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}
