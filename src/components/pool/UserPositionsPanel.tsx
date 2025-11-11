/**
 * User Positions Panel - Shows user's positions for a specific pool
 * Allows quick actions: Claim Fees, Remove Liquidity, Close Position
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserPositionsForPool } from '@/lib/hooks/useUserPositions';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import { Button } from '@/components/ui';
import { formatReadableNumber } from '@/lib/format/number';
import toast from 'react-hot-toast';

interface UserPositionsPanelProps {
  poolAddress: string;
  poolType: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

export function UserPositionsPanel({
  poolAddress,
  poolType,
  tokenXSymbol,
  tokenYSymbol,
}: UserPositionsPanelProps) {
  const { connected } = useWallet();
  const { data: positions, isLoading, error } = useUserPositionsForPool(poolAddress);

  // DLMM hooks
  const { claimAllRewards, removeLiquidityFromPosition } = useDLMM();

  // DAMM v2 hooks
  const { claimFees, removeLiquidity, closePosition } = useDAMMv2();

  // Loading states per position
  const [loadingClaim, setLoadingClaim] = useState<{ [key: string]: boolean }>({});
  const [loadingRemove, setLoadingRemove] = useState<{ [key: string]: boolean }>({});
  const [removePercentage, setRemovePercentage] = useState<{ [key: string]: number }>({});

  // Handle claim fees
  const handleClaimFees = async (positionAddress: string) => {
    setLoadingClaim({ ...loadingClaim, [positionAddress]: true });
    const toastId = toast.loading('Claiming fees...');

    try {
      if (poolType === 'dlmm') {
        await claimAllRewards({
          poolAddress,
          positionAddress,
        });
      } else if (poolType === 'damm-v2') {
        await claimFees({ poolAddress });
      }

      toast.success('Fees claimed successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Claim fees error:', error);
      toast.error(error.message || 'Failed to claim fees', { id: toastId });
    } finally {
      setLoadingClaim({ ...loadingClaim, [positionAddress]: false });
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async (positionAddress: string) => {
    const percentage = removePercentage[positionAddress] || 100;
    setLoadingRemove({ ...loadingRemove, [positionAddress]: true });
    const toastId = toast.loading(`Removing ${percentage}% liquidity...`);

    try {
      if (poolType === 'dlmm') {
        await removeLiquidityFromPosition({
          poolAddress,
          positionAddress,
          bps: percentage * 100, // Convert % to basis points
        });
      } else if (poolType === 'damm-v2') {
        // DAMM v2 uses liquidity amount, not percentage
        toast.error('DAMM v2 remove liquidity not yet implemented', { id: toastId });
        return;
      }

      toast.success('Liquidity removed successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      toast.error(error.message || 'Failed to remove liquidity', { id: toastId });
    } finally {
      setLoadingRemove({ ...loadingRemove, [positionAddress]: false });
    }
  };

  // Show wallet connection prompt
  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800/30">
        <div className="text-center">
          <div className="text-4xl mb-3">👛</div>
          <h3 className="text-sm font-semibold text-white mb-1">Connect Wallet</h3>
          <p className="text-xs text-gray-400">Connect to view your positions</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-800/30">
        <div className="px-4 py-2 border-b border-border-light">
          <h3 className="text-sm font-semibold text-white">Active Positions</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // No positions - Charting.ag clean style
  if (!positions || positions.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-800/30">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border-light">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Active Positions</h3>
            <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              View All
            </button>
          </div>
        </div>

        {/* Table Headers */}
        <div className="px-4 py-2 bg-background-secondary/30 border-b border-border-light">
          <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-400">
            <div>Pair</div>
            <div>Liquidity</div>
            <div>Price Range</div>
            <div>Total Pnl (ROI%)</div>
            <div className="text-right">Claimable Fees</div>
            <div className="text-center">Actions</div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">No active positions found</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalLiquidityUSD = positions.reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const totalUnclaimedFeesUSD = positions.reduce((sum, p) => {
    // For now, just count the unclaimed fees without USD conversion
    const feeValueUSD = (p.unclaimedFeesBase + p.unclaimedFeesQuote);
    return sum + feeValueUSD;
  }, 0);

  // Render positions - Clean Charting.ag Style
  return (
    <div className="h-full flex flex-col bg-gray-800/30">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-sm font-semibold text-white">Active Positions</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Total Liquidity</span>
              <span className="font-semibold text-white">${formatReadableNumber(totalLiquidityUSD, { decimals: 2, compact: true })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Unclaimed Fee</span>
              <span className="font-semibold text-success">${formatReadableNumber(totalUnclaimedFeesUSD, { decimals: 2, compact: true })}</span>
            </div>
          </div>
        </div>
        <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          View All ({positions.length})
        </button>
      </div>

      {/* Table Headers */}
      <div className="px-4 py-2 bg-background-secondary/30 border-b border-border-light">
        <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-400">
          <div>Pair</div>
          <div>Liquidity</div>
          <div>Price Range</div>
          <div>Total Pnl (ROI%)</div>
          <div className="text-right">Claimable Fees</div>
          <div className="text-center">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border-light">
          {positions.map((position) => {
            const hasUnclaimedFees = position.unclaimedFeesBase > 0 || position.unclaimedFeesQuote > 0;
            const currentRemovePercentage = removePercentage[position.address] || 100;
            const feeValueUSD = position.unclaimedFeesBase + position.unclaimedFeesQuote;

            return (
              <div key={position.address} className="px-4 py-3 hover:bg-background-secondary/20 transition-colors">
                <div className="grid grid-cols-6 gap-4 items-center">
                  {/* Pair */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-white">{tokenXSymbol}-{tokenYSymbol}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{position.address.slice(0, 8)}...</span>
                  </div>

                  {/* Liquidity */}
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-mono text-white">
                      {formatReadableNumber(position.baseAmount, { decimals: 2, compact: true })} {tokenXSymbol}
                    </div>
                    <div className="text-xs font-mono text-gray-400">
                      {formatReadableNumber(position.quoteAmount, { decimals: 2, compact: true })} {tokenYSymbol}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    {poolType === 'dlmm' ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-white">Bin {position.lowerBinId} → {position.upperBinId}</span>
                        <span className="text-xs text-gray-400">{position.upperBinId - position.lowerBinId + 1} bins</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Full Range</div>
                    )}
                  </div>

                  {/* Total Pnl (ROI%) - Placeholder */}
                  <div className="text-sm text-gray-500">-</div>

                  {/* Claimable Fees */}
                  <div className="text-right">
                    {hasUnclaimedFees ? (
                      <div className="flex flex-col gap-0.5 items-end">
                        <div className="text-sm font-semibold text-success">${feeValueUSD.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          {formatReadableNumber(position.unclaimedFeesBase, { decimals: 4, compact: true })} / {formatReadableNumber(position.unclaimedFeesQuote, { decimals: 4, compact: true })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">$0</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-2">
                    {/* Claim Fees Button */}
                    {hasUnclaimedFees && (
                      <button
                        onClick={() => handleClaimFees(position.address)}
                        disabled={loadingClaim[position.address]}
                        className="px-3 py-1.5 text-xs font-semibold bg-success/10 text-success hover:bg-success/20 rounded transition-colors disabled:opacity-50"
                      >
                        {loadingClaim[position.address] ? '...' : 'Claim'}
                      </button>
                    )}

                    {/* Remove Liquidity Dropdown */}
                    <details className="group relative">
                      <summary className="px-3 py-1.5 text-xs font-semibold bg-error/10 text-error hover:bg-error/20 rounded cursor-pointer transition-colors list-none">
                        Remove
                      </summary>
                      <div className="absolute right-0 mt-1 p-3 bg-background-secondary border border-border-light rounded-lg shadow-xl z-20 w-48">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">Amount</span>
                            <span className="text-sm font-bold text-white">{currentRemovePercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={currentRemovePercentage}
                            onChange={(e) => setRemovePercentage({
                              ...removePercentage,
                              [position.address]: parseInt(e.target.value)
                            })}
                            className="w-full h-1.5 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <div className="flex gap-1">
                            {[25, 50, 75, 100].map((percent) => (
                              <button
                                key={percent}
                                onClick={() => setRemovePercentage({
                                  ...removePercentage,
                                  [position.address]: percent
                                })}
                                className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${
                                  currentRemovePercentage === percent
                                    ? 'bg-primary text-white'
                                    : 'bg-background-tertiary text-gray-400 hover:text-white'
                                }`}
                              >
                                {percent}%
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRemoveLiquidity(position.address)}
                            disabled={loadingRemove[position.address]}
                            className="w-full px-3 py-1.5 text-xs font-semibold bg-error text-white hover:bg-error/80 rounded transition-colors disabled:opacity-50 mt-2"
                          >
                            {loadingRemove[position.address] ? 'Removing...' : `Remove ${currentRemovePercentage}%`}
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
