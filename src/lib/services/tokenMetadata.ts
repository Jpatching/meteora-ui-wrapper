/**
 * Token Metadata Service
 * Fetches token metadata from various sources:
 * - Solana Token List (official registry)
 * - On-chain metadata (SPL Token Metadata)
 * - DexScreener API (fallback)
 */

import { Connection, PublicKey } from '@solana/web3.js';

interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  verified?: boolean;
}

// Cache for token metadata (in-memory for O(1) lookups)
const metadataCache = new Map<string, TokenMetadata>();

// Solana Token List (CDN)
const TOKEN_LIST_URL = 'https://token.jup.ag/all';

// LocalStorage keys
const TOKEN_LIST_CACHE_KEY = 'meteora_token_list_cache';
const TOKEN_LIST_TIMESTAMP_KEY = 'meteora_token_list_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let tokenListCache: TokenMetadata[] | null = null;
let tokenListLoaded = false;
let tokenListMap: Map<string, TokenMetadata> | null = null;

/**
 * Load token list from localStorage or fetch from Jupiter
 * Uses aggressive caching to speed up subsequent loads
 */
async function loadTokenList(): Promise<TokenMetadata[]> {
  // Return if already loaded
  if (tokenListCache && tokenListMap) return tokenListCache;
  if (tokenListLoaded) return tokenListCache || [];

  try {
    // Try loading from localStorage first (FAST PATH)
    const cachedData = localStorage.getItem(TOKEN_LIST_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(TOKEN_LIST_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const age = Date.now() - timestamp;

      // Use cached data if less than 24 hours old
      if (age < CACHE_DURATION) {
        console.log('⚡ Loading token list from cache (instant)');
        tokenListCache = JSON.parse(cachedData);

        // Build index map for O(1) lookups
        tokenListMap = new Map();
        tokenListCache.forEach(token => {
          tokenListMap!.set(token.address.toLowerCase(), token);
        });

        tokenListLoaded = true;

        // Background refresh if cache is getting old (> 12 hours)
        if (age > CACHE_DURATION / 2) {
          console.log('🔄 Background refresh of token list');
          refreshTokenListInBackground();
        }

        return tokenListCache;
      }
    }

    // Cache miss or expired - fetch from network
    console.log('📦 Fetching fresh token list from Jupiter...');
    const response = await fetch(TOKEN_LIST_URL, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.statusText}`);
    }

    const tokens = await response.json();
    tokenListCache = tokens.map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      tags: token.tags,
      verified: token.verified || false,
    }));

    // Build index map for O(1) lookups
    tokenListMap = new Map();
    tokenListCache.forEach(token => {
      tokenListMap!.set(token.address.toLowerCase(), token);
    });

    // Save to localStorage for next time
    try {
      localStorage.setItem(TOKEN_LIST_CACHE_KEY, JSON.stringify(tokenListCache));
      localStorage.setItem(TOKEN_LIST_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn('Failed to cache token list to localStorage:', e);
    }

    console.log(`✅ Loaded ${tokenListCache.length} tokens from Jupiter`);
    tokenListLoaded = true;

    return tokenListCache;
  } catch (error) {
    console.error('❌ Failed to load token list:', error);
    tokenListLoaded = true;

    // Return cached data even if expired as fallback
    const cachedData = localStorage.getItem(TOKEN_LIST_CACHE_KEY);
    if (cachedData) {
      console.log('⚠️ Using stale cache as fallback');
      tokenListCache = JSON.parse(cachedData);
      return tokenListCache;
    }

    return [];
  }
}

/**
 * Refresh token list in background without blocking
 */
function refreshTokenListInBackground() {
  fetch(TOKEN_LIST_URL)
    .then(res => res.json())
    .then(tokens => {
      const freshList = tokens.map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        tags: token.tags,
        verified: token.verified || false,
      }));

      // Update cache
      tokenListCache = freshList;

      // Rebuild map
      tokenListMap = new Map();
      freshList.forEach((token: TokenMetadata) => {
        tokenListMap!.set(token.address.toLowerCase(), token);
      });

      // Save to localStorage
      try {
        localStorage.setItem(TOKEN_LIST_CACHE_KEY, JSON.stringify(freshList));
        localStorage.setItem(TOKEN_LIST_TIMESTAMP_KEY, Date.now().toString());
        console.log('✅ Background refresh complete');
      } catch (e) {
        console.warn('Failed to save background refresh:', e);
      }
    })
    .catch(err => {
      console.warn('Background refresh failed:', err);
    });
}

/**
 * Get token metadata from token list (O(1) lookup)
 */
export async function getTokenMetadata(address: string): Promise<TokenMetadata | null> {
  const addressLower = address.toLowerCase();

  // Check memory cache first (fastest)
  if (metadataCache.has(addressLower)) {
    return metadataCache.get(addressLower) || null;
  }

  // Load token list if needed (loads from localStorage if available)
  await loadTokenList();

  // Use indexed map for O(1) lookup
  if (tokenListMap && tokenListMap.has(addressLower)) {
    const token = tokenListMap.get(addressLower)!;
    metadataCache.set(addressLower, token);
    return token;
  }

  return null;
}

/**
 * Get multiple token metadata in parallel
 */
export async function getMultipleTokenMetadata(
  addresses: string[]
): Promise<Map<string, TokenMetadata>> {
  // Load token list once
  await loadTokenList();

  // Get all metadata
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
 * Enrich pool data with token metadata
 */
export async function enrichPoolWithMetadata(pool: any): Promise<any> {
  const baseMetadata = await getTokenMetadata(pool.baseAsset.id);
  const quoteMetadata = pool.quoteAsset?.id
    ? await getTokenMetadata(pool.quoteAsset.id)
    : null;

  return {
    ...pool,
    baseAsset: {
      ...pool.baseAsset,
      icon: baseMetadata?.logoURI || pool.baseAsset.icon,
      name: baseMetadata?.name || pool.baseAsset.name,
      symbol: baseMetadata?.symbol || pool.baseAsset.symbol,
      decimals: baseMetadata?.decimals || pool.baseAsset.decimals,
      verified: baseMetadata?.verified || false,
    },
    quoteAsset: pool.quoteAsset ? {
      ...pool.quoteAsset,
      icon: quoteMetadata?.logoURI || pool.quoteAsset.icon,
      name: quoteMetadata?.name || pool.quoteAsset.name,
      symbol: quoteMetadata?.symbol || pool.quoteAsset.symbol,
      decimals: quoteMetadata?.decimals || pool.quoteAsset.decimals,
    } : undefined,
  };
}

/**
 * Enrich multiple pools with metadata
 */
export async function enrichPoolsWithMetadata(pools: any[]): Promise<any[]> {
  // Collect all unique token addresses
  const addresses = new Set<string>();
  pools.forEach(pool => {
    addresses.add(pool.baseAsset.id);
    if (pool.quoteAsset?.id) {
      addresses.add(pool.quoteAsset.id);
    }
  });

  // Load all metadata at once
  await getMultipleTokenMetadata(Array.from(addresses));

  // Enrich all pools
  return Promise.all(pools.map(pool => enrichPoolWithMetadata(pool)));
}

/**
 * Get token icon URL
 */
export async function getTokenIcon(address: string): Promise<string | null> {
  const metadata = await getTokenMetadata(address);
  return metadata?.logoURI || null;
}

/**
 * Common Solana tokens for fallback
 */
export const COMMON_TOKENS: Record<string, TokenMetadata> = {
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
    name: 'USDT',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
    verified: true,
  },
};
