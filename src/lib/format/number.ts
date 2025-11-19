/**
 * Number formatting utilities
 */

import Decimal from 'decimal.js';

/**
 * Format a number to a readable string with K/M/B suffixes
 */
export function formatReadableNumber(
  num: number | string | Decimal,
  options?: {
    decimals?: number;
    compact?: boolean;
    prefix?: string;
    suffix?: string;
  }
): string {
  const { decimals = 2, compact = true, prefix = '', suffix = '' } = options || {};

  // Handle NaN, undefined, null, and invalid values
  if (num === null || num === undefined || num === '' ||
      (typeof num === 'number' && (isNaN(num) || !isFinite(num)))) {
    return '0';
  }

  // Handle string "NaN" or "Infinity"
  if (typeof num === 'string' && (num === 'NaN' || num === 'Infinity' || num === '-Infinity')) {
    return '0';
  }

  let value: Decimal;
  try {
    value = new Decimal(num);
  } catch (error) {
    // If Decimal conversion fails, return 0
    console.warn('[formatReadableNumber] Failed to convert to Decimal:', num, error);
    return '0';
  }
  const absValue = value.abs();

  if (!compact) {
    return `${prefix}${value.toFixed(decimals)}${suffix}`;
  }

  let formatted: string;
  if (absValue.gte(1_000_000_000)) {
    formatted = `${value.div(1_000_000_000).toFixed(decimals)}B`;
  } else if (absValue.gte(1_000_000)) {
    formatted = `${value.div(1_000_000).toFixed(decimals)}M`;
  } else if (absValue.gte(1_000)) {
    formatted = `${value.div(1_000).toFixed(decimals)}K`;
  } else {
    formatted = value.toFixed(decimals);
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Format a price with appropriate decimals
 */
export function formatPrice(price: number | string | Decimal, decimals = 6): string {
  const value = new Decimal(price);

  if (value.gte(1000)) {
    return formatReadableNumber(value, { decimals: 2, compact: true });
  }

  if (value.gte(1)) {
    return value.toFixed(4);
  }

  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercent(value: number | string | Decimal, decimals = 2): string {
  const percent = new Decimal(value);
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number | string | Decimal, decimals = 2): string {
  return formatReadableNumber(amount, { decimals, prefix: '$', compact: true });
}

/**
 * Format a number with commas and optional compact notation
 */
export function formatNumber(num: number | string | Decimal, compact = true): string {
  if (compact) {
    return formatReadableNumber(num, { decimals: 2, compact: true });
  }

  const value = new Decimal(num);
  return value.toNumber().toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}
