'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { TradingChart } from '@/components/charts/TradingChart';
import { useMeteoraPools } from '@/lib/hooks/usePublicPools';
import { useGeckoTerminalChartData } from '@/hooks/queries/useGeckoTerminalChartData';
import { useState } from 'react';
import type { ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { formatReadableNumber, formatUSD } from '@/lib/format/number';
import { formatTimeAgo } from '@/lib/format/date';

interface PositionPageProps {
  params: Promise<{
    poolId: string;
  }>;
}

export default function PositionPage({ params }: PositionPageProps) {
  const router = useRouter();
  const { poolId } = use(params);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [interval, setInterval] = useState<TimeInterval>('15m');

  // Fetch pool data - FIXED: Use useMeteoraPools to match PoolExplorer component
  const { data: poolsData, isLoading: poolsLoading } = useMeteoraPools();

  // Search across all categories for the pool
  const pool = poolsData?.recent?.pools?.find((p) => p.id === poolId) ||
               poolsData?.aboutToGraduate?.pools?.find((p) => p.id === poolId) ||
               poolsData?.graduated?.pools?.find((p) => p.id === poolId);

  // Debug logging
  console.log('[Position Page] Pool ID:', poolId);
  console.log('[Position Page] Pools loading:', poolsLoading);
  console.log('[Position Page] Pool found:', !!pool);

  // Fetch chart data from GeckoTerminal (free Solana DEX aggregator)
  const { data: chartDataPoints, loading: chartLoading, currentPrice, priceChange24h } = useGeckoTerminalChartData({
    pool: pool || null,
    interval,
  });

  // Mock position data (TODO: Replace with actual user position data)
  const positionData = {
    rangeMin: currentPrice * 0.85, // 15% below current price
    rangeMax: currentPrice * 1.15, // 15% above current price
    liquidityUSD: 12500,
    feesEarned24h: 87.32,
    feesEarnedTotal: 1243.78,
    impermanentLoss: -2.3,
    efficiency: 78.5,
    tokenAAmount: 5000,
    tokenBAmount: 2500,
    createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
  };

  // FIXED: Distinguish between loading and not found states
  if (poolsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground-muted">Loading position...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!pool) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h1 className="text-2xl font-bold text-foreground mb-2">Pool Not Found</h1>
            <p className="text-foreground-muted mb-2">
              Could not find pool with ID:
            </p>
            <code className="block bg-background-secondary px-4 py-2 rounded-lg text-sm text-foreground-muted mb-6 max-w-md mx-auto break-all">
              {poolId}
            </code>
            <p className="text-sm text-foreground-muted mb-6">
              This pool may not exist, or it may have been removed from recent listings.
            </p>
            <Button variant="primary" onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // currentPrice and priceChange24h are already available from useBirdeyeChartData hook
  const isInRange = currentPrice >= positionData.rangeMin && currentPrice <= positionData.rangeMax;
  const priceChangePercent = priceChange24h;

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Pools
        </button>

      {/* Position Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {pool.baseAsset.icon && (
            <img
              src={pool.baseAsset.icon}
              alt={pool.baseAsset.symbol}
              className="w-16 h-16 rounded-full border-2 border-border"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              {pool.baseAsset.symbol} Position
            </h1>
            <p className="text-foreground-muted">{pool.baseAsset.name}</p>
          </div>
        </div>

        {/* Position Status Badge */}
        <div className={`px-4 py-2 rounded-lg font-semibold ${
          isInRange
            ? 'bg-success/20 text-success border border-success/30'
            : 'bg-warning/20 text-warning border border-warning/30'
        }`}>
          {isInRange ? '🟢 In Range' : '🟡 Out of Range'}
        </div>
      </div>

      {/* Position Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquidity */}
        <Card hover gradient>
          <CardContent className="pt-6">
            <div className="text-sm text-foreground-muted mb-1">Total Liquidity</div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatUSD(positionData.liquidityUSD)}
            </div>
          </CardContent>
        </Card>

        {/* Fees Earned (24h) */}
        <Card hover gradient>
          <CardContent className="pt-6">
            <div className="text-sm text-foreground-muted mb-1">Fees (24h)</div>
            <div className="text-2xl font-bold text-success font-mono">
              +{formatUSD(positionData.feesEarned24h)}
            </div>
          </CardContent>
        </Card>

        {/* Total Fees */}
        <Card hover gradient>
          <CardContent className="pt-6">
            <div className="text-sm text-foreground-muted mb-1">Total Fees</div>
            <div className="text-2xl font-bold text-success font-mono">
              +{formatUSD(positionData.feesEarnedTotal)}
            </div>
          </CardContent>
        </Card>

        {/* Efficiency */}
        <Card hover gradient>
          <CardContent className="pt-6">
            <div className="text-sm text-foreground-muted mb-1">Efficiency</div>
            <div className={`text-2xl font-bold font-mono ${
              positionData.efficiency >= 70 ? 'text-success' :
              positionData.efficiency >= 50 ? 'text-warning' :
              'text-error'
            }`}>
              {positionData.efficiency.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart with Range Overlay */}
      <Card>
        <CardHeader>
          <CardTitle>Price Chart with Position Range</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Price Display */}
          <div className="mb-4 flex items-baseline gap-3">
            <div className="text-3xl font-bold text-foreground font-mono">
              {formatUSD(currentPrice)}
            </div>
            <div className={`text-lg font-semibold ${priceChangePercent >= 0 ? 'text-success' : 'text-error'}`}>
              {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </div>
          </div>

          {/* Range Indicators */}
          <div className="mb-4 flex items-center gap-4 p-3 bg-background-secondary rounded-lg border border-border">
            <div className="flex-1">
              <div className="text-xs text-foreground-muted mb-1">Min Price</div>
              <div className="text-lg font-bold text-foreground font-mono">
                {formatUSD(positionData.rangeMin)}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-xs text-foreground-muted mb-1">Current Price</div>
              <div className="text-lg font-bold text-primary font-mono">
                {formatUSD(currentPrice)}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-foreground-muted mb-1">Max Price</div>
              <div className="text-lg font-bold text-foreground font-mono">
                {formatUSD(positionData.rangeMax)}
              </div>
            </div>
          </div>

          {/* Visual Range Bar */}
          <div className="mb-6 relative h-2 bg-background-tertiary rounded-full overflow-hidden">
            {/* Range highlight */}
            <div
              className="absolute h-full bg-primary/30"
              style={{
                left: '0%',
                width: '100%',
              }}
            />
            {/* Current price indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"
              style={{
                left: `${((currentPrice - positionData.rangeMin) / (positionData.rangeMax - positionData.rangeMin)) * 100}%`,
              }}
            />
          </div>

          {/* Chart */}
          <TradingChart
            data={chartDataPoints}
            chartType={chartType}
            interval={interval}
            height={600}
            showVolume={true}
            loading={chartLoading}
            onIntervalChange={setInterval}
            onChartTypeChange={setChartType}
          />
        </CardContent>
      </Card>

      {/* Position Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Info */}
        <Card>
          <CardHeader>
            <CardTitle>Position Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Pool Type</span>
              <span className="font-semibold text-foreground uppercase">{pool.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Created</span>
              <span className="font-semibold text-foreground">
                {formatTimeAgo(new Date(positionData.createdAt))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">{pool.baseAsset.symbol} Amount</span>
              <span className="font-semibold text-foreground font-mono">
                {formatReadableNumber(positionData.tokenAAmount, { decimals: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">SOL Amount</span>
              <span className="font-semibold text-foreground font-mono">
                {formatReadableNumber(positionData.tokenBAmount, { decimals: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Impermanent Loss</span>
              <span className={`font-semibold font-mono ${positionData.impermanentLoss >= 0 ? 'text-success' : 'text-error'}`}>
                {positionData.impermanentLoss >= 0 ? '+' : ''}{positionData.impermanentLoss.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Position Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="primary" size="lg" className="w-full">
              Add Liquidity
            </Button>
            <Button variant="secondary" size="lg" className="w-full">
              Rebalance Position
            </Button>
            <Button variant="outline" size="lg" className="w-full">
              Claim Fees
            </Button>
            <Button variant="ghost" size="lg" className="w-full text-error hover:bg-error/10">
              Close Position
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section (Future: Position Health Monitor) */}
      <Card>
        <CardHeader>
          <CardTitle>Position Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {!isInRange && (
              <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-semibold text-warning">Out of Range</div>
                  <div className="text-sm text-foreground-muted">
                    Your position is currently out of range. Consider rebalancing to earn fees.
                  </div>
                </div>
              </div>
            )}
            {positionData.efficiency < 50 && (
              <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-lg">
                <div className="text-2xl">🔴</div>
                <div className="flex-1">
                  <div className="font-semibold text-error">Low Efficiency</div>
                  <div className="text-sm text-foreground-muted">
                    Position efficiency is below 50%. Consider adjusting your range.
                  </div>
                </div>
              </div>
            )}
            {isInRange && positionData.efficiency >= 70 && (
              <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/30 rounded-lg">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <div className="font-semibold text-success">Healthy Position</div>
                  <div className="text-sm text-foreground-muted">
                    Your position is in range and performing well.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}
