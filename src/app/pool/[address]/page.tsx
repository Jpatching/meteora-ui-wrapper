/**
 * Pool Detail Page - Comprehensive analytics with AI features
 * Three-column layout: Token Info | Chart + Analytics | Trading + AI
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ChartDetailsPanel } from '@/components/dashboard/ChartDetailsPanel';
import { TokenInfoSidebar } from '@/components/pool/TokenInfoSidebar';
import { TradingPanel } from '@/components/pool/TradingPanel';
import { AIAssistantPanel } from '@/components/pool/AIAssistantPanel';
import { LiquidityPlanner } from '@/components/pool/LiquidityPlanner';
import { PoolStatisticsPanel } from '@/components/pool/PoolStatisticsPanel';
import { useDLMMPools } from '@/lib/hooks/useDLMMPools';
import { transformMeteoraPoolToPool } from '@/lib/services/meteoraApi';
import { useAllPublicPools } from '@/lib/hooks/usePublicPools';
import { Pool } from '@/lib/jupiter/types';
import Link from 'next/link';

interface PoolPageProps {
  params: Promise<{ address: string }>;
}

export default function PoolPage({ params }: PoolPageProps) {
  const resolvedParams = use(params);
  const { address } = resolvedParams;
  const router = useRouter();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch pools
  const { data: dlmmData } = useDLMMPools({ refetchInterval: 60000 });
  const { data: jupiterData } = useAllPublicPools({ timeframe: '24h', refetchInterval: 90000 });

  // Find the pool by address
  useEffect(() => {
    if (!address) return;

    // Search in DLMM pools
    const dlmmPools = (dlmmData || [])
      .filter(p => !p.hide)
      .map(transformMeteoraPoolToPool);

    const dlmmPool = dlmmPools.find(p => p.id === address);

    if (dlmmPool) {
      setPool(dlmmPool);
      setLoading(false);
      return;
    }

    // Search in DBC pools
    const dbcPools = [
      ...(jupiterData?.recent?.pools || []),
      ...(jupiterData?.aboutToGraduate?.pools || []),
      ...(jupiterData?.graduated?.pools || []),
    ];

    const dbcPool = dbcPools.find(p => p.id === address);

    if (dbcPool) {
      setPool(dbcPool);
      setLoading(false);
      return;
    }

    // Pool not found
    setLoading(false);
  }, [address, dlmmData, jupiterData]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading pool details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!pool) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">🌊</div>
            <h2 className="text-xl font-semibold text-white mb-2">Pool Not Found</h2>
            <p className="text-gray-400 mb-4">
              The pool at address {address} could not be found.
            </p>
            <Link
              href="/discover"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              ← Back to Discover
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <Link
            href="/discover"
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Discover
          </Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-white font-medium">
            {pool.baseAsset.symbol}-SOL
          </span>
        </nav>

        {/* Three-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-6">
          {/* Left Sidebar - Token Info */}
          <div className="space-y-6">
            <TokenInfoSidebar pool={pool} />
          </div>

          {/* Center Content - Chart + Analytics */}
          <div className="space-y-6">
            {/* Trading Chart with Details */}
            <div className="bg-background border border-border-light rounded-xl overflow-hidden">
              <ChartDetailsPanel pool={pool} />
            </div>

            {/* Trading Analytics Tabs */}
            <div className="bg-background border border-border-light rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Trading Analytics</h3>
              <div className="text-gray-400 text-sm">
                Coming soon: Trades feed, buy/sell pressure, depth chart, historical metrics
              </div>
            </div>

            {/* Liquidity Analytics */}
            <div className="bg-background border border-border-light rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Liquidity Analytics</h3>
              <div className="text-gray-400 text-sm">
                Coming soon: Bin distribution, liquidity depth, historical changes
              </div>
            </div>
          </div>

          {/* Right Sidebar - Trading + AI */}
          <div className="space-y-6">
            {/* Trading Panel */}
            <TradingPanel pool={pool} />

            {/* Pool Statistics */}
            <PoolStatisticsPanel pool={pool} />

            {/* AI Assistant */}
            <AIAssistantPanel pool={pool} />

            {/* Liquidity Planner */}
            <LiquidityPlanner pool={pool} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
