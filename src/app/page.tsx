/**
 * Discover Page
 * Charting.ag-inspired two-column split layout
 *
 * Note: This page uses dynamic data fetching that may include BigInt values
 * which cannot be serialized during SSR. The 'use client' directive ensures
 * this runs client-side only.
 */

'use client';

// Force dynamic rendering to avoid BigInt serialization issues during SSR
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PoolTable } from '@/components/dashboard/PoolTable';
import { TokenTable, type TokenData } from '@/components/dashboard/TokenTable';
import { ChartDetailsPanel } from '@/components/dashboard/ChartDetailsPanel';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { useBackendDLMMPools, useBackendDAMMPools } from '@/lib/hooks/useBackendPools';
import { Pool } from '@/lib/jupiter/types';
import { enrichPoolsWithMetadata } from '@/lib/services/tokenMetadata';
import { useNetwork } from '@/contexts/NetworkContext';

type ProtocolFilter = 'all' | 'dlmm' | 'damm-v2';
type TokenSortOption = 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap';
type PoolSortOption = 'volume' | 'liquidity';
type ViewMode = 'token' | 'pair';

export default function DiscoverPage() {
  const router = useRouter();
  const { network } = useNetwork();
  const [selectedPool, setSelectedPool] = useState<any | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all');
  const [tokenSortBy, setTokenSortBy] = useState<TokenSortOption>('volume');
  const [poolSortBy, setPoolSortBy] = useState<PoolSortOption>('volume');
  const [viewMode, setViewMode] = useState<ViewMode>('pair');
  const [showChartModal, setShowChartModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Unified search for both tokens and pools
  const [showTokenFilters, setShowTokenFilters] = useState(false); // Toggle for filter dropdown
  const [timePeriod, setTimePeriod] = useState<'1H' | '2H' | '4H' | '8H' | '24H'>('1H'); // Token time period filter
  const [minLiquidity, setMinLiquidity] = useState<string>('');
  const [maxLiquidity, setMaxLiquidity] = useState<string>('');
  const [minMarketCap, setMinMarketCap] = useState<string>('');
  const [maxMarketCap, setMaxMarketCap] = useState<string>('');
  const [enrichedPools, setEnrichedPools] = useState<Pool[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]); // Pool search results
  const [tokenSearchResults, setTokenSearchResults] = useState<TokenData[]>([]); // Token search results
  const [isSearching, setIsSearching] = useState(false);
  const [tokenCreationTimestamps, setTokenCreationTimestamps] = useState<Map<string, number>>(new Map());

  // Fetch Jupiter pools for TOKEN aggregation (LEFT SIDE)
  // Map UI time periods to Jupiter API timeframes: 1H→1h, 2H→1h, 4H→6h, 8H→6h, 24H→24h
  const jupiterTimeframe = timePeriod === '24H' ? '24h' : timePeriod === '8H' || timePeriod === '4H' ? '6h' : '1h';

  const { data: jupiterData, isLoading: isLoadingJupiter, error: jupiterError } = useAllPublicPools({
    timeframe: jupiterTimeframe,
    refetchInterval: false, // Disabled - manual refresh only
  });

  // Fetch Meteora pools from BACKEND (cached in Redis - FAST!)
  // CRITICAL: Pass network parameter to ensure proper filtering
  const { data: dlmmPools = [], isLoading: isLoadingDLMM, error: dlmmError } = useBackendDLMMPools(network);
  const { data: dammPools = [], isLoading: isLoadingDAMM, error: dammError } = useBackendDAMMPools(network);

  // Debug: Log backend pool fetch status
  console.log('🔍 DLMM Pools Status:', {
    count: dlmmPools.length,
    isLoading: isLoadingDLMM,
    error: dlmmError?.message
  });
  console.log('🔍 DAMM Pools Status:', {
    count: dammPools.length,
    isLoading: isLoadingDAMM,
    error: dammError?.message
  });

  // Combine Jupiter pools for TOKEN view (LEFT SIDE ONLY)
  const jupiterPools = useMemo(() => {
    const combined = [
      ...(jupiterData?.recent?.pools || []),
      ...(jupiterData?.aboutToGraduate?.pools || []),
      ...(jupiterData?.graduated?.pools || []),
    ];

    // Remove duplicates
    return Array.from(
      new Map(combined.map(pool => [pool.id, pool])).values()
    );
  }, [jupiterData]);

  // Transform and combine Meteora pools for POOL view (RIGHT SIDE)
  const meteoraPools = useMemo(() => {
    // Debug: Log first pool to verify data structure
    if (dlmmPools.length > 0) {
      console.log('🔍 First DLMM pool data:', {
        name: dlmmPools[0].name,
        token_a_symbol: dlmmPools[0].token_a_symbol,
        token_b_symbol: dlmmPools[0].token_b_symbol,
        address: dlmmPools[0].address,
      });
    }

    // Transform DLMM pools to Pool format
    const dlmmTransformed = dlmmPools.map((pool: any) => {
      // Use symbols from pool data (added by transform function)
      // Fallback to parsing pool name if symbols are still missing
      // CRITICAL FIX: Backend returns field named "name" not "pool_name"
      const baseSymbol = pool.token_a_symbol || pool.name?.split('-')[0]?.trim() || 'UNKNOWN';
      const quoteSymbol = pool.token_b_symbol || pool.name?.split('-')[1]?.trim() || 'SOL';

      return {
        id: pool.address,
        chain: 'solana',
        dex: 'Meteora',
        type: 'dlmm',
        createdAt: new Date().toISOString(),
        bondingCurve: undefined,
        volume24h: pool.trade_volume_24h || 0,
        isUnreliable: false,
        updatedAt: new Date().toISOString(),
        price: pool.current_price || 0,
        baseAsset: {
          id: pool.mint_x,
          name: baseSymbol, // Use symbol as name since API doesn't provide full names
          symbol: baseSymbol,
          decimals: 0, // Will be fetched from token metadata service
          tokenProgram: '', // Will be fetched from token metadata service
          organicScoreLabel: 'medium' as const,
          liquidity: parseFloat(pool.liquidity || '0'),
          stats24h: {},
        },
        quoteAsset: {
          id: pool.mint_y,
          symbol: quoteSymbol,
          name: quoteSymbol,
        },
        meteoraData: {
          binStep: pool.bin_step,
          baseFeePercentage: pool.base_fee_percentage,
          poolType: 'dlmm' as const,
        }
      };
    });

    // Debug: Log first DAMM pool to verify data structure
    if (dammPools.length > 0) {
      console.log('🔍 First DAMM pool data:', {
        pool_name: dammPools[0].pool_name,
        token_a_symbol: dammPools[0].token_a_symbol,
        token_b_symbol: dammPools[0].token_b_symbol,
        pool_address: dammPools[0].pool_address,
      });
    }

    // Transform DAMM pools to Pool format
    const dammTransformed = dammPools.map((pool: any) => {
      // DAMM v2 API provides token_a_symbol and token_b_symbol directly
      const baseSymbol = pool.token_a_symbol || 'UNKNOWN';
      const quoteSymbol = pool.token_b_symbol || 'UNKNOWN';

      const transformed = {
        id: pool.pool_address,
        chain: 'solana',
        dex: 'Meteora',
        type: 'damm-v2',
        createdAt: new Date().toISOString(),
        bondingCurve: undefined,
        volume24h: parseFloat(pool.volume24h || pool.volume_24h || '0'),
        isUnreliable: false,
        updatedAt: new Date().toISOString(),
        price: parseFloat(pool.pool_price || '0'),
        baseAsset: {
          id: pool.token_a_mint,
          name: baseSymbol, // Use symbol as name since API doesn't provide full names
          symbol: baseSymbol,
          decimals: 0, // Will be fetched from token metadata service
          tokenProgram: '', // Will be fetched from token metadata service
          organicScoreLabel: 'medium' as const,
          liquidity: parseFloat(pool.tvl || '0'),
          stats24h: {},
          icon: undefined, // Will be fetched from token metadata service
        },
        quoteAsset: {
          id: pool.token_b_mint,
          symbol: quoteSymbol,
          name: quoteSymbol,
        },
        meteoraData: {
          baseFeePercentage: ((pool.base_fee || 0.25).toString()),
          poolType: 'damm-v2' as const,
        }
      };

      return transformed;
    });

    // Combine all Meteora pools
    const combined = [...dlmmTransformed, ...dammTransformed];

    // Sort by 24h volume (like charting.ag) and take top 100
    const sorted = combined.sort((a, b) => {
      const volumeA = a.volume24h || 0;
      const volumeB = b.volume24h || 0;
      return volumeB - volumeA;
    });

    const top100 = sorted.slice(0, 100);
    console.log(`📊 Showing top 100 pools out of ${combined.length} total (sorted by 24h volume)`);
    return top100;
  }, [dlmmPools, dammPools]);

  // Enrich pools with token metadata (logos only - symbols come from API)
  useEffect(() => {
    // Skip if no pools or already enriching
    if (meteoraPools.length === 0 || isEnriching) return;

    // Only enrich once per pool set (use pool IDs as stable key)
    const poolIds = meteoraPools.map(p => p.id).join(',');

    console.log(`🔍 Starting enrichment for ${meteoraPools.length} pools...`);
    setIsEnriching(true);

    enrichPoolsWithMetadata(meteoraPools)
      .then(enriched => {
        console.log(`✅ Enriched ${enriched.length} pools with token metadata`);

        // Debug: Check first enriched pool
        if (enriched.length > 0) {
          console.log('📊 Sample enriched pool:', {
            id: enriched[0].id,
            baseAsset: {
              symbol: enriched[0].baseAsset.symbol,
              icon: enriched[0].baseAsset.icon,
              name: enriched[0].baseAsset.name,
            },
            quoteAsset: enriched[0].quoteAsset ? {
              symbol: enriched[0].quoteAsset.symbol,
              icon: enriched[0].quoteAsset.icon,
            } : null,
          });
        }

        setEnrichedPools(enriched);
        setIsEnriching(false);
      })
      .catch(error => {
        console.error('❌ Failed to enrich pools:', error);
        setEnrichedPools(meteoraPools); // Fallback to unenriched
        setIsEnriching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meteoraPools.length, dlmmPools.length, dammPools.length]); // Stable dependencies

  // Use enriched pools if available, otherwise use raw pools
  const displayPools = enrichedPools.length > 0 ? enrichedPools : meteoraPools;

  // No need to fetch pool details separately - Meteora API provides them!

  // Search tokens AND pools when user types
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        setTokenSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Search both tokens and pools in parallel
        const [tokenResponse, poolResponse] = await Promise.all([
          fetch(`/api/tokens/search?q=${encodeURIComponent(searchTerm)}`),
          fetch(`https://alsk-production.up.railway.app/api/pools/search?q=${encodeURIComponent(searchTerm)}&network=${network}&limit=100`)
        ]);

        const [tokenData, poolData] = await Promise.all([
          tokenResponse.json(),
          poolResponse.json()
        ]);

        if (tokenData.success) {
          console.log(`🔍 Found ${tokenData.data.length} tokens matching "${searchTerm}" (via Jupiter API)`);
          setTokenSearchResults(tokenData.data.slice(0, 3)); // Top 3 tokens
        }

        if (poolData.success) {
          console.log(`🔍 Found ${poolData.data.length} pools matching "${searchTerm}"`);

          // Transform backend pool format to Pool type (same structure as discover page)
          const transformedPools = poolData.data.map((pool: any) => ({
            id: pool.pool_address,
            chain: 'solana',
            dex: 'Meteora',
            type: pool.protocol === 'dlmm' ? 'dlmm' : pool.protocol === 'damm-v2' ? 'damm-v2' : 'damm-v1',
            createdAt: pool.created_at || new Date().toISOString(),
            bondingCurve: undefined,
            volume24h: parseFloat(pool.volume_24h || '0'),
            isUnreliable: false,
            updatedAt: pool.updated_at || new Date().toISOString(),
            price: 0,
            baseAsset: {
              id: pool.token_a_mint,
              name: pool.token_a_symbol,
              symbol: pool.token_a_symbol,
              decimals: 0,
              tokenProgram: '',
              organicScoreLabel: 'medium' as const,
              liquidity: parseFloat(pool.tvl || '0'),
              stats24h: {},
            },
            quoteAsset: {
              id: pool.token_b_mint,
              symbol: pool.token_b_symbol,
              name: pool.token_b_symbol,
            },
            meteoraData: {
              binStep: pool.metadata?.bin_step,
              baseFeePercentage: pool.metadata?.base_fee_percentage,
              poolType: pool.protocol as any,
            }
          }));

          // Enrich with metadata (logos) - same as discover page
          enrichPoolsWithMetadata(transformedPools).then(enriched => {
            console.log(`✅ Enriched ${enriched.length} search pool results with metadata`);
            setSearchResults(enriched);
          }).catch(error => {
            console.error('❌ Failed to enrich search pools:', error);
            setSearchResults(transformedPools); // Fallback to non-enriched
          });
        }
      } catch (error) {
        console.error('Failed to search:', error);
        setSearchResults([]);
        setTokenSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, network]);

  // Fetch actual token creation timestamps from backend (blockchain data cached in PostgreSQL/Redis)
  useEffect(() => {
    const fetchTokenCreationTimestamps = async () => {
      if (jupiterPools.length === 0) return;

      // Get unique token addresses from top 100 tokens by volume
      const tokenAddresses = Array.from(
        new Set(jupiterPools.map(pool => pool.baseAsset.id))
      ).slice(0, 100); // Top 100 tokens

      if (tokenAddresses.length === 0) return;

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const response = await fetch(`${backendUrl}/api/tokens/batch/creation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: tokenAddresses }),
        });

        if (!response.ok) {
          console.error('❌ Failed to fetch token creation timestamps:', response.statusText);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const timestampMap = new Map<string, number>();
          Object.entries(result.data).forEach(([address, data]) => {
            if (data && typeof data === 'object' && 'timestamp' in data) {
              timestampMap.set(address, (data as { timestamp: number }).timestamp);
            }
          });

          setTokenCreationTimestamps(timestampMap);
          console.log(`✅ Fetched creation timestamps for ${timestampMap.size} tokens`);
        }
      } catch (error) {
        console.error('❌ Error fetching token creation timestamps:', error);
      }
    };

    fetchTokenCreationTimestamps();
  }, [jupiterPools]);

  // Aggregate Jupiter pools by token (for Token view - LEFT SIDE)
  // MUST use Jupiter pools because they have firstPool.createdAt for token age!
  const aggregatedTokens = useMemo(() => {
    const tokenMap = new Map<string, TokenData>();

    // Use jupiterPools because they have full token metadata including firstPool
    jupiterPools.forEach(pool => {
      const tokenId = pool.baseAsset.id;

      if (!tokenMap.has(tokenId)) {
        const buys = (pool.baseAsset as any).stats24h?.numBuys || 0;
        const sells = (pool.baseAsset as any).stats24h?.numSells || 0;

        // Use actual blockchain timestamp if available, otherwise fall back to firstPool
        const blockchainTimestamp = tokenCreationTimestamps.get(tokenId);
        const createdAt = blockchainTimestamp
          ? new Date(blockchainTimestamp * 1000).toISOString()
          : ((pool.baseAsset as any).firstPool?.createdAt || pool.createdAt);

        tokenMap.set(tokenId, {
          tokenAddress: tokenId,
          symbol: pool.baseAsset.symbol,
          name: pool.baseAsset.name,
          icon: (pool.baseAsset as any).icon,
          totalVolume24h: 0,
          totalLiquidity: 0,
          marketCap: (pool.baseAsset as any).mcap || 0,
          holders: (pool.baseAsset as any).holderCount || 0,
          txCount: buys + sells,
          pools: [],
          priceChange: ((pool.baseAsset as any).stats24h?.priceChange as number) || 0,
          twitter: (pool.baseAsset as any).twitter,
          createdAt,
          organicScore: (pool.baseAsset as any).organicScore,
          audit: (pool.baseAsset as any).audit,
        });
      }

      const token = tokenMap.get(tokenId)!;
      token.totalVolume24h += pool.volume24h || 0;
      token.totalLiquidity += pool.baseAsset.liquidity || 0;
      token.pools.push(pool);
    });

    const allTokens = Array.from(tokenMap.values());

    // Sort by volume and take top 100
    const sorted = allTokens.sort((a, b) => b.totalVolume24h - a.totalVolume24h);
    const top100 = sorted.slice(0, 100);
    console.log(`📊 Showing top 100 tokens out of ${allTokens.length} total (from Jupiter API)`);
    return top100;
  }, [jupiterPools, tokenCreationTimestamps]);

  // Apply filters and sorting to Meteora pools (RIGHT SIDE)
  // Note: Search is completely separate - it only shows in the dropdown, not here
  const filteredPools = useMemo(() => {
    let filtered = displayPools;

    // Debug: Log pool counts by type
    const poolsByType = displayPools.reduce((acc, pool) => {
      acc[pool.type] = (acc[pool.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 Pool counts by type:', poolsByType);
    console.log('📊 Total displayPools:', displayPools.length);
    console.log('📊 Raw DLMM pools from backend:', dlmmPools.length);
    console.log('📊 Raw DAMM pools from backend:', dammPools.length);

    // Protocol filter
    if (protocolFilter !== 'all') {
      filtered = filtered.filter((pool) => {
        if (protocolFilter === 'dlmm') return pool.type === 'dlmm';
        if (protocolFilter === 'damm-v2') return pool.type === 'damm-v2';
        return true;
      });
      console.log(`📊 After ${protocolFilter} filter:`, filtered.length, 'pools');
    }

    // Sort pools
    filtered.sort((a, b) => {
      if (poolSortBy === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
      if (poolSortBy === 'liquidity') return (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0);
      return 0;
    });

    return filtered;
  }, [displayPools, protocolFilter, poolSortBy, dlmmPools.length, dammPools.length]);

  // Apply filters and sorting to tokens
  const filteredTokens = useMemo(() => {
    let filtered = aggregatedTokens;

    // Min/Max Liquidity filter
    if (minLiquidity) {
      const minLiq = parseFloat(minLiquidity);
      filtered = filtered.filter(token => token.totalLiquidity >= minLiq);
    }
    if (maxLiquidity) {
      const maxLiq = parseFloat(maxLiquidity);
      filtered = filtered.filter(token => token.totalLiquidity <= maxLiq);
    }

    // Min/Max Market Cap filter (using liquidity as proxy for now)
    if (minMarketCap) {
      const minMC = parseFloat(minMarketCap);
      filtered = filtered.filter(token => token.totalLiquidity >= minMC);
    }
    if (maxMarketCap) {
      const maxMC = parseFloat(maxMarketCap);
      filtered = filtered.filter(token => token.totalLiquidity <= maxMC);
    }

    // Sort tokens
    filtered.sort((a, b) => {
      if (tokenSortBy === 'volume') return b.totalVolume24h - a.totalVolume24h;
      if (tokenSortBy === 'liquidity') return b.totalLiquidity - a.totalLiquidity;
      if (tokenSortBy === 'marketCap') return b.totalLiquidity - a.totalLiquidity; // Using liquidity as proxy
      if (tokenSortBy === 'holders') return b.holders - a.holders;
      if (tokenSortBy === 'txs') {
        const aTxs = a.pools.reduce((sum, p) => sum + (p.baseAsset.stats24h?.numBuys || 0) + (p.baseAsset.stats24h?.numSells || 0), 0);
        const bTxs = b.pools.reduce((sum, p) => sum + (p.baseAsset.stats24h?.numBuys || 0) + (p.baseAsset.stats24h?.numSells || 0), 0);
        return bTxs - aTxs;
      }
      return 0;
    });

    return filtered;
  }, [aggregatedTokens, tokenSortBy, minLiquidity, maxLiquidity, minMarketCap, maxMarketCap]);

  // Auto-select first pool
  useEffect(() => {
    if (filteredPools.length > 0 && !selectedPool) {
      setSelectedPool(filteredPools[0]);
    }
  }, [filteredPools, selectedPool]);

  // Reset all token filters
  const resetTokenFilters = () => {
    setMinLiquidity('');
    setMaxLiquidity('');
    setMinMarketCap('');
    setMaxMarketCap('');
  };

  return (
    <MainLayout
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchResults={{
        tokens: tokenSearchResults,
        pools: searchResults
      }}
      isSearching={isSearching}
      onTokenClick={(token) => {
        // Navigate to token chart page - /solana/{token_mint}
        if (token.tokenAddress) {
          router.push(`/solana/${token.tokenAddress}`);
        }
      }}
      onPoolClick={(pool) => {
        // Navigate to token chart page for base token - /solana/{token_mint}
        router.push(`/solana/${pool.baseAsset.id}`);
      }}
    >
      <div className="h-[calc(100vh-80px)] flex flex-col">

        {/* Error State */}
        {jupiterError && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-error font-medium mb-2">Failed to load token data</p>
              <p className="text-sm text-foreground-muted">{jupiterError.message}</p>
            </div>
          </div>
        )}

        {/* Split Layout - Tokens (Left) + Pools (Right) - Charting.ag Style */}
        {!jupiterError && (
          <div className="flex-1 overflow-hidden bg-background p-4 flex gap-4">
              {/* Left: Token Column with Filter Bar */}
              <div className="w-1/2 flex flex-col bg-background-secondary border border-border-light rounded-xl overflow-hidden">
                {/* Token Filter Bar - Match pools header height with 2 rows */}
                <div className="px-4 py-2 border-b border-border-light">
                  <div className="flex flex-col gap-2">
                    {/* First Row - Token label + Time Period Filters (matches pools protocol filter row height) */}
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-background-tertiary text-foreground border border-border-light cursor-default">
                        Tokens
                      </button>

                      {/* Time Period Filters - Charting.ag style */}
                      <div className="flex items-center gap-1">
                        {(['1H', '2H', '4H', '8H', '24H'] as const).map((period) => (
                          <button
                            key={period}
                            onClick={() => setTimePeriod(period)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              timePeriod === period
                                ? 'bg-background-tertiary text-foreground border border-border-light'
                                : 'text-foreground-muted hover:text-foreground border border-transparent'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Second Row - Sort, Filter, and Count (matches pools sort row) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Sort Dropdown */}
                        <span className="text-foreground-muted text-xs">Sort:</span>
                        <select
                          value={tokenSortBy}
                          onChange={(e) => setTokenSortBy(e.target.value as TokenSortOption)}
                          className="bg-background-secondary border border-border-light rounded-lg px-2 py-1 text-foreground text-xs focus:outline-none focus:border-foreground-muted cursor-pointer"
                        >
                          <option value="volume">Volume</option>
                          <option value="liquidity">Liquidity</option>
                          <option value="marketCap">Market Cap</option>
                          <option value="holders">Holders</option>
                          <option value="txs">Transactions</option>
                        </select>

                        {/* Filter Dropdown Button */}
                        <div className="relative">
                        <button
                          onClick={() => setShowTokenFilters(!showTokenFilters)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-background-secondary border border-border-light rounded-lg text-xs text-foreground hover:border-foreground-muted transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" suppressHydrationWarning />
                          </svg>
                          <span>Filter</span>
                          <svg className={`w-3 h-3 transition-transform ${showTokenFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" suppressHydrationWarning />
                          </svg>
                        </button>

                        {/* Filter Dropdown Panel */}
                        {showTokenFilters && (
                          <div className="absolute top-full left-0 mt-1 w-80 bg-background-secondary border border-border-light rounded-lg shadow-xl z-50 px-6 py-4 max-h-[400px] overflow-y-auto">
                            {/* Liquidity Section */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-foreground mb-2">Liquidity</label>
                              <div className="flex gap-3 justify-center">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={minLiquidity}
                                  onChange={(e) => setMinLiquidity(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={maxLiquidity}
                                  onChange={(e) => setMaxLiquidity(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>

                            {/* Market Cap Section */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-foreground mb-2">Market Cap</label>
                              <div className="flex gap-3 justify-center">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={minMarketCap}
                                  onChange={(e) => setMinMarketCap(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={maxMarketCap}
                                  onChange={(e) => setMaxMarketCap(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>

                            {/* Reset All Button */}
                            <button
                              onClick={resetTokenFilters}
                              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs text-foreground-muted hover:text-foreground transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" suppressHydrationWarning />
                              </svg>
                              Reset All
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Table */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  {isLoadingJupiter ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <TokenTable
                      tokens={filteredTokens}
                      sortBy={tokenSortBy}
                      onSortChange={setTokenSortBy}
                      onTokenClick={(token) => {
                        // Navigate to token chart page - /solana/{token_mint}
                        router.push(`/solana/${token.tokenAddress}`);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Right: Pool Column with Filter Bar */}
              <div className="flex-1 flex flex-col bg-background-secondary border border-border-light rounded-xl overflow-hidden">
                {/* Pool Filter Bar */}
                <div className="px-4 py-2 border-b border-border-light">
                  <div className="flex flex-col gap-2">
                    {/* Protocol Filters Row + Time Period Filters */}
                    <div className="flex items-center gap-2">
                      {/* Protocol Filter Buttons */}
                      <div className="flex items-center gap-1">
                        {(['all', 'dlmm', 'damm-v2'] as ProtocolFilter[]).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setProtocolFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              protocolFilter === filter
                                ? 'bg-background-tertiary text-foreground border border-border-light'
                                : 'text-foreground-muted hover:text-foreground'
                            }`}
                          >
                            {filter === 'all' ? 'All' : filter === 'damm-v2' ? 'DYN2' : filter.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      {/* Time Period - 24H only (Meteora backend limitation) */}
                      <div className="flex items-center gap-1">
                        <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-background-tertiary text-foreground border border-border-light cursor-default">
                          24H
                        </button>
                      </div>
                    </div>

                    {/* Sort and Pool Count Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground-muted text-xs">Sort:</span>
                        <select
                          value={poolSortBy}
                          onChange={(e) => setPoolSortBy(e.target.value as PoolSortOption)}
                          className="bg-background-secondary border border-border-light rounded-lg px-2 py-1 text-foreground text-xs focus:outline-none focus:border-foreground-muted cursor-pointer"
                        >
                          <option value="volume">Volume</option>
                          <option value="liquidity">Liquidity</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pool Table */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  {(isLoadingDLMM || isLoadingDAMM) ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <PoolTable
                      pools={filteredPools as any}
                      sortBy={poolSortBy}
                      onSortChange={setPoolSortBy}
                      onPoolClick={(pool) => {
                        // Navigate to token chart page for base token - /solana/{token_mint}
                        router.push(`/solana/${pool.baseAsset.id}`);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Chart Modal */}
        {showChartModal && selectedPool && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowChartModal(false)}
          >
            <div
              className="bg-background border border-border-light rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedPool.baseAsset.symbol} Pool Details
                </h2>
                <button
                  onClick={() => setShowChartModal(false)}
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-auto max-h-[calc(90vh-80px)]">
                <ChartDetailsPanel pool={selectedPool} />
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
