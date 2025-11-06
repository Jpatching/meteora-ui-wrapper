/**
 * Remove Liquidity Panel for DLMM Pools
 * Allows users to withdraw liquidity from their positions
 * Uses DLMM SDK: removeLiquidity() and fetchUserPositions()
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import toast from 'react-hot-toast';

interface RemoveLiquidityPanelProps {
  poolAddress: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

export function RemoveLiquidityPanel({
  poolAddress,
  tokenXSymbol,
  tokenYSymbol,
}: RemoveLiquidityPanelProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const { fetchUserPositions, removeLiquidityFromPosition } = useDLMM();

  const [loading, setLoading] = useState(false);
  const [fetchingPositions, setFetchingPositions] = useState(false);
  const [removePercentage, setRemovePercentage] = useState(50);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const percentagePresets = [25, 50, 75, 100];

  // Fetch user's positions for this pool
  useEffect(() => {
    if (!connected || !publicKey) {
      setPositions([]);
      return;
    }

    const loadPositions = async () => {
      setFetchingPositions(true);
      try {
        const allPositions = await fetchUserPositions();
        // Filter for this specific pool
        const poolPositions = allPositions.filter(p => p.poolAddress === poolAddress);
        setPositions(poolPositions);

        // Auto-select first position if only one
        if (poolPositions.length === 1) {
          setSelectedPosition(poolPositions[0].positionKey);
        }
      } catch (error: any) {
        console.error('Error fetching positions:', error);
        toast.error('Failed to load positions');
      } finally {
        setFetchingPositions(false);
      }
    };

    loadPositions();
  }, [connected, publicKey, poolAddress, fetchUserPositions]);

  const handleRemoveLiquidity = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedPosition) {
      toast.error('No position selected');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Removing ${removePercentage}% liquidity...`);

    try {
      // Convert percentage to basis points (10000 = 100%)
      const bps = (removePercentage / 100) * 10000;

      const result = await removeLiquidityFromPosition({
        poolAddress,
        positionAddress: selectedPosition,
        bps: Math.floor(bps),
      });

      if (result.success) {
        toast.success(
          <div>
            <p>Liquidity removed successfully!</p>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-xs"
            >
              View on Solscan →
            </a>
          </div>,
          { id: loadingToast, duration: 8000 }
        );

        // Refresh positions
        const allPositions = await fetchUserPositions();
        const poolPositions = allPositions.filter(p => p.poolAddress === poolAddress);
        setPositions(poolPositions);

        // If we removed 100%, clear selection
        if (removePercentage === 100) {
          setSelectedPosition(null);
        }
      }
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      toast.error(error.message || 'Failed to remove liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-lg font-semibold text-white mb-2">Wallet Not Connected</h3>
        <p className="text-sm text-gray-400 mb-6">
          Connect your wallet to view and manage your liquidity positions.
        </p>
      </div>
    );
  }

  if (fetchingPositions) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-gray-400">Loading your positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">💧</div>
        <h3 className="text-lg font-semibold text-white mb-2">No Positions Found</h3>
        <p className="text-sm text-gray-400">
          You don't have any liquidity positions in this pool yet.
        </p>
      </div>
    );
  }

  const selectedPositionData = positions.find(p => p.positionKey === selectedPosition);

  return (
    <div className="space-y-6">
      {/* Position Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Select Position ({positions.length} found)
        </label>
        <div className="space-y-2">
          {positions.map((position) => (
            <button
              key={position.positionKey}
              onClick={() => setSelectedPosition(position.positionKey)}
              className={`
                w-full p-4 rounded-lg border transition-all text-left
                ${selectedPosition === position.positionKey
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">
                  Position #{position.positionKey.slice(0, 8)}
                </span>
                <span className="text-xs text-gray-400">
                  {position.binPositions?.length || 0} bins
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block">{tokenXSymbol}</span>
                  <span className="text-white font-semibold">{position.baseAmount.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{tokenYSymbol}</span>
                  <span className="text-white font-semibold">{position.quoteAmount.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Unclaimed {tokenXSymbol}</span>
                  <span className="text-success font-semibold">{position.unclaimedFeesBase.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Unclaimed {tokenYSymbol}</span>
                  <span className="text-success font-semibold">{position.unclaimedFeesQuote.toFixed(6)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Remove Percentage Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Remove Amount: {removePercentage}%
        </label>

        {/* Percentage Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {percentagePresets.map((preset) => (
            <button
              key={preset}
              onClick={() => setRemovePercentage(preset)}
              disabled={loading}
              className={`
                px-3 py-2 rounded-lg text-sm font-semibold transition-all
                ${removePercentage === preset
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {preset}%
            </button>
          ))}
        </div>

        {/* Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={removePercentage}
          onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
          disabled={loading}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${removePercentage}%, rgb(55, 65, 81) ${removePercentage}%, rgb(55, 65, 81) 100%)`
          }}
        />
      </div>

      {/* Estimated Withdrawal */}
      {selectedPositionData && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">Estimated Withdrawal</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{tokenXSymbol}</span>
              <span className="font-semibold text-white">
                {(selectedPositionData.baseAmount * (removePercentage / 100)).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{tokenYSymbol}</span>
              <span className="font-semibold text-white">
                {(selectedPositionData.quoteAmount * (removePercentage / 100)).toFixed(4)}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Unclaimed Fees (will be claimed)</span>
                <div className="text-right">
                  <div className="text-success font-semibold">
                    {selectedPositionData.unclaimedFeesBase.toFixed(6)} {tokenXSymbol}
                  </div>
                  <div className="text-success font-semibold">
                    {selectedPositionData.unclaimedFeesQuote.toFixed(6)} {tokenYSymbol}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Liquidity Button */}
      <Button
        onClick={handleRemoveLiquidity}
        disabled={!connected || loading || !selectedPosition}
        variant="danger"
        size="lg"
        loading={loading}
        className="w-full"
      >
        {!connected
          ? 'Connect Wallet'
          : !selectedPosition
            ? 'Select Position'
            : `Remove ${removePercentage}% Liquidity`
        }
      </Button>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <p className="text-xs text-orange-300">
          <strong>Note:</strong> Removing liquidity will also claim any unclaimed fees from the position.
          {removePercentage === 100 && ' Removing 100% will close the position entirely.'}
        </p>
      </div>
    </div>
  );
}
