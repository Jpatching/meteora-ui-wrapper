/**
 * Shared helper utilities for Meteora protocol hooks
 * Based on /studio/src/helpers
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import BN from 'bn.js';
import Decimal from 'decimal.js';

/**
 * Convert human-readable amount to lamports (raw token amount)
 * @param amount Human-readable amount (e.g., "100.5")
 * @param decimals Token decimals
 * @returns BN in lamports
 */
export function getAmountInLamports(amount: number | string, decimals: number): BN {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const lamports = Math.floor(numAmount * Math.pow(10, decimals));
  return new BN(lamports);
}

/**
 * Convert lamports (raw token amount) to human-readable amount
 * @param lamports Raw token amount as BN
 * @param decimals Token decimals
 * @returns Human-readable number
 */
export function getAmountInTokens(lamports: BN, decimals: number): number {
  const divisor = new BN(10).pow(new BN(decimals));
  return lamports.toNumber() / divisor.toNumber();
}

/**
 * Get token decimals from mint address
 * @param connection Solana connection
 * @param mint Token mint address
 * @returns Number of decimals
 */
export async function getTokenDecimals(connection: Connection, mint: PublicKey): Promise<number> {
  try {
    const mintInfo = await getMint(connection, mint);
    return mintInfo.decimals;
  } catch (error) {
    console.error('Error fetching token decimals:', error);
    throw new Error(`Failed to fetch decimals for mint: ${mint.toString()}`);
  }
}

/**
 * Convert price to sqrt price for DAMM v2
 * Formula: sqrtPrice = sqrt(price) * 2^64 * 10^((quoteDecimals - baseDecimals) / 2)
 * @param price Regular price (quote/base)
 * @param baseDecimals Base token decimals
 * @param quoteDecimals Quote token decimals
 * @returns Sqrt price as BN
 */
export function getSqrtPriceFromPrice(
  price: number,
  baseDecimals: number,
  quoteDecimals: number
): BN {
  if (price <= 0) {
    throw new Error('Price must be positive');
  }

  const decimalDiff = quoteDecimals - baseDecimals;
  const adjustedPrice = price * Math.pow(10, decimalDiff);
  const sqrtPrice = Math.sqrt(adjustedPrice);

  // Multiply by 2^64
  const Q64 = new BN(2).pow(new BN(64));
  const sqrtPriceBN = new BN(Math.floor(sqrtPrice * Math.pow(2, 64)));

  return sqrtPriceBN;
}

/**
 * Convert sqrt price to regular price for DAMM v2
 * Formula: price = (sqrtPrice / 2^64)^2 / 10^(quoteDecimals - baseDecimals)
 * @param sqrtPrice Sqrt price as BN
 * @param baseDecimals Base token decimals
 * @param quoteDecimals Quote token decimals
 * @returns Regular price
 */
export function getPriceFromSqrtPrice(
  sqrtPrice: BN,
  baseDecimals: number,
  quoteDecimals: number
): number {
  const Q64 = Math.pow(2, 64);
  const sqrtPriceNum = sqrtPrice.toNumber() / Q64;
  const price = Math.pow(sqrtPriceNum, 2);

  const decimalDiff = quoteDecimals - baseDecimals;
  const adjustedPrice = price / Math.pow(10, decimalDiff);

  return adjustedPrice;
}

/**
 * Validate percentage value (0-100)
 * @param value Percentage value
 * @param fieldName Field name for error message
 */
export function validatePercentage(value: number, fieldName: string): void {
  if (isNaN(value) || value < 0 || value > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }
}

/**
 * Validate that allocations sum to 100%
 * @param allocations Array of allocation objects with percentage field
 */
export function validateAllocationSum(allocations: Array<{ percentage: number }>): void {
  const sum = allocations.reduce((acc, alloc) => acc + alloc.percentage, 0);
  if (Math.abs(sum - 100) > 0.01) { // Allow small floating point errors
    throw new Error(`Allocations must sum to 100% (current: ${sum}%)`);
  }
}

/**
 * Convert allocations from percentages to token amounts
 * @param allocations Array of {address, percentage}
 * @param totalAmount Total amount to distribute
 * @returns Array of {address, amount}
 */
export function fromAllocationsToAmount(
  allocations: Array<{ address: string; percentage: number }>,
  totalAmount: BN
): Array<{ address: PublicKey; amount: BN }> {
  validateAllocationSum(allocations);

  return allocations.map(alloc => {
    const amount = totalAmount.mul(new BN(alloc.percentage * 100)).div(new BN(10000));
    return {
      address: new PublicKey(alloc.address),
      amount,
    };
  });
}

/**
 * Calculate slippage amount
 * @param amount Original amount
 * @param slippageBps Slippage in basis points (100 = 1%)
 * @param direction 'up' for maximum, 'down' for minimum
 * @returns Amount with slippage applied
 */
export function calculateSlippageAmount(
  amount: BN,
  slippageBps: number,
  direction: 'up' | 'down'
): BN {
  const slippageFactor = new BN(slippageBps);
  const adjustment = amount.mul(slippageFactor).div(new BN(10000));

  if (direction === 'up') {
    return amount.add(adjustment);
  } else {
    return amount.sub(adjustment);
  }
}

/**
 * Validate BN amount
 * @param value String or number value
 * @param fieldName Field name for error message
 * @param decimals Token decimals
 * @returns BN in lamports
 */
export function validateAndConvertAmount(
  value: string | number,
  fieldName: string,
  decimals: number = 9
): BN {
  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue <= 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
    return getAmountInLamports(numValue, decimals);
  } catch (error: any) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

/**
 * Format BN amount for display
 * @param amount BN amount in lamports
 * @param decimals Token decimals
 * @param maxDecimals Maximum decimal places to show
 * @returns Formatted string
 */
export function formatAmount(amount: BN, decimals: number, maxDecimals: number = 4): string {
  const tokens = getAmountInTokens(amount, decimals);
  return tokens.toFixed(maxDecimals);
}

/**
 * Get current timestamp
 * @returns Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate timestamp (must be in future)
 * @param timestamp Unix timestamp in seconds
 * @param fieldName Field name for error message
 */
export function validateFutureTimestamp(timestamp: number, fieldName: string): void {
  const now = getCurrentTimestamp();
  if (timestamp <= now) {
    throw new Error(`${fieldName} must be in the future (current: ${now}, provided: ${timestamp})`);
  }
}

/**
 * Validate address is valid Solana PublicKey
 * @param address Address string
 * @param fieldName Field name for error message
 * @returns PublicKey
 */
export function validatePublicKey(address: string, fieldName: string): PublicKey {
  if (!address || address.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  try {
    return new PublicKey(address);
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${address} is not a valid Solana address`);
  }
}

/**
 * Simple curve builder for DBC (linear)
 * @param params Curve parameters
 * @returns Curve configuration object
 */
export interface CurveParams {
  initialPrice?: number;
  finalPrice?: number;
  migrationFee?: number;
  [key: string]: any;
}

export function buildSimpleCurve(params: CurveParams): any {
  // This is a placeholder - actual implementation depends on SDK types
  // Will be refined when implementing DBC hook
  return {
    initialPrice: params.initialPrice || 0,
    finalPrice: params.finalPrice || 0,
    migrationFee: params.migrationFee || 0,
  };
}

/**
 * Sleep utility for sequential operations
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
