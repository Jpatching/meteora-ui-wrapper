/**
 * GeckoTerminal API Client for Solana DEX Data
 * Docs: https://apiguide.geckoterminal.com
 *
 * Provides free OHLCV chart data for Solana DEX pools
 * Rate Limit: 30 requests/minute
 */

// GeckoTerminal API configuration
const GECKOTERMINAL_API_BASE = 'https://api.geckoterminal.com/api/v2';

// Time intervals supported by GeckoTerminal
export type GeckoTerminalTimeframe = 'day' | 'hour' | 'minute';

// Map our TimeInterval to GeckoTerminal timeframes
export const INTERVAL_TO_TIMEFRAME: Record<string, GeckoTerminalTimeframe> = {
  '1m': 'minute',
  '5m': 'minute',
  '15m': 'minute',
  '1h': 'hour',
  '4h': 'hour',
  '1d': 'day',
  '1w': 'day',
};

// Standard OHLCV data point (compatible with lightweight-charts)
export interface OHLCVDataPoint {
  time: number; // Unix timestamp in SECONDS
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// GeckoTerminal OHLCV response structure
interface GeckoTerminalOHLCVResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      ohlcv_list: Array<[
        number, // timestamp (seconds)
        number, // open
        number, // high
        number, // low
        number, // close
        number  // volume
      ]>;
    };
  };
  meta: {
    base: {
      address: string;
      name: string;
      symbol: string;
    };
  };
}

// DEXScreener API to get pool address from token address
interface DEXScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  liquidity?: {
    usd?: number;
  };
  volume?: {
    h24?: number;
  };
}

interface DEXScreenerResponse {
  schemaVersion: string;
  pairs: DEXScreenerPair[] | null;
}

/**
 * Get pool address for a token from DEXScreener
 * @param tokenAddress - Solana token address
 * @returns Pool address (best liquidity pool)
 */
export async function getPoolAddressForToken(tokenAddress: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[DEXScreener] API error (${response.status})`);
      return null;
    }

    const data: DEXScreenerResponse = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      console.warn(`[DEXScreener] No pairs found for token ${tokenAddress}`);
      return null;
    }

    // Sort by liquidity (descending) and pick the best pool
    const bestPair = data.pairs
      .filter(pair => pair.liquidity?.usd && pair.liquidity.usd > 1000) // Min $1k liquidity
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    if (!bestPair) {
      console.warn(`[DEXScreener] No liquid pairs found for token ${tokenAddress}`);
      return null;
    }

    console.log(`[DEXScreener] Found pool ${bestPair.pairAddress} for token ${tokenAddress} (${bestPair.dexId}, $${bestPair.liquidity?.usd?.toFixed(0)} liquidity)`);
    return bestPair.pairAddress;
  } catch (error) {
    console.error('[DEXScreener] Error fetching pool address:', error);
    return null;
  }
}

/**
 * Fetch OHLCV data from GeckoTerminal
 * @param poolAddress - Solana pool address (from DEXScreener)
 * @param timeframe - 'minute', 'hour', or 'day'
 * @param aggregate - Aggregation period (1, 5, 15 for minute; 1, 4 for hour; 1 for day)
 * @param limit - Max number of candles (default: 100, max: 1000)
 */
export async function getGeckoTerminalOHLCV(
  poolAddress: string,
  timeframe: GeckoTerminalTimeframe,
  aggregate: number = 1,
  limit: number = 100
): Promise<OHLCVDataPoint[]> {
  const url = new URL(`${GECKOTERMINAL_API_BASE}/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}`);
  url.searchParams.set('aggregate', aggregate.toString());
  url.searchParams.set('limit', limit.toString());

  try {
    console.log(`[GeckoTerminal] Fetching OHLCV: ${timeframe} (aggregate: ${aggregate}, limit: ${limit})`);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GeckoTerminal API error (${response.status}): ${errorText}`);
    }

    const data: GeckoTerminalOHLCVResponse = await response.json();

    if (!data.data?.attributes?.ohlcv_list) {
      throw new Error('Invalid response from GeckoTerminal API');
    }

    // Transform to standard format
    const candles = data.data.attributes.ohlcv_list.map(([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume,
    }));

    console.log(`[GeckoTerminal] Successfully fetched ${candles.length} candles`);

    // Validate and clean data for lightweight-charts
    const validatedCandles = validateOHLCVData(candles);

    return validatedCandles;
  } catch (error) {
    console.error('[GeckoTerminal] Error fetching OHLCV data:', error);
    throw error;
  }
}

/**
 * Validate and clean OHLCV data for lightweight-charts
 *
 * Ensures data meets lightweight-charts requirements:
 * - Removes duplicate timestamps (keeps latest)
 * - Sorts in ascending chronological order
 * - Filters invalid entries (negative prices, high < low, etc.)
 *
 * @param candles - Raw OHLCV data points
 * @returns Validated and sorted data points
 */
export function validateOHLCVData(candles: OHLCVDataPoint[]): OHLCVDataPoint[] {
  if (candles.length === 0) return [];

  // Remove duplicates by timestamp (keep last occurrence)
  const uniqueMap = new Map<number, OHLCVDataPoint>();
  candles.forEach(candle => {
    uniqueMap.set(candle.time, candle);
  });

  // Convert back to array, sort by time (ascending), and filter invalid entries
  const validated = Array.from(uniqueMap.values())
    .sort((a, b) => a.time - b.time)
    .filter(candle => {
      // Filter out invalid entries
      const isValid = (
        candle.time > 0 &&
        candle.open >= 0 &&
        candle.high >= 0 &&
        candle.low >= 0 &&
        candle.close >= 0 &&
        candle.volume >= 0 &&
        candle.high >= candle.low // High must be >= Low
      );

      if (!isValid) {
        console.warn('[GeckoTerminal] Filtered invalid candle:', candle);
      }

      return isValid;
    });

  if (validated.length < candles.length) {
    console.log(`[GeckoTerminal] Validated ${validated.length}/${candles.length} candles (removed ${candles.length - validated.length} invalid/duplicate)`);
  }

  return validated;
}

/**
 * Calculate 24h price change from OHLCV data
 * @param candles - Array of OHLCV candles
 */
export function calculate24hChange(candles: OHLCVDataPoint[]): {
  currentPrice: number;
  priceChange24h: number;
} {
  if (candles.length === 0) {
    return { currentPrice: 0, priceChange24h: 0 };
  }

  const latest = candles[candles.length - 1];
  const currentPrice = latest.close;

  // Find price 24h ago
  const dayAgo = Date.now() / 1000 - 86400;
  const dayAgoCandle = candles.find(c => c.time >= dayAgo) || candles[0];
  const price24hAgo = dayAgoCandle.open;

  const priceChange24h = price24hAgo > 0
    ? ((currentPrice - price24hAgo) / price24hAgo) * 100
    : 0;

  return { currentPrice, priceChange24h };
}

/**
 * Get aggregate value for timeframe
 * Maps our interval to GeckoTerminal's aggregate parameter
 */
export function getAggregateForInterval(interval: string): number {
  switch (interval) {
    case '1m': return 1;
    case '5m': return 5;
    case '15m': return 15;
    case '1h': return 1;
    case '4h': return 4;
    case '1d': return 1;
    case '1w': return 7;
    default: return 1;
  }
}

/**
 * Get appropriate limit for timeframe to show reasonable time window
 */
export function getLimitForInterval(interval: string): number {
  switch (interval) {
    case '1m': return 180;  // 3 hours of 1m candles
    case '5m': return 288;  // 24 hours of 5m candles
    case '15m': return 672; // 7 days of 15m candles
    case '1h': return 720;  // 30 days of 1h candles
    case '4h': return 540;  // 90 days of 4h candles
    case '1d': return 365;  // 1 year of daily candles
    case '1w': return 104;  // 2 years of weekly candles
    default: return 100;
  }
}
