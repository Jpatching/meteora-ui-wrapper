/**
 * Token Metadata Service
 * Fetches token metadata from multiple sources with Redis caching
 *
 * Data sources (in priority order):
 * 1. Built-in common tokens (SOL, USDC, USDT) - instant
 * 2. Jupiter Token API v2 Search (30k+ tokens, search by mint address) - PRIMARY
 * 3. SolanaFM API (fallback for tokens not in Jupiter)
 * 4. Fallback to UNKNOWN (but cache separately to avoid repeated lookups)
 *
 * NOTE: Pool data comes from Meteora official APIs:
 * - DLMM: https://dlmm-api.meteora.ag/pair/all
 * - DAMM v2: https://dammv2-api.meteora.ag/pools
 * Token metadata is ONLY used to enrich with logos/icons, NOT for symbols
 */

import { redis, getCached, setCached } from '../config/redis';

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  logoURI?: string;
  verified?: boolean;
}

// Cache token metadata for 7 days (tokens don't change often)
const TOKEN_METADATA_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// Cache UNKNOWN tokens for only 1 hour (in case they get indexed later)
const UNKNOWN_TOKEN_TTL = 60 * 60; // 1 hour

// Common tokens with hardcoded metadata for instant lookups
const COMMON_TOKENS: Record<string, TokenMetadata> = {
  'So11111111111111111111111111111111111111112': {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    verified: true,
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    verified: true,
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
    verified: true,
  },
};

/**
 * Fetch token metadata from Jupiter Token API v2 Search
 * Uses direct token address search - more reliable than downloading full list
 */
async function fetchFromJupiter(address: string): Promise<TokenMetadata | null> {
  try {
    // Use AbortController for Node.js compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    let response;
    try {
      // Jupiter v2 API - search by exact mint address
      response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${address}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    if (!response.ok) {
      return null;
    }

    const tokens = await response.json();

    // Search returns array - find exact match
    const token = tokens.find((t: any) => t.id === address);

    if (!token) {
      return null;
    }

    console.log(`✅ Found ${token.symbol} in Jupiter`);

    return {
      address: token.id,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.icon,
      verified: token.isVerified || token.tags?.includes('verified') || token.tags?.includes('community'),
    };
  } catch (error: any) {
    console.warn(`⚠️ Failed to fetch metadata for ${address} from Jupiter:`, error.message);
    return null;
  }
}

/**
 * Fetch token metadata from SolanaFM API
 */
async function fetchFromSolanaFM(address: string): Promise<TokenMetadata | null> {
  try {
    // Use AbortController for Node.js compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    let response;
    try {
      response = await fetch(`https://api.solana.fm/v1/tokens/${address}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Extract metadata from response
    const symbol = data.tokenList?.symbol || data.tokenMetadata?.onChainInfo?.symbol || null;
    const name = data.tokenList?.name || data.tokenMetadata?.onChainInfo?.name || null;
    const logoURI = data.tokenList?.image;

    // Only return if we got real data (not UNKNOWN)
    if (!symbol || !name) {
      return null;
    }

    return {
      address,
      symbol,
      name,
      decimals: data.decimals,
      logoURI,
      verified: !!data.tokenList,
    };
  } catch (error: any) {
    console.warn(`⚠️ Failed to fetch metadata for ${address} from SolanaFM:`, error.message);
    return null;
  }
}

/**
 * Get token metadata with multi-layer caching and fallback chain
 */
export async function getTokenMetadata(address: string): Promise<TokenMetadata | null> {
  // 1. Check common tokens first (instant)
  if (COMMON_TOKENS[address]) {
    return COMMON_TOKENS[address];
  }

  // 2. Check Redis cache
  const cacheKey = `token:metadata:${address}`;
  const cached = await getCached<TokenMetadata>(cacheKey);
  if (cached) {
    return cached;
  }

  // 3. Try Jupiter Token API (PRIMARY - 30k+ tokens)
  let metadata = await fetchFromJupiter(address);
  if (metadata) {
    await setCached(cacheKey, metadata, TOKEN_METADATA_TTL);
    console.log(`✅ Found ${metadata.symbol} in Jupiter`);
    return metadata;
  }

  // 4. Fallback to SolanaFM
  metadata = await fetchFromSolanaFM(address);
  if (metadata) {
    await setCached(cacheKey, metadata, TOKEN_METADATA_TTL);
    console.log(`✅ Found ${metadata.symbol} in SolanaFM`);
    return metadata;
  }

  // 5. Cache UNKNOWN result with shorter TTL (1 hour instead of 7 days)
  // This allows tokens to be re-fetched if they get indexed later
  const fallback: TokenMetadata = {
    address,
    symbol: 'UNKNOWN',
    name: 'Unknown Token',
    verified: false,
  };
  await setCached(cacheKey, fallback, UNKNOWN_TOKEN_TTL);
  console.warn(`⚠️ Token ${address} not found in any source`);

  return null;
}

/**
 * Get multiple token metadata in parallel
 */
export async function getMultipleTokenMetadata(
  addresses: string[]
): Promise<Map<string, TokenMetadata>> {
  // Fetch all in parallel
  const results = await Promise.all(
    addresses.map(addr => getTokenMetadata(addr))
  );

  // Build map
  const metadataMap = new Map<string, TokenMetadata>();
  addresses.forEach((addr, idx) => {
    const metadata = results[idx];
    if (metadata) {
      metadataMap.set(addr, metadata);
    }
  });

  return metadataMap;
}

/**
 * Prefetch token metadata for a list of pools
 * Call this after syncing pools to warm the cache
 */
export async function prefetchPoolTokenMetadata(pools: any[]): Promise<void> {
  // Collect all unique token addresses
  const addresses = new Set<string>();

  pools.forEach(pool => {
    if (pool.mint_x) addresses.add(pool.mint_x);
    if (pool.mint_y) addresses.add(pool.mint_y);
    if (pool.token_a_mint) addresses.add(pool.token_a_mint);
    if (pool.token_b_mint) addresses.add(pool.token_b_mint);
    if (pool.base_mint) addresses.add(pool.base_mint);
    if (pool.quote_mint) addresses.add(pool.quote_mint);
  });

  console.log(`🔥 Prefetching metadata for ${addresses.size} unique tokens...`);

  // Fetch in batches of 50 to avoid overwhelming the API
  const addressArray = Array.from(addresses);
  const batchSize = 50;
  let fetched = 0;

  for (let i = 0; i < addressArray.length; i += batchSize) {
    const batch = addressArray.slice(i, i + batchSize);
    await getMultipleTokenMetadata(batch);
    fetched += batch.length;
    console.log(`  Progress: ${fetched}/${addressArray.length} tokens`);
  }

  console.log(`✅ Prefetch complete: ${fetched} tokens cached`);
}
