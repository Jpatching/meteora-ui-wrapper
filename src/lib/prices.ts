/**
 * Token price fetching service using Jupiter V3 API
 * Industry standard for Solana token pricing
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

interface PriceCache {
  price: number;
  timestamp: number;
}

// Cache prices for 30 seconds to reduce API calls
const priceCache = new Map<string, PriceCache>();
const CACHE_TTL = 30000; // 30 seconds

// Jupiter V3 API endpoint
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v3';

/**
 * Fetch token price from Jupiter V3 API
 */
export async function fetchTokenPrice(mint: string): Promise<number> {
  // Check cache first
  const cached = priceCache.get(mint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${mint}`);
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.data?.[mint]?.price || 0;

    // Cache the price
    priceCache.set(mint, {
      price,
      timestamp: Date.now(),
    });

    return price;
  } catch (error) {
    console.error(`Failed to fetch price for ${mint}:`, error);
    // Return cached price if available, otherwise 0
    return cached?.price || 0;
  }
}

/**
 * Fetch multiple token prices in batch
 */
export async function fetchMultipleTokenPrices(
  mints: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  // Filter out already cached prices
  const now = Date.now();
  const mintsToFetch: string[] = [];

  for (const mint of mints) {
    const cached = priceCache.get(mint);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      prices.set(mint, cached.price);
    } else {
      mintsToFetch.push(mint);
    }
  }

  // Fetch remaining prices
  if (mintsToFetch.length > 0) {
    try {
      const idsParam = mintsToFetch.join(',');
      const response = await fetch(`${JUPITER_PRICE_API}?ids=${idsParam}`);

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();

      for (const mint of mintsToFetch) {
        const price = data.data?.[mint]?.price || 0;
        prices.set(mint, price);

        // Cache the price
        priceCache.set(mint, {
          price,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error('Failed to fetch multiple prices:', error);
      // Use cached prices if available
      for (const mint of mintsToFetch) {
        const cached = priceCache.get(mint);
        prices.set(mint, cached?.price || 0);
      }
    }
  }

  return prices;
}

/**
 * Get cached price without fetching
 */
export function getCachedPrice(mint: string): number | null {
  const cached = priceCache.get(mint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }
  return null;
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Fallback: Calculate price from pool reserves
 * Use when Jupiter API is unavailable
 */
export async function calculatePriceFromReserves(
  connection: Connection,
  poolAddress: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey
): Promise<number> {
  try {
    // This is a simplified calculation
    // In production, you'd fetch actual pool account data
    // and calculate based on reserves

    const [baseMintInfo, quoteMintInfo] = await Promise.all([
      getMint(connection, baseMint),
      getMint(connection, quoteMint),
    ]);

    // Calculate price would require pool reserve data
    // This is a placeholder - actual implementation depends on pool type
    console.log('Pool price calculation not yet implemented');
    return 0;
  } catch (error) {
    console.error('Failed to calculate price from reserves:', error);
    return 0;
  }
}

/**
 * Common Solana token mints for reference
 */
export const COMMON_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
} as const;

/**
 * Check if a price is stale
 */
export function isPriceStale(mint: string): boolean {
  const cached = priceCache.get(mint);
  if (!cached) return true;
  return Date.now() - cached.timestamp >= CACHE_TTL;
}

/**
 * Preload common token prices
 */
export async function preloadCommonPrices(): Promise<void> {
  const commonMints = Object.values(COMMON_MINTS);
  await fetchMultipleTokenPrices(commonMints);
}
