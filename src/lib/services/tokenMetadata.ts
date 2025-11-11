/**
 * Token Metadata Service
 * Fetches token metadata from BACKEND API (cached in Redis)
 * Backend uses SolanaFM API for reliable, fast token data
 */

interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
  logoURI?: string;
  verified?: boolean;
}

// Cache for token metadata (in-memory for O(1) lookups)
const metadataCache = new Map<string, TokenMetadata>();

// Backend API endpoint - fallback to production if env not set
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alsk-production.up.railway.app';

/**
 * Resolve IPFS URLs to accessible HTTP URLs with fallback gateways
 * Prioritizes reliable public gateways over unreachable storage links
 */
function resolveIPFSUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // Extract IPFS CID from various formats
  let cid: string | null = null;

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    cid = url.replace('ipfs://', '');
  }
  // Handle nftstorage.link URLs (extract CID before subdomain)
  else if (url.includes('.ipfs.nftstorage.link')) {
    const match = url.match(/https?:\/\/([a-zA-Z0-9]+)\.ipfs\.nftstorage\.link/);
    if (match && match[1]) {
      cid = match[1];
      console.log(`📦 Converting unreachable nftstorage.link to public gateway: ${cid}`);
    } else {
      console.warn(`⚠️ Skipping malformed IPFS storage URL: ${url}`);
      return undefined;
    }
  }
  // Handle w3s.link URLs
  else if (url.includes('.ipfs.w3s.link')) {
    const match = url.match(/https?:\/\/([a-zA-Z0-9]+)\.ipfs\.w3s\.link/);
    if (match && match[1]) {
      cid = match[1];
      console.log(`📦 Converting w3s.link to public gateway: ${cid}`);
    }
  }
  // Handle cloudflare-ipfs.com URLs
  else if (url.includes('cloudflare-ipfs.com')) {
    return url; // Cloudflare gateway is reliable, keep as-is
  }
  // Handle ipfs.io URLs
  else if (url.includes('ipfs.io')) {
    return url; // Public gateway is reliable, keep as-is
  }
  // Already a regular HTTP(S) URL
  else {
    return url;
  }

  // If we extracted a CID, use reliable public gateway
  if (cid) {
    // Use Cloudflare's IPFS gateway (fast and reliable)
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  return url;
}

/**
 * Fetch token metadata from backend API
 */
async function fetchTokenFromBackend(address: string): Promise<TokenMetadata | null> {
  try {
    // Use AbortController for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    let response;
    try {
      response = await fetch(`${BACKEND_URL}/api/tokens/${address}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }

    return null;
  } catch (error: any) {
    console.warn(`⚠️ Failed to fetch metadata for ${address}:`, error.message);
    return null;
  }
}

/**
 * Get token metadata from backend API (cached in Redis)
 */
export async function getTokenMetadata(address: string): Promise<TokenMetadata | null> {
  const addressLower = address.toLowerCase();

  // Check memory cache first (fastest)
  if (metadataCache.has(addressLower)) {
    return metadataCache.get(addressLower) || null;
  }

  // Fetch from backend (which checks Redis cache first)
  const metadata = await fetchTokenFromBackend(address);

  if (metadata) {
    // Resolve IPFS URLs to accessible URLs
    if (metadata.logoURI) {
      metadata.logoURI = resolveIPFSUrl(metadata.logoURI);
    }

    metadataCache.set(addressLower, metadata);
    return metadata;
  }

  return null;
}

/**
 * Get multiple token metadata in parallel using batch API
 */
export async function getMultipleTokenMetadata(
  addresses: string[]
): Promise<Map<string, TokenMetadata>> {
  try {
    // Use AbortController for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for batch

    let response;
    try {
      response = await fetch(`${BACKEND_URL}/api/tokens/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`Batch API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      const metadataMap = new Map<string, TokenMetadata>();

      // Cache all results
      Object.entries(result.data).forEach(([address, metadata]) => {
        const meta = metadata as TokenMetadata;
        metadataMap.set(address, meta);
        metadataCache.set(address.toLowerCase(), meta);
      });

      console.log(`✅ Fetched metadata for ${metadataMap.size} tokens`);
      return metadataMap;
    }

    return new Map();
  } catch (error: any) {
    console.error('❌ Batch metadata fetch failed:', error.message);

    // Fallback: Fetch individually
    console.log('⚠️ Falling back to individual fetches...');
    const results = await Promise.all(
      addresses.map(addr => getTokenMetadata(addr))
    );

    const metadataMap = new Map<string, TokenMetadata>();
    addresses.forEach((addr, idx) => {
      const metadata = results[idx];
      if (metadata) {
        metadataMap.set(addr, metadata);
      }
    });

    return metadataMap;
  }
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
      // Only enrich icon/logo - preserve symbol and name from backend
      icon: baseMetadata?.logoURI || pool.baseAsset.icon,
      decimals: baseMetadata?.decimals || pool.baseAsset.decimals,
      verified: baseMetadata?.verified || false,
    },
    quoteAsset: pool.quoteAsset ? {
      ...pool.quoteAsset,
      // Only enrich icon/logo - preserve symbol and name from backend
      icon: quoteMetadata?.logoURI || pool.quoteAsset.icon,
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

  // Load all metadata at once - GRACEFULLY handle failures
  try {
    await getMultipleTokenMetadata(Array.from(addresses));
  } catch (error) {
    console.warn('⚠️ Metadata batch fetch failed, pools will show without icons:', error);
    // Continue anyway - pools already have symbol/name from backend
  }

  // Enrich all pools (enrichPoolWithMetadata handles missing metadata gracefully)
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
 * Export TokenMetadata type for use in other modules
 */
export type { TokenMetadata };
