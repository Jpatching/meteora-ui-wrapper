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
import toast from 'react-hot-toast';
import { formatNumber } from '@/lib/format/number';

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

  // Fetch Jupiter pools to get audit data (holders, top10, dev%, mint, freeze, score)
  const { data: jupiterData, isLoading: isLoadingJupiter } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: false,
  });

  // Fetch pools for this token from backend API (searches by token mint)
  useEffect(() => {
    const fetchTokenPools = async () => {
      setIsLoadingTokenPools(true);
      try {
        const response = await fetch(
          `https://alsk-production.up.railway.app/api/pools/search?q=${mint}&network=${network}&limit=1000`
        );
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          console.log(`✅ Found ${data.data.length} pools for token ${mint}`);

          // Filter pools where our token is actually one of the pair tokens
          const relevantPools = data.data.filter((pool: any) =>
            pool.token_a_mint === mint || pool.token_b_mint === mint
          );

          console.log(`📊 ${relevantPools.length} pools contain token ${mint}`);

          // Transform backend pools to our Pool format
          // IMPORTANT: Ensure our token is always the baseAsset
          const pools = relevantPools.map((pool: any) => {
            const isTokenA = pool.token_a_mint === mint;

            return {
              id: pool.pool_address,
              type: pool.protocol === 'dlmm' ? 'dlmm' : 'damm-v2',
              baseAsset: {
                id: isTokenA ? pool.token_a_mint : pool.token_b_mint,
                symbol: isTokenA ? (pool.token_a_symbol || 'UNKNOWN') : (pool.token_b_symbol || 'UNKNOWN'),
                name: isTokenA ? (pool.token_a_name || 'Unknown Token') : (pool.token_b_name || 'Unknown Token'),
                icon: '', // Will be enriched later
                liquidity: 0, // Not directly available
                usdPrice: 0, // Not directly available
              },
              quoteAsset: {
                id: isTokenA ? pool.token_b_mint : pool.token_a_mint,
                symbol: isTokenA ? (pool.token_b_symbol || 'UNKNOWN') : (pool.token_a_symbol || 'UNKNOWN'),
                icon: '', // Will be enriched later
                name: isTokenA ? (pool.token_b_name || 'Unknown') : (pool.token_a_name || 'Unknown'),
              },
              volume24h: typeof pool.volume_24h === 'string' ? parseFloat(pool.volume_24h) : pool.volume_24h || 0,
              tvl: typeof pool.tvl === 'string' ? parseFloat(pool.tvl) : pool.tvl || 0,
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

  // State for pool and token info
  const [pool, setPool] = useState<Pool | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null); // Selected pool from sidebar
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [holderMetrics, setHolderMetrics] = useState<{
    topHoldersPercentage: number;
    devBalancePercentage: number;
  } | null>(null);
  const [jupiterTokenData, setJupiterTokenData] = useState<any>(null);

  // Fetch token info and holder data from Jupiter API
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        // Fetch token info which includes dev wallet and topHoldersPercentage
        const tokenInfoResponse = await fetch(`https://datapi.jup.ag/v1/pools?assetIds=${mint}`);
        const tokenInfoData = await tokenInfoResponse.json();

        if (tokenInfoData.pools && tokenInfoData.pools.length > 0) {
          const tokenData = tokenInfoData.pools[0].baseAsset;
          setJupiterTokenData(tokenData); // Store for direct access to all metrics

          console.log('📊 Jupiter token data:', {
            dev: tokenData.dev,
            topHoldersPercentage: tokenData.audit?.topHoldersPercentage,
            holderCount: tokenData.holderCount,
            mintAuthority: tokenData.mintAuthority,
            freezeAuthority: tokenData.audit?.freezeAuthorityDisabled,
            organicScore: tokenData.organicScore,
          });

          // Jupiter already provides topHoldersPercentage in audit object
          const topHoldersPercentage = tokenData.audit?.topHoldersPercentage;

          // Now fetch holder data to find dev wallet balance
          const holdersResponse = await fetch(`https://datapi.jup.ag/v1/holders/${mint}`);
          const holdersData = await holdersResponse.json();

          if (holdersData.holders && holdersData.holders.length > 0 && tokenData.dev) {
            console.log(`📊 Fetched ${holdersData.holders.length} holders`);

            // Find the dev wallet in holder list
            const devHolder = holdersData.holders.find((h: any) => h.address === tokenData.dev);

            if (devHolder) {
              // Calculate total supply from all holders
              const totalSupply = holdersData.holders.reduce((sum: number, h: any) => sum + h.amount, 0);
              const devPercentage = (devHolder.amount / totalSupply) * 100;

              setHolderMetrics({
                topHoldersPercentage: topHoldersPercentage || 0,
                devBalancePercentage: devPercentage,
              });

              console.log('✅ Holder metrics loaded:', {
                topHoldersPercentage: topHoldersPercentage?.toFixed(2) + '%',
                devBalancePercentage: devPercentage.toFixed(2) + '%',
                devWallet: tokenData.dev,
              });
            } else {
              // Dev wallet not in top 100 holders - likely low holdings
              setHolderMetrics({
                topHoldersPercentage: topHoldersPercentage || 0,
                devBalancePercentage: 0,
              });
              console.log('⚠️ Dev wallet not in top 100 holders - likely sold out');
            }
          } else if (topHoldersPercentage) {
            // We have topHolders but no dev data
            setHolderMetrics({
              topHoldersPercentage,
              devBalancePercentage: 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch token data:', error);
      }
    };

    fetchTokenData();
  }, [mint]);

  // Find Jupiter pool for this token to get audit data
  const jupiterPool = useMemo(() => {
    if (!jupiterData) {
      console.log('⚠️ No Jupiter data available yet');
      return null;
    }

    const allPools = [
      ...(jupiterData.recent?.pools || []),
      ...(jupiterData.aboutToGraduate?.pools || []),
      ...(jupiterData.graduated?.pools || []),
    ];

    console.log(`🔍 Searching for token ${mint} in ${allPools.length} Jupiter pools`);

    // Find pool where our token is the base asset
    const foundPool = allPools.find(p => p.baseAsset.id === mint);

    if (foundPool) {
      console.log('✅ Found Jupiter pool with audit data:', {
        holderCount: (foundPool.baseAsset as any)?.holderCount,
        topHolders: (foundPool.baseAsset as any)?.audit?.topHoldersPercentage,
        devHoldings: (foundPool.baseAsset as any)?.audit?.devBalancePercentage,
        mintDisabled: (foundPool.baseAsset as any)?.audit?.mintAuthorityDisabled,
        freezeDisabled: (foundPool.baseAsset as any)?.audit?.freezeAuthorityDisabled,
        organicScore: (foundPool.baseAsset as any)?.organicScore,
      });
    } else {
      console.log(`⚠️ Token ${mint} not found in Jupiter pools`);
    }

    return foundPool || null;
  }, [jupiterData, mint]);

  // Handle pool selection and enrichment
  useEffect(() => {
    if (!isLoadingTokenPools) {
      if (rawPool) {
        // We have a Meteora pool - enrich it with metadata AND Jupiter audit data
        enrichPoolWithMetadata(rawPool)
          .then(enriched => {
            // If we have Jupiter pool data, merge the audit info into our pool
            if (jupiterPool) {
              console.log('🔗 Merging Jupiter audit data into pool', {
                holderCount: (jupiterPool.baseAsset as any)?.holderCount,
                organicScore: (jupiterPool.baseAsset as any)?.organicScore,
                audit: (jupiterPool.baseAsset as any)?.audit,
              });
              enriched.baseAsset = {
                ...enriched.baseAsset,
                holderCount: (jupiterPool.baseAsset as any)?.holderCount || enriched.baseAsset.holderCount,
                organicScore: (jupiterPool.baseAsset as any)?.organicScore,
                audit: (jupiterPool.baseAsset as any)?.audit,
              } as any;
              console.log('✅ Pool enriched with Jupiter data. Final holderCount:', (enriched.baseAsset as any).holderCount);
            } else {
              console.log('⚠️ No Jupiter pool found - metrics will show default values');
            }
            setPool(enriched);
            if (!selectedPool) setSelectedPool(enriched); // Set initial selected pool
          })
          .catch(err => {
            console.error('Failed to enrich pool metadata:', err);
            setPool(rawPool); // Use raw pool if enrichment fails
            if (!selectedPool) setSelectedPool(rawPool);
          });
      } else if (tokenPools.length === 0) {
        // No Meteora pools - fetch token metadata AND price from Jupiter
        Promise.all([
          fetch(`https://tokens.jup.ag/token/${mint}`).then(res => res.json()),
          fetch(`https://api.jup.ag/price/v2?ids=${mint}`).then(res => res.json())
        ])
          .then(([tokenData, priceData]) => {
            const price = priceData?.data?.[mint]?.price || 0;
            console.log(`📊 Token ${mint} price: $${price}`);

            setTokenInfo({
              address: mint,
              symbol: tokenData.symbol || 'UNKNOWN',
              name: tokenData.name || 'Unknown Token',
              icon: tokenData.logoURI || '',
              decimals: tokenData.decimals || 9,
              usdPrice: price,
            });
          })
          .catch(err => {
            console.error('Failed to fetch token metadata/price:', err);
            setTokenInfo({
              address: mint,
              symbol: 'TOKEN',
              name: 'Unknown Token',
              icon: '',
              decimals: 9,
              usdPrice: 0,
            });
          });
      }
    }
  }, [rawPool, isLoadingTokenPools, tokenPools.length, mint, jupiterPool]);

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
  // Use 'as unknown as Pool' to bypass TypeScript's strict type checking for this synthetic object
  const chartPool: Pool | null = pool || (tokenInfo ? {
    id: mint,
    chain: 'solana',
    dex: 'Unknown',
    type: 'unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bondingCurve: undefined,
    volume24h: 0,
    isUnreliable: false,
    baseAsset: {
      id: tokenInfo.address,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      icon: tokenInfo.icon,
      decimals: tokenInfo.decimals || 9,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      usdPrice: tokenInfo.usdPrice || 0,
      liquidity: 0,
    },
    quoteAsset: {
      id: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      icon: '',
      decimals: 9,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    },
    tvl: 0,
    raydiumFields: null,
  } as unknown as Pool : null);

  if (!displayToken || !chartPool) {
    return null; // Should never happen, but TypeScript safety
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Breadcrumb Navigation (Charting.ag Style) */}
        <div className="flex-shrink-0 px-4 pt-2 pb-1 border-b border-border-light">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </Link>
            <span className="text-gray-600">›</span>
            <span className="text-white font-medium">{displayToken.symbol}</span>
          </div>
        </div>

        {/* Main Content Row - Token Box (Left) + Metrics Box (Center) */}
        <div className="flex-shrink-0 flex items-start gap-6 px-4 py-3 border-b border-border-light">
          {/* LEFT: Token Info Box (Charting.ag Style) */}
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700/50">
            {/* Row 1: Icon + Symbol + Name + Dropdown */}
            <div className="flex items-center gap-3 mb-1">
              {displayToken.icon && (
                <img src={displayToken.icon} alt={displayToken.symbol} className="w-10 h-10 rounded-full" />
              )}
              <h1 className="text-xl font-bold text-white">{displayToken.symbol}</h1>
              {displayToken.name && (
                <span className="text-sm text-gray-400">{displayToken.name}</span>
              )}
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Row 2: Contract Address + Social Icons (aligned under symbol) */}
            <div className="flex items-center gap-3 ml-[52px]">
              <button
                onClick={() => {
                  const address = displayToken.id || displayToken.address;
                  navigator.clipboard.writeText(address);
                  toast.success('Contract address copied!', {
                    duration: 2000,
                    style: {
                      background: '#1f2937',
                      color: '#fff',
                      border: '1px solid #374151',
                    },
                  });
                }}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1.5 group"
                title="Click to copy address"
              >
                <span className="font-mono">{(displayToken.id || displayToken.address).slice(0, 6)}...{(displayToken.id || displayToken.address).slice(-4)}</span>
                <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {displayToken.website && (
                <a href={displayToken.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors" title="Website">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                  </svg>
                </a>
              )}
              {displayToken.twitter && (
                <a href={displayToken.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors" title="Twitter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {displayToken.telegram && (
                <a href={displayToken.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors" title="Telegram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* RIGHT: Metrics Box (Charting.ag Style - Centered above chart) */}
          <div className="flex-1 bg-gray-800/30 rounded-lg px-8 py-3 border border-gray-700/30 flex items-start justify-between">
            {/* Price Changes */}
            <div>
              <div className="text-sm font-bold text-gray-300 mb-2">Price Changes</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">5M</div>
                  <div className="text-base font-bold text-success">+0.1%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">1H</div>
                  <div className="text-base font-bold text-success">+2.5%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">6H</div>
                  <div className="text-base font-bold text-success">+2.2%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">24H</div>
                  <div className="text-base font-bold text-error">-7.8%</div>
                </div>
              </div>
            </div>

            {/* Volume Changes */}
            <div>
              <div className="text-sm font-bold text-gray-300 mb-2">Volume Changes</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">5M</div>
                  <div className="text-base font-bold text-error">-0.3%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">1H</div>
                  <div className="text-base font-bold text-success">+82.6%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">6H</div>
                  <div className="text-base font-bold text-error">-11.1%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">24H</div>
                  <div className="text-base font-bold text-error">-40.7%</div>
                </div>
              </div>
            </div>

            {/* Key Metrics - 11 Columns (Charting.ag Complete) */}
            <div>
              <div className="text-sm font-bold text-gray-300 mb-2">Key Metrics</div>
              <div className="flex items-center gap-5">
                {/* Price */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Price</div>
                  <div className="text-base font-bold text-white">${(pool?.baseAsset.usdPrice || 0).toFixed(4)}</div>
                </div>
                {/* 24h Vol */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">24h Vol</div>
                  <div className="text-base font-bold text-white">
                    ${((pool?.volume24h || 0) / 1_000_000).toFixed(2)}M
                  </div>
                </div>
                {/* MCap */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">MCap</div>
                  <div className="text-base font-bold text-white">
                    ${((jupiterTokenData?.mcap || 0) / 1_000_000).toFixed(2)}M
                  </div>
                </div>
                {/* FDV */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">FDV</div>
                  <div className="text-base font-bold text-white">
                    ${((jupiterTokenData?.fdv || 0) / 1_000_000).toFixed(2)}M
                  </div>
                </div>
                {/* Liquidity */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Liquidity</div>
                  <div className="text-base font-bold text-white">
                    ${((pool?.baseAsset.liquidity || 0) / 1_000_000).toFixed(2)}M
                  </div>
                </div>
                {/* Holders */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Holders</div>
                  <div className="text-base font-bold text-white">
                    {jupiterTokenData?.holderCount
                      ? formatNumber(jupiterTokenData.holderCount)
                      : '--'}
                  </div>
                </div>
                {/* Top 10 H. */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Top10 H.</div>
                  <div className="text-base font-bold text-white">
                    {holderMetrics?.topHoldersPercentage !== undefined
                      ? `${Math.round(holderMetrics.topHoldersPercentage)}%`
                      : (pool?.baseAsset as any)?.audit?.topHoldersPercentage !== undefined
                        ? `${Math.round((pool?.baseAsset as any).audit.topHoldersPercentage)}%`
                        : '--'}
                  </div>
                </div>
                {/* Dev H. */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Dev H.</div>
                  <div className={`text-base font-bold ${
                    holderMetrics?.devBalancePercentage !== undefined && holderMetrics.devBalancePercentage < 10
                      ? 'text-success'
                      : (pool?.baseAsset as any)?.audit?.devBalancePercentage !== undefined &&
                        (pool?.baseAsset as any).audit.devBalancePercentage < 10
                        ? 'text-success'
                        : 'text-white'
                  }`}>
                    {holderMetrics?.devBalancePercentage !== undefined
                      ? `${holderMetrics.devBalancePercentage.toFixed(0)}%`
                      : (pool?.baseAsset as any)?.audit?.devBalancePercentage !== undefined
                        ? `${((pool?.baseAsset as any).audit.devBalancePercentage).toFixed(0)}%`
                        : '--'}
                  </div>
                </div>
                {/* Mint */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Mint</div>
                  <div className={`text-base font-bold ${
                    !jupiterTokenData?.mintAuthority
                      ? 'text-success'
                      : 'text-warning'
                  }`}>
                    {jupiterTokenData !== null
                      ? (!jupiterTokenData?.mintAuthority ? 'No' : 'Yes')
                      : '--'}
                  </div>
                </div>
                {/* Freeze */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Freeze</div>
                  <div className={`text-base font-bold ${
                    jupiterTokenData?.audit?.freezeAuthorityDisabled === true
                      ? 'text-success'
                      : 'text-warning'
                  }`}>
                    {jupiterTokenData?.audit?.freezeAuthorityDisabled !== undefined
                      ? (jupiterTokenData.audit.freezeAuthorityDisabled ? 'No' : 'Yes')
                      : '--'}
                  </div>
                </div>
                {/* Score */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Score</div>
                  <div className={`text-base font-bold ${
                    jupiterTokenData?.organicScore
                      ? jupiterTokenData.organicScore >= 70
                        ? 'text-success'
                        : 'text-white'
                      : 'text-error'
                  }`}>
                    {jupiterTokenData?.organicScore
                      ? Math.round(jupiterTokenData.organicScore)
                      : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: 3-Column Layout - ALWAYS show chart */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar (280px) - Related Pools List or Create Pool CTA */}
          <div className="w-[280px] flex-shrink-0 border-r border-border-light overflow-hidden">
            {hasMeteoraPool ? (
              <PoolListSidebar
                currentPool={pool}
                network={network}
                onSelectPool={(pool) => setSelectedPool(pool)}
                selectedPoolId={selectedPool?.id}
              />
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
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-gray-800/30">
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
          <div className="w-[400px] flex-shrink-0 border-l border-border-light overflow-y-auto bg-gray-800/30">
            {/* Pool Actions Panel - Always shown */}
            <div className="flex-shrink-0">
              <PoolActionsPanel
                poolAddress={selectedPool?.id || pool?.id || mint}
                tokenXMint={selectedPool?.baseAsset.id || displayToken.id || displayToken.address}
                tokenYMint={selectedPool?.quoteAsset?.id || pool?.quoteAsset?.id || 'So11111111111111111111111111111111111111112'}
                tokenXSymbol={selectedPool?.baseAsset.symbol || displayToken.symbol}
                tokenYSymbol={selectedPool?.quoteAsset?.symbol || pool?.quoteAsset?.symbol || 'SOL'}
                currentPrice={selectedPool?.baseAsset.usdPrice || displayToken.usdPrice || 0}
                binStep={selectedPool?.binStep || pool?.binStep || 20}
                baseFee={selectedPool?.baseFee || pool?.baseFee || 0.2}
                poolType={selectedPool?.type || pool?.type || 'unknown'}
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
