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
type SortOption = 'volume' | 'liquidity' | 'holders' | 'txs';
type ViewMode = 'token' | 'pair';

export default function DiscoverPage() {
  const router = useRouter();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [viewMode, setViewMode] = useState<ViewMode>('pair');
  const [showChartModal, setShowChartModal] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState('');
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

  // Apply filters and sorting
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

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
      if (sortBy === 'liquidity') return (b.baseAsset.liquidity || 0) - (a.baseAsset.liquidity || 0);
      if (sortBy === 'holders') return (b.baseAsset.holderCount || 0) - (a.baseAsset.holderCount || 0);
      if (sortBy === 'txs') {
        const aTxs = (a.baseAsset.stats24h?.numBuys || 0) + (a.baseAsset.stats24h?.numSells || 0);
        const bTxs = (b.baseAsset.stats24h?.numBuys || 0) + (b.baseAsset.stats24h?.numSells || 0);
        return bTxs - aTxs;
      }
      return 0;
    });

    return filtered;
  }, [allPools, protocolFilter, sortBy]);

  // Apply filters and sorting to tokens
  const filteredTokens = useMemo(() => {
    let filtered = aggregatedTokens;

    // Protocol filter for tokens (filter by any pool matching the protocol)
    if (protocolFilter !== 'all') {
      filtered = filtered.filter((token) => {
        return token.pools.some((pool) => {
          if (protocolFilter === 'dbc') return pool.baseAsset.launchpad === 'met-dbc';
          if (protocolFilter === 'dlmm') return pool.type === 'dlmm';
          if (protocolFilter === 'damm-v1') return pool.type === 'damm-v1' || pool.type === 'damm';
          if (protocolFilter === 'damm-v2') return pool.type === 'damm-v2';
          if (protocolFilter === 'alpha') return pool.type === 'alpha-vault';
          return true;
        });
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'volume') return b.totalVolume24h - a.totalVolume24h;
      if (sortBy === 'liquidity') return b.totalLiquidity - a.totalLiquidity;
      if (sortBy === 'holders') return b.holders - a.holders;
      if (sortBy === 'txs') {
        const aTxs = a.pools.reduce((sum, p) => sum + (p.baseAsset.stats24h?.numBuys || 0) + (p.baseAsset.stats24h?.numSells || 0), 0);
        const bTxs = b.pools.reduce((sum, p) => sum + (p.baseAsset.stats24h?.numBuys || 0) + (p.baseAsset.stats24h?.numSells || 0), 0);
        return bTxs - aTxs;
      }
      return 0;
    });

    return filtered;
  }, [aggregatedTokens, protocolFilter, sortBy]);

  // Auto-select first pool
  useEffect(() => {
    if (filteredPools.length > 0 && !selectedPool) {
      setSelectedPool(filteredPools[0]);
    }
  }, [filteredPools, selectedPool]);

  return (
    <MainLayout>
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

        {/* Full-Width Pool Table Layout */}
        {!error && (
          <div className="flex-1 overflow-hidden bg-background flex flex-col">
              {/* Clean Filter Bar - Minimal Spacing */}
              <div className="px-6 py-2 border-b border-border-light">
                <div className="flex items-center justify-between gap-6">
                  {/* Left: View Mode + Protocol Filters */}
                  <div className="flex items-center gap-4">
                    {/* Token/Pair Toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewMode('token')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          viewMode === 'token'
                            ? 'bg-background-tertiary text-foreground border border-border-light'
                            : 'text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        Token
                      </button>
                      <button
                        onClick={() => setViewMode('pair')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          viewMode === 'pair'
                            ? 'bg-background-tertiary text-foreground border border-border-light'
                            : 'text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        Pair
                      </button>
                    </div>

                    {/* Protocol Filters */}
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
                  </div>

                  {/* Right: Sort + Count + Search */}
                  <div className="flex items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-foreground-muted text-xs">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-background-secondary border border-border-light rounded-lg px-2 py-1 text-foreground text-xs focus:outline-none focus:border-foreground-muted cursor-pointer"
                      >
                        <option value="volume">Volume</option>
                        <option value="liquidity">Liquidity</option>
                        <option value="holders">Holders</option>
                        <option value="txs">Transactions</option>
                      </select>
                    </div>

                    {/* Pool/Token Count */}
                    <div className="px-2 py-1 bg-background-secondary rounded-lg border border-border-light">
                      <span className="text-xs font-medium text-foreground-muted">
                        {viewMode === 'token' ? `${filteredTokens.length} tokens` : `${filteredPools.length} pools`}
                      </span>
                    </div>

                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Search pairs..."
                      value={tableSearchTerm}
                      onChange={(e) => setTableSearchTerm(e.target.value)}
                      className="px-3 py-1.5 bg-background-secondary border border-border-light rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground-muted w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Table - Switch between Token and Pair views */}
              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-foreground-muted text-sm">Loading {viewMode === 'token' ? 'tokens' : 'pools'}...</p>
                    </div>
                  </div>
                ) : viewMode === 'token' ? (
                  <TokenTable
                    tokens={filteredTokens.filter(token =>
                      tableSearchTerm
                        ? token.symbol.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                          token.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
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
                ) : (
                  <PoolTable
                    pools={filteredPools.filter(pool =>
                      tableSearchTerm
                        ? pool.baseAsset.symbol.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
                          pool.baseAsset.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
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
