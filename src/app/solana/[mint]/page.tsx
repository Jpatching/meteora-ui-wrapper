/**
 * Token Detail Page - Comprehensive analytics with AI features
 * URL: /solana/{mint} (matches charting.ag pattern)
 * Three-column layout: Token Info | Chart + Analytics | Trading + AI
 */

'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ChartDetailsPanel } from '@/components/dashboard/ChartDetailsPanel';
import { TokenInfoSidebar } from '@/components/pool/TokenInfoSidebar';
import { PoolActionsPanel } from '@/components/pool/PoolActionsPanel';
import { UserPositionsPanel } from '@/components/pool/UserPositionsPanel';
import { PoolListSidebar } from '@/components/pool/PoolListSidebar';
import { LiquidityDistributionPanel } from '@/components/pool/LiquidityDistributionPanel';
import { useBackendPool } from '@/lib/hooks/useBackendPools';
import { useNetwork } from '@/contexts/NetworkContext';
import { Pool } from '@/lib/jupiter/types';
import { enrichPoolWithMetadata } from '@/lib/services/tokenMetadata';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';

interface TokenPageProps {
  params: Promise<{ mint: string }>;
}

export default function TokenPage({ params }: TokenPageProps) {
  const resolvedParams = use(params);
  const { mint } = resolvedParams;
  const router = useRouter();
  const { network } = useNetwork();
  const searchParams = useSearchParams();

  // Get pool address from query parameter (optional)
  const poolAddressParam = searchParams.get('pool');

  // State for token pools fetched from backend
  const [tokenPools, setTokenPools] = useState<any[]>([]);
  const [isLoadingTokenPools, setIsLoadingTokenPools] = useState(true);

  // Fetch pools for this token from backend API (searches by token mint)
  useEffect(() => {
    const fetchTokenPools = async () => {
      setIsLoadingTokenPools(true);
      try {
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${mint}&network=${network}&limit=100`
        );
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          console.log(`✅ Found ${data.data.length} pools for token ${mint}`);

          // Filter pools where our token is actually one of the pair tokens
          const relevantPools = data.data.filter((pool: any) =>
            pool.token_x_mint === mint || pool.token_y_mint === mint
          );

          console.log(`📊 ${relevantPools.length} pools contain token ${mint}`);

          // Transform backend pools to our Pool format
          // IMPORTANT: Ensure our token is always the baseAsset
          const pools = relevantPools.map((pool: any) => {
            const isTokenX = pool.token_x_mint === mint;

            return {
              id: pool.pool_address,
              type: pool.protocol === 'dlmm' ? 'dlmm' : 'damm-v2',
              baseAsset: {
                id: isTokenX ? pool.token_x_mint : pool.token_y_mint,
                symbol: isTokenX ? (pool.token_x_symbol || 'UNKNOWN') : (pool.token_y_symbol || 'UNKNOWN'),
                name: isTokenX ? (pool.token_x_name || 'Unknown Token') : (pool.token_y_name || 'Unknown Token'),
                icon: isTokenX ? (pool.token_x_logo || '') : (pool.token_y_logo || ''),
                liquidity: isTokenX ? (pool.token_x_reserve || 0) : (pool.token_y_reserve || 0),
                usdPrice: isTokenX ? (pool.token_x_price || 0) : (pool.token_y_price || 0),
              },
              quoteAsset: {
                id: isTokenX ? pool.token_y_mint : pool.token_x_mint,
                symbol: isTokenX ? (pool.token_y_symbol || 'UNKNOWN') : (pool.token_x_symbol || 'UNKNOWN'),
                icon: isTokenX ? (pool.token_y_logo || '') : (pool.token_x_logo || ''),
                name: isTokenX ? (pool.token_y_name || 'Unknown') : (pool.token_x_name || 'Unknown'),
              },
              volume24h: pool.volume_24h || 0,
              tvl: pool.tvl || 0,
            };
          });

          setTokenPools(pools);
        } else {
          console.log(`⚠️ No pools found for token ${mint}`);
          setTokenPools([]);
        }
      } catch (error) {
        console.error('Failed to fetch token pools:', error);
        setTokenPools([]);
      } finally {
        setIsLoadingTokenPools(false);
      }
    };

    fetchTokenPools();
  }, [mint, network]);

  // Determine which pool to use
  const primaryPool = tokenPools.length > 0
    ? tokenPools.sort((a: any, b: any) => (b.volume24h || 0) - (a.volume24h || 0))[0]
    : null;

  const poolAddress = poolAddressParam || primaryPool?.id || null;

  // Fetch pool from unified backend endpoint with network filtering (only if pool exists)
  const { data: rawPool, isLoading: isLoadingPool, error } = useBackendPool(poolAddress, network);

  const isLoading = isLoadingTokenPools || isLoadingPool;

  // State for enriched pool with token metadata
  const [pool, setPool] = useState<Pool | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [enriching, setEnriching] = useState(false);

  // Fetch token metadata from Jupiter (for tokens without pools)
  useEffect(() => {
    if (!rawPool && !isLoadingAllPools && mint) {
      // Token has no pools, fetch metadata from Jupiter token list
      fetch(`https://tokens.jup.ag/token/${mint}`)
        .then(res => res.json())
        .then(data => {
          setTokenInfo({
            address: mint,
            symbol: data.symbol || 'UNKNOWN',
            name: data.name || 'Unknown Token',
            icon: data.logoURI || '',
            decimals: data.decimals || 9,
          });
        })
        .catch(err => {
          console.error('Failed to fetch token metadata:', err);
          // Fallback token info
          setTokenInfo({
            address: mint,
            symbol: 'TOKEN',
            name: 'Unknown Token',
            icon: '',
            decimals: 9,
          });
        });
    }
  }, [rawPool, isLoadingAllPools, mint]);

  // Enrich pool with token metadata (logos, etc.) when pool exists
  useEffect(() => {
    if (rawPool && !enriching) {
      setEnriching(true);
      enrichPoolWithMetadata(rawPool)
        .then(enriched => {
          setPool(enriched);
          setEnriching(false);
        })
        .catch(err => {
          console.error('Failed to enrich pool metadata:', err);
          setPool(rawPool); // Use raw pool if enrichment fails
          setEnriching(false);
        });
    }
  }, [rawPool]);

  // Handle loading state
  if (isLoading && !pool && !tokenInfo) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading token details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Derive display data - ALWAYS show chart, create minimal pool if needed
  const displayToken = pool?.baseAsset || tokenInfo;
  const hasMeteoraPool = !!pool;

  // If no Meteora pool exists, create a minimal pool object for chart display
  const chartPool = pool || (tokenInfo ? {
    id: mint, // Use token mint as pool ID
    type: 'unknown' as any,
    baseAsset: {
      id: tokenInfo.address,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      icon: tokenInfo.icon,
      usdPrice: 0,
      liquidity: 0,
    },
    quoteAsset: {
      id: 'So11111111111111111111111111111111111111112', // SOL
      symbol: 'SOL',
      icon: '',
    },
    volume24h: 0,
    tvl: 0,
  } : null);

  if (!displayToken || !chartPool) {
    return null; // Should never happen, but TypeScript safety
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Top Bar - Token Info + Price Changes (Charting.ag Style) */}
        <div className="flex-shrink-0 border-b border-border-light">
          {/* Token Header with Metadata & Social Links */}
          <div className="px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Token Icons + Name */}
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-1">
                  {displayToken.icon && (
                    <img src={displayToken.icon} alt={displayToken.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                  )}
                  {pool?.quoteAsset?.icon && (
                    <img src={pool.quoteAsset.icon} alt={pool.quoteAsset.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{displayToken.symbol}</h1>
                  <p className="text-[10px] text-gray-500">{(displayToken.id || displayToken.address).slice(0, 8)}...{(displayToken.id || displayToken.address).slice(-6)}</p>
                </div>
              </div>

              {/* Metadata Tile */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-background-secondary/30 rounded-lg border border-border-light">
                {displayToken.name && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Name:</span>
                    <span className="text-xs font-medium text-white">{displayToken.name}</span>
                  </div>
                )}
                {pool?.type && (
                  <>
                    <div className="h-3 w-px bg-border-light"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Type:</span>
                      <span className={`text-xs font-bold uppercase ${
                        pool.type === 'dlmm' ? 'text-purple-400' : 'text-blue-400'
                      }`}>
                        {pool.type === 'dlmm' ? 'DLMM' : 'DYN2'}
                      </span>
                    </div>
                  </>
                )}
                {!hasMeteoraPool && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-yellow-400">⚠️ No Meteora Pools Yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links Tile */}
            {(displayToken.twitter || displayToken.telegram || displayToken.website) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background-secondary/30 rounded-lg border border-border-light">
                <span className="text-[10px] text-gray-400 mr-1">Links:</span>
                {displayToken.twitter && (
                  <a
                    href={displayToken.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                    title="Twitter"
                  >
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {displayToken.telegram && (
                  <a
                    href={displayToken.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                    title="Telegram"
                  >
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </a>
                )}
                {displayToken.website && (
                  <a
                    href={displayToken.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                    title="Website"
                  >
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Price Changes & Volume Changes (Charting.ag Style) */}
          <div className="px-4 pb-3 flex items-center gap-8">
            <div>
              <div className="text-xs text-gray-400 mb-1">Price Changes</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">5M</div>
                  <div className="text-xs font-semibold text-success">+1.1%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">1H</div>
                  <div className="text-xs font-semibold text-success">+5.1%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">6H</div>
                  <div className="text-xs font-semibold text-success">+5.8%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">24H</div>
                  <div className="text-xs font-semibold text-error">-5.6%</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Volume Changes</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">5M</div>
                  <div className="text-xs font-semibold text-success">+81.3%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">1H</div>
                  <div className="text-xs font-semibold text-success">+157.4%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">6H</div>
                  <div className="text-xs font-semibold text-success">+162.5%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500">24H</div>
                  <div className="text-xs font-semibold text-error">-5.1%</div>
                </div>
              </div>
            </div>

            {/* Key Metrics - Inline */}
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Price</div>
                <div className="text-sm font-bold text-white">${(pool?.baseAsset.usdPrice || 0).toFixed(4)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">24h Vol</div>
                <div className="text-sm font-bold text-white">${((pool?.volume24h || 0) / 1000).toFixed(1)}K</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">MCap</div>
                <div className="text-sm font-bold text-white">${((pool?.baseAsset.liquidity || 0) / 1000).toFixed(0)}K</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Liquidity</div>
                <div className="text-sm font-bold text-white">${((pool?.baseAsset.liquidity || 0) / 1000).toFixed(1)}K</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: 3-Column Layout - ALWAYS show chart */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar (280px) - Related Pools List or Create Pool CTA */}
          <div className="w-[280px] flex-shrink-0 border-r border-border-light overflow-hidden">
            {hasMeteoraPool ? (
              <PoolListSidebar currentPool={pool} network={network} />
            ) : (
              <div className="p-4 flex flex-col h-full">
                <h3 className="text-sm font-semibold text-white mb-3">No Meteora Pools Yet</h3>
                <p className="text-xs text-text-secondary mb-4">
                  Be the first to create a liquidity pool for {displayToken.symbol}!
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/dlmm/create-pool?tokenMint=${mint}`}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-sm text-center"
                  >
                    🚀 Create DLMM Pool
                  </Link>
                  <Link
                    href={`/damm-v2/create-balanced?tokenMint=${mint}`}
                    className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 transition-colors text-sm text-center"
                  >
                    ⚡ Create DAMM Pool
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Center: Chart (dominates) + Positions (if pool exists) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">
            {/* Chart - Always shown */}
            <div className={hasMeteoraPool ? "flex-[3] overflow-hidden min-h-0" : "flex-1 overflow-hidden min-h-0"}>
              <ChartDetailsPanel pool={chartPool} />
            </div>

            {/* Active Positions - Only if Meteora pool exists */}
            {hasMeteoraPool && pool && (
              <div className="flex-[1] min-h-[180px] max-h-[280px] flex-shrink-0 border-t border-border-light overflow-hidden">
                <UserPositionsPanel
                  poolAddress={pool.id}
                  poolType={pool.type}
                  tokenXSymbol={pool.baseAsset.symbol}
                  tokenYSymbol={pool.quoteAsset?.symbol || 'USDC'}
                />
              </div>
            )}
          </div>

          {/* Right Sidebar (400px) - Always show trading panel */}
          <div className="w-[400px] flex-shrink-0 border-l border-border-light overflow-y-auto bg-background">
            {/* Pool Actions Panel - Always shown */}
            <div className="flex-shrink-0">
              <PoolActionsPanel
                poolAddress={pool?.id || mint}
                tokenXMint={displayToken.id || displayToken.address}
                tokenYMint={pool?.quoteAsset?.id || 'So11111111111111111111111111111111111111112'}
                tokenXSymbol={displayToken.symbol}
                tokenYSymbol={pool?.quoteAsset?.symbol || 'SOL'}
                currentPrice={displayToken.usdPrice || 0}
                binStep={(pool as any)?.binStep || 20}
                baseFee={(pool as any)?.baseFee || 0.2}
                poolType={pool?.type || 'unknown'}
              />
            </div>

            {/* Liquidity Distribution - Only if Meteora pool exists */}
            {hasMeteoraPool && pool && (
              <div className="flex-shrink-0 mt-2">
                <LiquidityDistributionPanel pool={pool} />
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
