'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { usePositions } from '@/lib/hooks/usePositions';
import { PortfolioSummary, PositionsList } from '@/components/positions';
import { PositionHealthMonitor } from '@/components/positions/PositionHealthMonitor';
import { toast } from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDLMM } from '@/lib/meteora/useDLMM';

export const dynamic = 'force-dynamic';

export default function PositionsPage() {
  const { connected } = useWallet();
  const { claimAllRewards, removeLiquidityFromPosition } = useDLMM();
  const [processingPosition, setProcessingPosition] = useState<string | null>(null);

  const {
    positions,
    totalValue,
    totalPNL,
    totalPNLPercent,
    totalFeesEarned,
    loading: positionsLoading,
    error: positionsError,
    refreshPositions,
  } = usePositions();

  // Handle claiming fees for a position
  const handleClaimFees = async (position: typeof positions[0]) => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!position.positionAddress) {
      toast.error('Position address not found');
      return;
    }

    setProcessingPosition(position.id);
    const loadingToast = toast.loading(`Claiming fees for ${position.baseSymbol}/${position.quoteSymbol}...`);

    try {
      const result = await claimAllRewards({
        poolAddress: position.poolAddress,
        positionAddress: position.positionAddress,
      });

      if (result.success) {
        toast.success(`Successfully claimed fees! Transaction: ${result.signature.slice(0, 8)}...`, {
          id: loadingToast,
          duration: 5000,
        });
        // Refresh positions to show updated unclaimed fees
        setTimeout(() => refreshPositions(), 2000);
      } else {
        toast.error('Failed to claim fees', { id: loadingToast });
      }
    } catch (error: any) {
      console.error('Error claiming fees:', error);
      toast.error(error.message || 'Failed to claim fees', { id: loadingToast });
    } finally {
      setProcessingPosition(null);
    }
  };

  // Handle closing a position (remove 100% liquidity)
  const handleClosePosition = async (position: typeof positions[0]) => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!position.positionAddress) {
      toast.error('Position address not found');
      return;
    }

    setProcessingPosition(position.id);
    const loadingToast = toast.loading(`Closing position ${position.baseSymbol}/${position.quoteSymbol}...`);

    try {
      // Remove 100% of liquidity (10000 basis points = 100%)
      const result = await removeLiquidityFromPosition({
        poolAddress: position.poolAddress,
        positionAddress: position.positionAddress,
        bps: 10000, // 100%
      });

      if (result.success) {
        toast.success(`Successfully closed position! Transaction: ${result.signature.slice(0, 8)}...`, {
          id: loadingToast,
          duration: 5000,
        });
        // Refresh positions to remove closed position from list
        setTimeout(() => refreshPositions(), 2000);
      } else {
        toast.error('Failed to close position', { id: loadingToast });
      }
    } catch (error: any) {
      console.error('Error closing position:', error);
      toast.error(error.message || 'Failed to close position', { id: loadingToast });
    } finally {
      setProcessingPosition(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Positions</h1>
            <p className="text-foreground-muted">
              Monitor your active positions and portfolio health
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              refreshPositions();
              toast.success('Refreshing positions...');
            }}
            disabled={positionsLoading}
          >
            {positionsLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>

        {/* Portfolio Summary */}
        <PortfolioSummary
          totalValue={totalValue}
          totalPNL={totalPNL}
          totalPNLPercent={totalPNLPercent}
          totalFeesEarned={totalFeesEarned}
          positionCount={positions.length}
          loading={positionsLoading}
        />

        {/* Error State */}
        {positionsError && (
          <Card className="border-error/20 bg-error/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-medium text-error">Failed to load positions</p>
                  <p className="text-sm text-foreground-muted">{positionsError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Active Positions</h2>
          <PositionsList
            positions={positions}
            loading={positionsLoading || processingPosition !== null}
            onClaim={handleClaimFees}
            onClose={handleClosePosition}
            onViewDetails={(position) => {
              // TODO: Navigate to position details page
              console.log('View details:', position);
            }}
          />
        </div>

        {/* Health Monitor Section */}
        <div>
          <h2 className="text-xl font-bold mb-4">Position Health Monitor</h2>
          <PositionHealthMonitor
            positions={positions.map(pos => ({
              poolId: pos.poolAddress,
              symbol: `${pos.baseSymbol}/${pos.quoteSymbol}`,
              isInRange: true, // TODO: Calculate based on actual price ranges when available
              efficiency: pos.healthScore, // Use healthScore as efficiency metric
              impermanentLoss: pos.impermanentLoss || 0,
              rangeMin: 0, // TODO: Add these fields to PositionWithPNL type
              rangeMax: 0, // TODO: Add these fields to PositionWithPNL type
              currentPrice: 0, // TODO: Add these fields to PositionWithPNL type
              feesEarned24h: pos.unclaimedFeesUSD / 7, // Rough estimate
              totalFeesEarned: pos.unclaimedFeesUSD,
              liquidityUSD: pos.currentValue,
              lastChecked: Date.now(),
            }))}
            onRebalance={(suggestion) => {
              toast.success(`Rebalancing ${suggestion.symbol}...`);
              // TODO: Implement rebalancing logic
              console.log('Rebalance suggestion:', suggestion);
            }}
            soundEnabled={true}
            notificationsEnabled={true}
          />
        </div>
      </div>
    </MainLayout>
  );
}
