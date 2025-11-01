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
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { Pool } from '@/lib/jupiter/types';

type ProtocolFilter = 'all' | 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha';
type TokenSortOption = 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap';
type PoolSortOption = 'volume' | 'liquidity' | 'fees' | 'feeTV';
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
  const [minLiquidity, setMinLiquidity] = useState<string>('');
  const [maxLiquidity, setMaxLiquidity] = useState<string>('');
  const [minMarketCap, setMinMarketCap] = useState<string>('');
  const [maxMarketCap, setMaxMarketCap] = useState<string>('');
  const [poolsWithDetails, setPoolsWithDetails] = useState<Map<string, { binStep?: number; baseFee?: number }>>(new Map());

  // Fetch all public pools - DISABLED auto-refresh to prevent rapid polling
  const { data, isLoading, error } = useAllPublicPools({
    timeframe: '24h',
    refetchInterval: false, // Disabled - manual refresh only
  });

  // Combine and filter pools
  const allPools = useMemo(() => {
    const combined = [
      ...(data?.recent?.pools || []),
      ...(data?.aboutToGraduate?.pools || []),
      ...(data?.graduated?.pools || []),
    ];

    // Remove duplicates and enrich with fetched details
    const uniquePools = Array.from(
      new Map(combined.map(pool => [pool.id, pool])).values()
    );

    // Add fetched details to pools
    return uniquePools.map(pool => {
      const details = poolsWithDetails.get(pool.id);
      if (details) {
        return { ...pool, ...details };
      }
      return pool;
    });
  }, [data, poolsWithDetails]);

  // Fetch REAL pool details (binStep, baseFee) from Meteora SDK
  useEffect(() => {
    async function fetchDetails() {
      const pools = [
        ...(data?.recent?.pools || []),
        ...(data?.aboutToGraduate?.pools || []),
        ...(data?.graduated?.pools || []),
      ];

      // Get unique Meteora pools that need details
      const meteoraPools = Array.from(
        new Map(pools.map(pool => [pool.id, pool])).values()
      ).filter(pool => pool.type === 'dlmm' || pool.type.startsWith('damm'));

      // Skip if no Meteora pools to fetch
      if (meteoraPools.length === 0) {
        return;
      }

      console.log(`🚀 Fetching details for ALL ${meteoraPools.length} Meteora pools in ONE request...`);

      // Fetch ALL pools in ONE bulk request - instant like charting.ag!
      const poolsPayload = meteoraPools.map(pool => ({
        poolAddress: pool.id,
        poolType: pool.type,
      }));

      try {
        const response = await fetch('/api/pool-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pools: poolsPayload }),
        });

        const result = await response.json();

        if (result.success && result.detailsMap) {
          // Update all pools at once
          const newDetailsMap = new Map(poolsWithDetails);
          Object.entries(result.detailsMap).forEach(([poolId, details]: [string, any]) => {
            if (details && (details.binStep || details.baseFee)) {
              newDetailsMap.set(poolId, details);
            }
          });
          setPoolsWithDetails(newDetailsMap);
          console.log(`✅ Loaded REAL data for ${newDetailsMap.size} pools instantly!`);
        }
      } catch (error) {
        console.error('❌ Failed to bulk fetch pool details:', error);
      }
    }

    // Only fetch if we have data and haven't fetched details yet
    if (data && poolsWithDetails.size === 0) {
      fetchDetails();
    }
  }, [data]); // Removed poolsWithDetails from deps to prevent infinite loop

  // Aggregate pools by token (for Token view)
  const aggregatedTokens = useMemo(() => {
    const tokenMap = new Map<string, TokenData>();

    allPools.forEach(pool => {
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

    return Array.from(tokenMap.values());
  }, [allPools]);

  // Apply filters and sorting to pools
  const filteredPools = useMemo(() => {
    let filtered = allPools;

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
      if (poolSortBy === 'fees') {
        const aFees = (a.baseAsset.stats24h?.fees || 0);
        const bFees = (b.baseAsset.stats24h?.fees || 0);
        return bFees - aFees;
      }
      if (poolSortBy === 'feeTV') {
        const aFeeTV = (a.baseAsset.stats24h?.fees || 0) / (a.baseAsset.liquidity || 1);
        const bFeeTV = (b.baseAsset.stats24h?.fees || 0) / (b.baseAsset.liquidity || 1);
        return bFeeTV - aFeeTV;
      }
      return 0;
    });

    return filtered;
  }, [allPools, protocolFilter, poolSortBy]);

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

  return (
    <MainLayout searchTerm={searchTerm} onSearchChange={setSearchTerm}>
      <div className="h-[calc(100vh-80px)] flex flex-col">

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-error font-medium mb-2">Failed to load pools</p>
              <p className="text-sm text-foreground-muted">{error.message}</p>
            </div>
          </div>
        )}

        {/* Split Layout - Tokens (Left) + Pools (Right) */}
        {!error && (
          <div className="flex-1 overflow-hidden bg-background flex">
              {/* Left: Token Column with Filter Bar */}
              <div className="w-[40%] border-r border-border-light flex flex-col">
                {/* Token Filter Bar */}
                <div className="px-4 py-2 border-b border-border-light">
                  <div className="flex flex-col gap-2">
                    {/* Sort and Search Row */}
                    <div className="flex items-center justify-between gap-2">
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
                      <div className="px-2 py-1 bg-background-secondary rounded-lg border border-border-light">
                        <span className="text-xs font-medium text-foreground-muted">
                          {filteredTokens.length} tokens
                        </span>
                      </div>
                    </div>

                    {/* Filters Row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min Liquidity"
                        value={minLiquidity}
                        onChange={(e) => setMinLiquidity(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-background-secondary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground-muted"
                      />
                      <input
                        type="number"
                        placeholder="Max Liquidity"
                        value={maxLiquidity}
                        onChange={(e) => setMaxLiquidity(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-background-secondary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Token Table */}
                <div className="flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-foreground-muted text-sm">Loading tokens...</p>
                      </div>
                    </div>
                  ) : (
                    <TokenTable
                      tokens={filteredTokens.filter(token =>
                        searchTerm
                          ? token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            token.name.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )}
                      onTokenClick={(token) => {
                        // When clicking a token, navigate to its primary pool (highest volume)
                        const primaryPool = token.pools.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))[0];
                        if (primaryPool) {
                          router.push(`/pool/${primaryPool.id}`);
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Right: Pool Column with Filter Bar */}
              <div className="flex-1 flex flex-col">
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
                          <option value="fees">Fees</option>
                          <option value="feeTV">Fee/TV</option>
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
                <div className="flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-foreground-muted text-sm">Loading pools...</p>
                      </div>
                    </div>
                  ) : (
                    <PoolTable
                      pools={filteredPools.filter(pool =>
                        searchTerm
                          ? pool.baseAsset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            pool.baseAsset.name.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )}
                      onPoolClick={(pool) => {
                        // Navigate to pool detail page instead of showing modal
                        router.push(`/pool/${pool.id}`);
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
