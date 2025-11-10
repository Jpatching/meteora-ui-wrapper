/**
 * Token Detail Page - Comprehensive analytics with AI features
 * URL: /solana/{mint} (matches charting.ag pattern)
 * Three-column layout: Token Info | Chart + Analytics | Trading + AI
 */

'use client';

import { use, useState, useEffect } from 'react';
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

interface TokenPageProps {
  params: Promise<{ mint: string }>;
}

export default function TokenPage({ params }: TokenPageProps) {
  const resolvedParams = use(params);
  const { mint } = resolvedParams;
  const router = useRouter();
  const { network } = useNetwork();
  const searchParams = useSearchParams();

  // Get pool address from query parameter
  const poolAddress = searchParams.get('pool');

  // Fetch pool from unified backend endpoint with network filtering
  // URL shows /solana/{mint} but we fetch by pool address internally
  const { data: rawPool, isLoading, error } = useBackendPool(poolAddress, network);

  // State for enriched pool with token metadata
  const [pool, setPool] = useState<Pool | null>(null);
  const [enriching, setEnriching] = useState(false);

  // Enrich pool with token metadata (logos, etc.)
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
  if (isLoading || (rawPool && !pool)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">
              {isLoading ? 'Loading pool details...' : 'Loading token metadata...'}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Handle error or not found
  if (error || !pool) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-white mb-2">Token Not Found</h1>
            <p className="text-text-secondary mb-6">
              The token at address <code className="bg-surface-light px-2 py-1 rounded text-sm">{mint}</code> could not be found.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Pool found - render pool details (Charting.ag + Meteora Hybrid Layout)
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
                  {pool.baseAsset.icon && (
                    <img src={pool.baseAsset.icon} alt={pool.baseAsset.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                  )}
                  {pool.quoteAsset?.icon && (
                    <img src={pool.quoteAsset.icon} alt={pool.quoteAsset.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{pool.baseAsset.symbol}</h1>
                  <p className="text-[10px] text-gray-500">{pool.baseAsset.id.slice(0, 8)}...{pool.baseAsset.id.slice(-6)}</p>
                </div>
              </div>

              {/* Metadata Tile */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-background-secondary/30 rounded-lg border border-border-light">
                {pool.baseAsset.name && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Name:</span>
                    <span className="text-xs font-medium text-white">{pool.baseAsset.name}</span>
                  </div>
                )}
                {pool.type && (
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
              </div>
            </div>

            {/* Social Links Tile */}
            {(pool.baseAsset.twitter || pool.baseAsset.telegram || pool.baseAsset.website) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background-secondary/30 rounded-lg border border-border-light">
                <span className="text-[10px] text-gray-400 mr-1">Links:</span>
                {pool.baseAsset.twitter && (
                  <a
                    href={pool.baseAsset.twitter}
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
                {pool.baseAsset.telegram && (
                  <a
                    href={pool.baseAsset.telegram}
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
                {pool.baseAsset.website && (
                  <a
                    href={pool.baseAsset.website}
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
                <div className="text-sm font-bold text-white">${(pool.baseAsset.usdPrice || 0).toFixed(4)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">24h Vol</div>
                <div className="text-sm font-bold text-white">${((pool.volume24h || 0) / 1000).toFixed(1)}K</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">MCap</div>
                <div className="text-sm font-bold text-white">${((pool.baseAsset.liquidity || 0) / 1000).toFixed(0)}K</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Liquidity</div>
                <div className="text-sm font-bold text-white">${((pool.baseAsset.liquidity || 0) / 1000).toFixed(1)}K</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: 3-Column Layout - Charting.ag Style */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar (280px) - Related Pools List */}
          <div className="w-[280px] flex-shrink-0 border-r border-border-light overflow-hidden">
            <PoolListSidebar currentPool={pool} network={network} />
          </div>

          {/* Center: Chart (dominates) + Collapsed Active Positions (flex-1) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">
            {/* Chart - Slightly reduced from charting.ag to give Active Positions more space */}
            <div className="flex-[3] overflow-hidden min-h-0">
              <ChartDetailsPanel pool={pool} />
            </div>

            {/* Active Positions - Clean Tile Format (charting.ag style) */}
            <div className="flex-[1] min-h-[180px] max-h-[280px] flex-shrink-0 border-t border-border-light overflow-hidden">
              <UserPositionsPanel
                poolAddress={pool.id}
                poolType={pool.type}
                tokenXSymbol={pool.baseAsset.symbol}
                tokenYSymbol={pool.quoteAsset?.symbol || 'USDC'}
              />
            </div>
          </div>

          {/* Right Sidebar (400px) - Pool Actions + Liquidity Distribution */}
          <div className="w-[400px] flex-shrink-0 border-l border-border-light overflow-y-auto bg-background">
            {/* Pool Actions Panel - Top Half */}
            <div className="flex-shrink-0">
              <PoolActionsPanel
                poolAddress={pool.id}
                tokenXMint={pool.baseAsset.id}
                tokenYMint={pool.quoteAsset?.id || ''}
                tokenXSymbol={pool.baseAsset.symbol}
                tokenYSymbol={pool.quoteAsset?.symbol || 'USDC'}
                currentPrice={pool.baseAsset.usdPrice || 0}
                binStep={(pool as any).binStep || 20}
                baseFee={(pool as any).baseFee || 0.2}
                poolType={pool.type}
              />
            </div>

            {/* Liquidity Distribution - Bottom Half (Scrollable) */}
            <div className="flex-shrink-0 mt-2">
              <LiquidityDistributionPanel pool={pool} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
