/**
 * Claim Fees Panel for DLMM Pools
 * Allows users to claim swap fees and LM rewards from their positions
 * Uses DLMM SDK: claimAllRewardsByPosition() and fetchUserPositions()
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import toast from 'react-hot-toast';

interface ClaimFeesPanelProps {
  poolAddress: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

export function ClaimFeesPanel({
  poolAddress,
  tokenXSymbol,
  tokenYSymbol,
}: ClaimFeesPanelProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const { fetchUserPositions, claimAllRewards } = useDLMM();

  const [loading, setLoading] = useState(false);
  const [fetchingPositions, setFetchingPositions] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());

  // Fetch user's positions with unclaimed fees
  useEffect(() => {
    if (!connected || !publicKey) {
      setPositions([]);
      return;
    }

    const loadPositions = async () => {
      setFetchingPositions(true);
      try {
        const allPositions = await fetchUserPositions();
        // Filter for this specific pool and positions with unclaimed fees
        const poolPositions = allPositions.filter(p =>
          p.poolAddress === poolAddress &&
          (p.unclaimedFeesBase > 0 || p.unclaimedFeesQuote > 0)
        );
        setPositions(poolPositions);

        // Auto-select all positions by default
        setSelectedPositions(new Set(poolPositions.map(p => p.positionKey)));
      } catch (error: any) {
        console.error('Error fetching positions:', error);
        toast.error('Failed to load positions');
      } finally {
        setFetchingPositions(false);
      }
    };

    loadPositions();
  }, [connected, publicKey, poolAddress, fetchUserPositions]);

  const togglePosition = (pubkey: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(pubkey)) {
      newSelected.delete(pubkey);
    } else {
      newSelected.add(pubkey);
    }
    setSelectedPositions(newSelected);
  };

  const selectAll = () => {
    if (selectedPositions.size === positions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(positions.map(p => p.positionKey)));
    }
  };

  const calculateTotalFees = () => {
    let totalX = 0;
    let totalY = 0;

    positions.forEach(position => {
      if (selectedPositions.has(position.positionKey)) {
        totalX += position.unclaimedFeesBase;
        totalY += position.unclaimedFeesQuote;
      }
    });

    return { totalX, totalY };
  };

  const handleClaimSelected = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (selectedPositions.size === 0) {
      toast.error('Please select at least one position');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Claiming fees from ${selectedPositions.size} position(s)...`);

    try {
      let successCount = 0;
      let failCount = 0;
      const signatures: string[] = [];

      // Claim rewards for each selected position
      for (const positionKey of Array.from(selectedPositions)) {
        try {
          const result = await claimAllRewards({
            poolAddress,
            positionAddress: positionKey,
          });

          if (result.success) {
            successCount++;
            signatures.push(result.signature);
          }
        } catch (error: any) {
          console.error(`Failed to claim from position ${positionKey}:`, error);
          failCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          <div>
            <p>Claimed fees from {successCount} position(s)!</p>
            {signatures.length > 0 && (
              <a
                href={`https://solscan.io/tx/${signatures[0]}?cluster=${network}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline text-xs"
              >
                View first transaction →
              </a>
            )}
          </div>,
          { id: loadingToast, duration: 8000 }
        );

        // Refresh positions
        const allPositions = await fetchUserPositions();
        const poolPositions = allPositions.filter(p =>
          p.poolAddress === poolAddress &&
          (p.unclaimedFeesBase > 0 || p.unclaimedFeesQuote > 0)
        );
        setPositions(poolPositions);
        setSelectedPositions(new Set());
      }

      if (failCount > 0) {
        toast.error(`Failed to claim from ${failCount} position(s)`, { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Error claiming fees:', error);
      toast.error(error.message || 'Failed to claim fees', { id: loadingToast });
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
          Connect your wallet to view and claim your fees.
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
        <div className="text-4xl mb-4">💰</div>
        <h3 className="text-lg font-semibold text-white mb-2">No Unclaimed Fees</h3>
        <p className="text-sm text-gray-400">
          You don't have any unclaimed fees in this pool yet.
        </p>
      </div>
    );
  }

  const totals = calculateTotalFees();

  return (
    <div className="space-y-6">
      {/* Total Unclaimed Fees Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
        <h3 className="text-sm font-semibold text-white mb-3">Total Unclaimed (Selected)</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{tokenXSymbol} Fees</span>
            <span className="text-lg font-bold text-success">{totals.totalX.toFixed(6)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{tokenYSymbol} Fees</span>
            <span className="text-lg font-bold text-success">{totals.totalY.toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Position Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">
            Select Positions ({selectedPositions.size} of {positions.length})
          </label>
          <button
            onClick={selectAll}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {selectedPositions.size === positions.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-2">
          {positions.map((position) => (
            <button
              key={position.positionKey}
              onClick={() => togglePosition(position.positionKey)}
              disabled={loading}
              className={`
                w-full p-4 rounded-lg border transition-all text-left
                ${selectedPositions.has(position.positionKey)
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-white block mb-1">
                    Position #{position.positionKey.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {position.binPositions?.length || 0} bins
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedPositions.has(position.positionKey)
                      ? 'border-primary bg-primary'
                      : 'border-gray-600 bg-gray-700'
                  }`}>
                    {selectedPositions.has(position.positionKey) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Unclaimed {tokenXSymbol}</span>
                  <div className="text-sm text-success font-semibold">
                    {position.unclaimedFeesBase.toFixed(6)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Unclaimed {tokenYSymbol}</span>
                  <div className="text-sm text-success font-semibold">
                    {position.unclaimedFeesQuote.toFixed(6)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Claim Button */}
      <Button
        onClick={handleClaimSelected}
        disabled={!connected || loading || selectedPositions.size === 0}
        variant="success"
        size="lg"
        loading={loading}
        className="w-full"
      >
        {!connected
          ? 'Connect Wallet'
          : selectedPositions.size === 0
            ? 'Select Position(s)'
            : `Claim Fees (${selectedPositions.size} position${selectedPositions.size !== 1 ? 's' : ''})`
        }
      </Button>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <p className="text-xs text-green-300">
          <strong>Tip:</strong> Claiming fees does not remove your liquidity. Your positions will continue earning fees after claiming.
        </p>
      </div>
    </div>
  );
}
