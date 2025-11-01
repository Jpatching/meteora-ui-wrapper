/**
 * Discover Page
 * Charting.ag-inspired two-column split layout
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PoolTable } from '@/components/dashboard/PoolTable';
import { TokenTable, type TokenData } from '@/components/dashboard/TokenTable';
import { ChartDetailsPanel } from '@/components/dashboard/ChartDetailsPanel';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { useDLMMPools } from '@/lib/hooks/useDLMMPools';
import { useDAMMPools } from '@/lib/hooks/useDAMMPools';
import { transformMeteoraPoolToPool } from '@/lib/services/meteoraApi';
import { transformDAMMPoolToPool } from '@/lib/services/dammApi';
import { Pool } from '@/lib/jupiter/types';

type ProtocolFilter = 'all' | 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha';
type TokenSortOption = 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap';
type PoolSortOption = 'volume' | 'liquidity';
type ViewMode = 'token' | 'pair';

export default function DiscoverPage() {
  const router = useRouter();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all');
  const [tokenSortBy, setTokenSortBy] = useState<TokenSortOption>('volume');
  const [poolSortBy, setPoolSortBy] = useState<PoolSortOption>('volume');
  const [viewMode, setViewMode] = useState<ViewMode>('pair');
  const [showChartModal, setShowChartModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Unified search for both tokens and pools
  const [showTokenFilters, setShowTokenFilters] = useState(false); // Toggle for filter dropdown
  const [minLiquidity, setMinLiquidity] = useState<string>('');
  const [maxLiquidity, setMaxLiquidity] = useState<string>('');
  const [minMarketCap, setMinMarketCap] = useState<string>('');
  const [maxMarketCap, setMaxMarketCap] = useState<string>('');

  // Fetch Jupiter pools for TOKEN aggregation (LEFT SIDE)
  const { data: jupiterData, isLoading: isLoadingJupiter, error: jupiterError } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: false, // Disabled - manual refresh only
  });

  // Fetch Meteora DLMM pools (RIGHT SIDE)
  const { data: dlmmPools = [], isLoading: isLoadingDLMM } = useDLMMPools({
    refetchInterval: false,
    sortBy: 'liquidity',
  });

  // Fetch Meteora DAMM pools (RIGHT SIDE)
  const { data: dammPools = [], isLoading: isLoadingDAMM } = useDAMMPools({
    refetchInterval: false,
    version: 'all',
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
    // Transform DLMM pools to Pool format
    const dlmmTransformed = dlmmPools.map(pool => ({
      ...transformMeteoraPoolToPool(pool),
      // Keep original Meteora data for metadata display
      meteoraData: {
        binStep: pool.bin_step,
        baseFeePercentage: pool.base_fee_percentage,
        poolType: 'dlmm' as const,
      }
    }));

    // Transform DAMM pools to Pool format
    const dammTransformed = dammPools.map(pool => ({
      ...transformDAMMPoolToPool(pool),
      // Keep original Meteora data for metadata display
      meteoraData: {
        baseFeePercentage: (pool.base_fee || 0.25).toString(), // Use actual fee from API
        poolType: pool.version === 'v2' ? 'damm-v2' as const : 'damm-v1' as const,
      }
    }));

    // Combine all Meteora pools
    const combined = [...dlmmTransformed, ...dammTransformed];

    // Sort by liquidity (TVL) and take top 100
    const sorted = combined.sort((a, b) => {
      const liquidityA = a.baseAsset?.liquidity || 0;
      const liquidityB = b.baseAsset?.liquidity || 0;
      return liquidityB - liquidityA;
    });

    // Return only top 100 pools
    const top100 = sorted.slice(0, 100);
    console.log(`📊 Showing top 100 pools out of ${combined.length} total`);
    return top100;
  }, [dlmmPools, dammPools]);

  // No need to fetch pool details separately - Meteora API provides them!

  // Aggregate Jupiter pools by token (for Token view - LEFT SIDE)
  const aggregatedTokens = useMemo(() => {
    const tokenMap = new Map<string, TokenData>();

    jupiterPools.forEach(pool => {
      const tokenId = pool.baseAsset.id;

      if (!tokenMap.has(tokenId)) {
        tokenMap.set(tokenId, {
          tokenAddress: tokenId,
          symbol: pool.baseAsset.symbol,
          name: pool.baseAsset.name,
          icon: pool.baseAsset.icon,
          totalVolume24h: 0,
          totalLiquidity: 0,
          holders: pool.baseAsset.holderCount || 0,
          pools: [],
          priceChange: pool.baseAsset.stats24h?.priceChange || 0,
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
    console.log(`📊 Showing top 100 tokens out of ${allTokens.length} total`);
    return top100;
  }, [jupiterPools]);

  // Apply filters and sorting to Meteora pools (RIGHT SIDE)
  const filteredPools = useMemo(() => {
    let filtered = meteoraPools;

    // Protocol filter
    if (protocolFilter !== 'all') {
      filtered = filtered.filter((pool) => {
        if (protocolFilter === 'dbc') return pool.baseAsset.launchpad === 'met-dbc';
        if (protocolFilter === 'dlmm') return pool.type === 'dlmm';
        if (protocolFilter === 'damm-v1') return pool.type === 'damm-v1' || pool.type === 'damm';
        if (protocolFilter === 'damm-v2') return pool.type === 'damm-v2';
        if (protocolFilter === 'alpha') return pool.type === 'alpha-vault';
        return true;
      });
    }

    // Sort pools
    filtered.sort((a, b) => {
      if (poolSortBy === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
      if (poolSortBy === 'liquidity') return (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0);
      return 0;
    });

    return filtered;
  }, [meteoraPools, protocolFilter, poolSortBy]);

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

  // Show loading screen until BOTH data sources are ready
  const isFullyLoaded = !isLoadingJupiter && !isLoadingDLMM && !isLoadingDAMM;

  // Show loading screen
  if (!isFullyLoaded) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout searchTerm={searchTerm} onSearchChange={setSearchTerm}>
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
                {/* Token Filter Bar */}
                <div className="px-4 py-2 border-b border-border-light">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Filter Dropdown Button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowTokenFilters(!showTokenFilters)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-background-secondary border border-border-light rounded-lg text-xs text-foreground hover:border-foreground-muted transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          <span>Filter</span>
                          <svg className={`w-3 h-3 transition-transform ${showTokenFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Filter Dropdown Panel */}
                        {showTokenFilters && (
                          <div className="absolute top-full left-0 mt-1 w-80 bg-background-secondary border border-border-light rounded-lg shadow-xl z-50 p-4">
                            {/* Liquidity Section */}
                            <div className="mb-4">
                              <label className="block text-xs font-medium text-foreground mb-2">Liquidity</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={minLiquidity}
                                  onChange={(e) => setMinLiquidity(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={maxLiquidity}
                                  onChange={(e) => setMaxLiquidity(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>

                            {/* Market Cap Section */}
                            <div className="mb-4">
                              <label className="block text-xs font-medium text-foreground mb-2">Market Cap</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={minMarketCap}
                                  onChange={(e) => setMinMarketCap(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={maxMarketCap}
                                  onChange={(e) => setMaxMarketCap(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>

                            {/* Reset All Button */}
                            <button
                              onClick={resetTokenFilters}
                              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs text-foreground-muted hover:text-foreground transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset All
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sort Dropdown */}
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>

                    {/* Token Count */}
                    <div className="px-2 py-1 bg-background-secondary rounded-lg border border-border-light">
                      <span className="text-xs font-medium text-foreground-muted">
                        {filteredTokens.length} tokens
                      </span>
                    </div>
                  </div>
                </div>

                {/* Token Table */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  <TokenTable
                      tokens={filteredTokens.filter(token =>
                        searchTerm
                          ? token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            token.name.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )}
                      sortBy={tokenSortBy}
                      onSortChange={setTokenSortBy}
                      onTokenClick={(token) => {
                        // When clicking a token, navigate to its primary pool (highest volume)
                        const primaryPool = token.pools.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))[0];
                        if (primaryPool) {
                          router.push(`/pool/${primaryPool.id}`);
                        }
                      }}
                    />
                </div>
              </div>

              {/* Right: Pool Column with Filter Bar */}
              <div className="flex-1 flex flex-col bg-background-secondary border border-border-light rounded-xl overflow-hidden">
                {/* Pool Filter Bar */}
                <div className="px-4 py-2 border-b border-border-light">
                  <div className="flex flex-col gap-2">
                    {/* Protocol Filters Row */}
                    <div className="flex items-center gap-1">
                      {(['all', 'dlmm', 'damm-v1', 'damm-v2', 'dbc', 'alpha'] as ProtocolFilter[]).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setProtocolFilter(filter)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            protocolFilter === filter
                              ? 'bg-background-tertiary text-foreground border border-border-light'
                              : 'text-foreground-muted hover:text-foreground'
                          }`}
                        >
                          {filter === 'all' ? 'All' : filter === 'damm-v1' ? 'DAMM v1' : filter === 'damm-v2' ? 'DAMM v2' : filter.toUpperCase()}
                        </button>
                      ))}
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
                      <div className="px-2 py-1 bg-background-secondary rounded-lg border border-border-light">
                        <span className="text-xs font-medium text-foreground-muted">
                          {filteredPools.length} pools
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pool Table */}
                <div className="flex-1 overflow-auto hide-scrollbar">
                  <PoolTable
                      pools={filteredPools.filter(pool =>
                        searchTerm
                          ? pool.baseAsset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            pool.baseAsset.name.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )}
                      sortBy={poolSortBy}
                      onSortChange={setPoolSortBy}
                      onPoolClick={(pool) => {
                        // Navigate to pool detail page instead of showing modal
                        router.push(`/pool/${pool.id}`);
                      }}
                    />
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
