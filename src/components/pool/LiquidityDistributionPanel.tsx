/**
 * Liquidity Distribution Panel - Meteora Style
 * Replicates https://www.meteora.ag/dlmm/{poolId} liquidity visualization
 * Shows bin-level liquidity distribution with dual token breakdown
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Pool } from '@/lib/jupiter/types';
import { useBinData } from '@/lib/hooks/useBinData';
import { useUserPositions } from '@/lib/hooks/useUserPositions';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatNumber } from '@/lib/format/number';

interface LiquidityDistributionPanelProps {
  pool: Pool;
}

export function LiquidityDistributionPanel({ pool }: LiquidityDistributionPanelProps) {
  const { publicKey } = useWallet();
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  // Only show for DLMM pools
  const isDLMM = pool.type === 'dlmm';

  // Fetch bin data - use conservative refresh to avoid RPC rate limits
  const { activeBin, binsAroundActive, isLoading, error } = useBinData({
    poolAddress: pool.id,
    enabled: isDLMM,
    refreshInterval: 60000, // Refresh every 60 seconds (reduced from 5s to avoid rate limits)
    binRange: 50, // Show 50 bins around active (reduced from 100 for efficiency)
  });

  // Debug: Log the state received from useBinData
  console.log('[LiquidityDistributionPanel] Current state:', {
    isDLMM,
    poolAddress: pool.id,
    activeBin: activeBin?.binId,
    binsCount: binsAroundActive.length,
    isLoading,
    hasError: !!error,
  });

  // Fetch user positions
  const { data: userPositions } = useUserPositions();
  const myPositions = userPositions?.filter(p => p.poolAddress === pool.id) || [];

  // INTELLIGENT BIN SAMPLING: Reduce bins to ~60-80 for clean visualization
  const sampledBins = useMemo(() => {
    console.log(`[LiquidityChart] Processing bins:`, {
      totalBins: binsAroundActive.length,
      activeBinId: activeBin?.binId,
    });

    if (binsAroundActive.length === 0) {
      console.log(`[LiquidityChart] ⚠️  No bins received from useBinData`);
      return [];
    }

    // Log bins with liquidity for debugging
    const binsWithLiquidity = binsAroundActive.filter(b => b.totalLiquidity > 0);
    console.log(`[LiquidityChart] 💧 Bins with liquidity: ${binsWithLiquidity.length}/${binsAroundActive.length}`);

    if (binsWithLiquidity.length > 0) {
      console.log(`[LiquidityChart] First 5 bins with liquidity:`,
        binsWithLiquidity.slice(0, 5).map(b => ({
          binId: b.binId,
          liquidityX: b.liquidityX.toFixed(6),
          liquidityY: b.liquidityY.toFixed(6),
          total: b.totalLiquidity.toFixed(6),
        }))
      );
    }

    const TARGET_BINS = 70; // Sweet spot for Meteora-like visualization

    if (binsAroundActive.length <= TARGET_BINS) {
      console.log(`[LiquidityChart] Using all ${binsAroundActive.length} bins (under target)`);
      // If we have fewer bins than target, use all
      return binsAroundActive;
    }

    // IMPROVED SAMPLING: Prioritize bins with liquidity
    const activeBinIndex = binsAroundActive.findIndex(b => b.isActive);
    const step = Math.floor(binsAroundActive.length / TARGET_BINS);
    const sampled = [];

    // First, include all bins with significant liquidity
    const significantBins = binsAroundActive.filter(b => b.totalLiquidity > 0);

    if (significantBins.length <= TARGET_BINS) {
      // If bins with liquidity fit in target, use them all plus fill with empty bins
      console.log(`[LiquidityChart] Using ${significantBins.length} bins with liquidity + sampling empty bins`);
      sampled.push(...significantBins);

      // Fill remaining slots with evenly distributed empty bins for context
      const emptyBins = binsAroundActive.filter(b => b.totalLiquidity === 0);
      const fillCount = Math.min(TARGET_BINS - significantBins.length, emptyBins.length);
      const fillStep = Math.floor(emptyBins.length / fillCount) || 1;

      for (let i = 0; i < emptyBins.length && sampled.length < TARGET_BINS; i += fillStep) {
        sampled.push(emptyBins[i]);
      }
    } else {
      // Too many bins with liquidity - sample them
      console.log(`[LiquidityChart] Too many bins with liquidity (${significantBins.length}), sampling...`);
      const liquidityStep = Math.floor(significantBins.length / TARGET_BINS) || 1;
      for (let i = 0; i < significantBins.length; i += liquidityStep) {
        sampled.push(significantBins[i]);
      }
    }

    // Ensure active bin is included
    if (activeBinIndex >= 0 && !sampled.some(b => b.isActive)) {
      console.log(`[LiquidityChart] Adding active bin ${binsAroundActive[activeBinIndex].binId}`);
      sampled.push(binsAroundActive[activeBinIndex]);
    }

    // Sort by bin ID
    sampled.sort((a, b) => a.binId - b.binId);

    console.log(`[LiquidityChart] ✅ Sampled ${sampled.length} bins (${sampled.filter(b => b.totalLiquidity > 0).length} with liquidity)`);

    return sampled;
  }, [binsAroundActive, activeBin]);

  // Calculate max liquidity for scaling histogram
  const maxLiquidity = useMemo(() => {
    const max = Math.max(...sampledBins.map(bin => bin.totalLiquidity || 0), 1);
    console.log(`[LiquidityChart] Max liquidity for scaling: ${max.toFixed(6)}`);
    return max;
  }, [sampledBins]);

  // Get pool metadata
  const poolMetadata = useMemo(() => {
    const meteoraData = (pool as any).meteoraData;
    return {
      binStep: pool.binStep || meteoraData?.binStep || 20,
      baseFee: pool.baseFee || parseFloat(meteoraData?.baseFeePercentage || '0.2'),
      maxFee: 10,
      protocolFee: 0.01000016,
      dynamicFee: 0.2000032,
      fee24h: (pool.volume24h || 0) * (pool.baseFee || 0.002),
    };
  }, [pool]);

  // Current price from active bin
  const currentPrice = Number(activeBin?.pricePerToken) || Number(pool.baseAsset.usdPrice) || 0;

  if (!isDLMM) {
    return null;
  }

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Compact Header - Sidebar Optimized */}
      <div className="px-3 py-2 border-b border-border-light bg-gradient-to-r from-background-secondary/50 to-background/50">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Liquidity Distribution</h3>
            {/* Legend - Inline */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-[10px] text-gray-400">{pool.baseAsset.symbol}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span className="text-[10px] text-gray-400">{pool.quoteAsset?.symbol || 'USDC'}</span>
              </div>
            </div>
          </div>
          <div className="px-2 py-0.5 bg-background-tertiary rounded-md w-fit">
            <span className="text-[10px] font-mono text-gray-300">
              {isNaN(currentPrice) || currentPrice === 0 ? 'N/A' : currentPrice.toFixed(6)} {pool.quoteAsset?.symbol || 'USDC'}
            </span>
          </div>
        </div>
      </div>

      {/* Fee Information Grid - Sidebar Optimized (2 columns) */}
      <div className="px-4 py-2 bg-background-secondary/20 border-b border-border-light">
        <div className="grid grid-cols-2 gap-2">
          {/* Bin Step */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">Bin Step</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="The price difference between consecutive bins">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-white">{poolMetadata.binStep}</span>
          </div>

          {/* Base Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">Base Fee</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="Minimum trading fee">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-white">{poolMetadata.baseFee}%</span>
          </div>

          {/* Max Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">Max Fee</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="Maximum trading fee">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-white">{poolMetadata.maxFee}%</span>
          </div>

          {/* Protocol Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">Protocol Fee</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="Fee paid to protocol">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-white">{poolMetadata.protocolFee.toFixed(8)}%</span>
          </div>

          {/* Dynamic Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">Dynamic Fee</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="Current variable fee based on volatility">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-white">{poolMetadata.dynamicFee.toFixed(7)}%</span>
          </div>

          {/* 24h Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground-muted">24h Fee</span>
              <button className="w-3 h-3 rounded-full bg-background-tertiary flex items-center justify-center hover:bg-background" title="Total fees collected in last 24 hours">
                <span className="text-[8px] text-foreground-muted">?</span>
              </button>
            </div>
            <span className="text-xs font-semibold text-success">
              ${formatNumber(poolMetadata.fee24h)}
            </span>
          </div>
        </div>
      </div>

      {/* Liquidity Histogram - Sidebar Optimized */}
      <div className="px-4 py-4">
        {/* Histogram Container - Sidebar Friendly Height */}
        <div className="relative h-[300px] w-full bg-gradient-to-b from-background-tertiary/20 to-background-secondary/40 rounded-xl overflow-hidden border border-border-light/20 shadow-lg">
          {/* Smooth gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>

          {(() => {
            console.log('[LiquidityChart] Render decision:', {
              sampledBinsLength: sampledBins.length,
              hasActiveBin: !!activeBin,
              binsAroundActiveLength: binsAroundActive.length,
              isLoading,
              hasError: !!error,
            });
            return sampledBins.length === 0;
          })() ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                {!activeBin ? (
                  <>
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-foreground-muted">Loading liquidity data...</p>
                    <p className="text-xs text-gray-500 mt-1">Fetching bins from RPC...</p>
                  </>
                ) : binsAroundActive.length === 0 ? (
                  <>
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-sm font-semibold text-white mb-1">No Liquidity Data</p>
                    <p className="text-xs text-gray-400 mb-3">This pool has no liquidity in any bins yet.</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                    >
                      Refresh Data
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-sm font-semibold text-white mb-1">Chart Rendering Issue</p>
                    <p className="text-xs text-gray-400 mb-2">Bins were fetched but couldn't be displayed.</p>
                    <p className="text-xs text-gray-500 font-mono mb-3">
                      Check browser console (F12) for details
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                    >
                      Refresh Page
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Histogram bars - Sidebar Optimized */}
              <div className="absolute inset-4 bottom-8 flex items-end justify-center gap-0.5">
                {sampledBins.map((bin, idx) => {
                  const liquidityPct = (bin.totalLiquidity / maxLiquidity) * 100;
                  const liquidityXPct = bin.liquidityX > 0 ? (bin.liquidityX / bin.totalLiquidity) * 100 : 0;
                  const liquidityYPct = bin.liquidityY > 0 ? (bin.liquidityY / bin.totalLiquidity) * 100 : 0;

                  // Add minimum bar height for visibility (2% of container)
                  const MIN_BAR_HEIGHT = 2;
                  const displayLiquidityPct = bin.totalLiquidity > 0
                    ? Math.max(liquidityPct, MIN_BAR_HEIGHT)
                    : 0;

                  const isActive = bin.isActive;
                  const isHovered = hoveredBin === bin.binId;

                  // Check if this bin has user position
                  const hasPosition = myPositions.some(
                    p => bin.binId >= p.lowerBinId && bin.binId <= p.upperBinId
                  );

                  return (
                    <div
                      key={bin.binId}
                      className="relative flex-1 flex flex-col justify-end cursor-pointer group"
                      style={{
                        height: '100%',
                        maxWidth: '8px',
                        minWidth: '3px',
                      }}
                      onMouseEnter={() => setHoveredBin(bin.binId)}
                      onMouseLeave={() => setHoveredBin(null)}
                    >
                      {/* Position indicator (yellow glow) */}
                      {hasPosition && (
                        <div className="absolute -top-2 left-0 right-0 h-2 bg-warning/60 rounded-t blur-sm"></div>
                      )}

                      {/* Token Y (Quote - USDC) - Smooth Cyan Gradient */}
                      {bin.liquidityY > 0 && (
                        <div
                          className="w-full transition-all duration-300 ease-out group-hover:brightness-110"
                          style={{
                            height: `${(displayLiquidityPct * liquidityYPct) / 100}%`,
                            background: isActive
                              ? 'linear-gradient(to top, #059669, #10b981)'
                              : isHovered
                                ? 'linear-gradient(to top, #06b6d4, #22d3ee)'
                                : 'linear-gradient(to top, rgba(6, 182, 212, 0.6), rgba(6, 182, 212, 0.8))',
                            borderTopLeftRadius: bin.liquidityX === 0 ? '3px' : '0',
                            borderTopRightRadius: bin.liquidityX === 0 ? '3px' : '0',
                            boxShadow: isHovered ? '0 0 12px rgba(6, 182, 212, 0.6)' : 'none',
                          }}
                        ></div>
                      )}

                      {/* Token X (Base) - Smooth Purple Gradient */}
                      {bin.liquidityX > 0 && (
                        <div
                          className="w-full transition-all duration-300 ease-out group-hover:brightness-110"
                          style={{
                            height: `${(displayLiquidityPct * liquidityXPct) / 100}%`,
                            background: isActive
                              ? 'linear-gradient(to top, #9333ea, #a855f7)'
                              : isHovered
                                ? 'linear-gradient(to top, #a855f7, #c084fc)'
                                : 'linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(168, 85, 247, 0.8))',
                            borderTopLeftRadius: '3px',
                            borderTopRightRadius: '3px',
                            boxShadow: isHovered ? '0 0 12px rgba(139, 92, 246, 0.6)' : 'none',
                          }}
                        ></div>
                      )}

                      {/* Active bin indicator - Clean Emerald Line */}
                      {isActive && (
                        <div className="absolute inset-x-0 bottom-0 w-full">
                          {/* Glowing vertical line */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-full bg-emerald-400 shadow-lg shadow-emerald-500/50 z-20"></div>
                          {/* Top dot */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-300 shadow-lg shadow-emerald-500/50 z-20"></div>
                          {/* Bottom marker */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-3 bg-emerald-400 rounded-b shadow-lg shadow-emerald-500/50 z-20"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Price scale at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-between px-2 bg-background-tertiary/80 backdrop-blur-sm border-t border-border-light text-[9px] text-gray-400 font-mono">
                <span>{isNaN(currentPrice) ? 'N/A' : (currentPrice * 0.8).toFixed(4)}</span>
                <span>{isNaN(currentPrice) ? 'N/A' : (currentPrice * 0.9).toFixed(4)}</span>
                <span className="font-semibold text-emerald-400">{isNaN(currentPrice) ? 'N/A' : currentPrice.toFixed(6)}</span>
                <span>{isNaN(currentPrice) ? 'N/A' : (currentPrice * 1.1).toFixed(4)}</span>
                <span>{isNaN(currentPrice) ? 'N/A' : (currentPrice * 1.2).toFixed(4)}</span>
              </div>

              {/* Hover tooltip */}
              {hoveredBin !== null && (
                <div className="absolute top-2 right-2 bg-background-tertiary/95 backdrop-blur-sm border border-border-light rounded-lg p-2 shadow-xl z-10">
                  {(() => {
                    const bin = binsAroundActive.find(b => b.binId === hoveredBin);
                    if (!bin) return null;
                    return (
                      <>
                        <div className="text-xs text-foreground-muted mb-1">Bin #{bin.binId}</div>
                        <div className="text-sm font-semibold text-white mb-2">
                          ${bin.pricePerToken.toFixed(8)}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground-muted">{pool.baseAsset.symbol}:</span>
                            <span className="font-mono text-purple-400">{formatNumber(bin.liquidityX)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground-muted">{pool.quoteAsset?.symbol || 'USDC'}:</span>
                            <span className="font-mono text-cyan-400">{formatNumber(bin.liquidityY)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border-light">
                            <span className="text-foreground-muted">Total:</span>
                            <span className="font-mono text-white font-semibold">{formatNumber(bin.totalLiquidity)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* User positions summary - Compact */}
        {myPositions.length > 0 && (
          <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
              <span className="text-foreground">
                {myPositions.length} position{myPositions.length > 1 ? 's' : ''} in this pool
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
