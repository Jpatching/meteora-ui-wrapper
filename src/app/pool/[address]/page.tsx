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
import { PoolActionsPanel } from '@/components/pool/PoolActionsPanel';
import { SmartAIPanel } from '@/components/pool/SmartAIPanel';
import { AIAssistantPanel } from '@/components/pool/AIAssistantPanel';
import { LiquidityPlanner } from '@/components/pool/LiquidityPlanner';
import { PoolStatisticsPanel } from '@/components/pool/PoolStatisticsPanel';
import { useBackendPool } from '@/lib/hooks/useBackendPools';
import { Pool } from '@/lib/jupiter/types';
import Link from 'next/link';

interface PoolPageProps {
  params: Promise<{ address: string }>;
}

export default function PoolPage({ params }: PoolPageProps) {
  const resolvedParams = use(params);
  const { address } = resolvedParams;
  const router = useRouter();

  // Fetch pool from unified backend endpoint
  const { data: pool, isLoading, error } = useBackendPool(address);

  // Handle loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading pool details...</p>
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
            <h1 className="text-2xl font-bold text-white mb-2">Pool Not Found</h1>
            <p className="text-text-secondary mb-6">
              The pool at address <code className="bg-surface-light px-2 py-1 rounded text-sm">{address}</code> could not be found.
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

  // Pool found - render pool details
  return (
    <MainLayout>
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Token Info */}
        <div className="col-span-12 lg:col-span-3">
          <TokenInfoSidebar pool={pool} />
        </div>

        {/* Center - Chart + Analytics */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <ChartDetailsPanel pool={pool} />
          <PoolStatisticsPanel pool={pool} />
        </div>

        {/* Right Sidebar - Trading + AI */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <PoolActionsPanel
            poolAddress={pool.id}
            tokenXMint={pool.baseAsset.id}
            tokenYMint={pool.quoteAsset?.id || ''}
            tokenXSymbol={pool.baseAsset.symbol}
            tokenYSymbol={pool.quoteAsset?.symbol || 'USDC'}
            currentPrice={pool.baseAsset.usdPrice || 0}
            binStep={(pool as any).binStep || 0}
            baseFee={(pool as any).baseFee || 0}
            poolType={pool.type}
          />
          <SmartAIPanel
            poolAddress={pool.id}
            poolType={pool.type}
            currentPrice={pool.baseAsset.usdPrice || 0}
            binStep={(pool as any).binStep || 0}
            volume24h={pool.volume24h || 0}
            liquidity={pool.baseAsset.liquidity || 0}
          />
          <AIAssistantPanel pool={pool} />
          <LiquidityPlanner pool={pool} />
        </div>
      </div>
    </MainLayout>
  );
}
