/**
 * Convert DLMM bin data to OHLC candlestick format
 * Shows ACTUAL bin positions as candles - each bin becomes a candle
 */

import { BinData } from '@/lib/meteora/binDataService';

export interface OHLCCandle {
  time: number; // Unix timestamp (or bin ID for spacing)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Convert each bin to a candlestick representing that bin's price range and liquidity
 * REAL DATA - not simulated
 *
 * Each candle represents:
 * - Time: Bin ID (for proper spacing on chart)
 * - Open: Bin's lower price bound
 * - Close: Bin's upper price bound
 * - High: Bin's upper price bound (max possible price in this bin)
 * - Low: Bin's lower price bound (min possible price in this bin)
 * - Volume: Total liquidity in bin (X + Y tokens)
 *
 * Active bin is highlighted by being at the current time
 */
export function binsToOHLC(bins: BinData[], activeBinId?: number): OHLCCandle[] {
  if (bins.length === 0) {
    return [];
  }

  // Sort bins by binId to ensure proper order
  const sortedBins = [...bins].sort((a, b) => a.binId - b.binId);

  // Base timestamp - use current time for active bin, offset others
  const now = Math.floor(Date.now() / 1000);

  // Find active bin index
  const activeBinIndex = activeBinId
    ? sortedBins.findIndex(b => b.binId === activeBinId)
    : Math.floor(sortedBins.length / 2);

  const candles: OHLCCandle[] = [];

  sortedBins.forEach((bin, index) => {
    // Calculate bin width (price step between bins)
    // For DLMM, each bin has a fixed width based on bin step
    const binWidth = sortedBins.length > 1
      ? Math.abs(sortedBins[1].price - sortedBins[0].price) * 0.5
      : bin.price * 0.001; // 0.1% if only one bin

    const binPrice = bin.price;
    const lowerBound = binPrice - binWidth;
    const upperBound = binPrice + binWidth;

    // Calculate total liquidity in this bin
    const totalLiquidity = (bin.liquidityX || 0) + (bin.liquidityY || 0);

    // Time offset: bins before active go backwards, bins after go forwards
    // This creates a timeline where active bin is "now"
    const timeOffset = (index - activeBinIndex) * 300; // 5 min intervals
    const time = now + timeOffset;

    candles.push({
      time,
      open: lowerBound,    // Bottom of bin range
      close: upperBound,   // Top of bin range
      high: upperBound,    // Max price in bin
      low: lowerBound,     // Min price in bin
      volume: totalLiquidity,
    });
  });

  return candles;
}

/**
 * Convert bins to OHLC where each bin is a candle
 * Wrapper for binsToOHLC - kept for backward compatibility
 */
export function binsToHistoricalOHLC(
  bins: BinData[],
  activeBinId?: number, // Active bin ID for centering timeline
  candleCount?: number // Ignored - we show ALL bins
): OHLCCandle[] {
  // Show ALL actual bins - no simulation
  return binsToOHLC(bins, activeBinId);
}
