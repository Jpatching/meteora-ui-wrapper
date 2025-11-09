/**
 * Liquidity Chart Overlay
 * Interactive overlay for adding/removing liquidity directly on the chart
 * Shows when hovering over chart for DLMM pools
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { BinData } from '@/lib/meteora/binDataService';
import { formatUSD, formatNumber } from '@/lib/format/number';

interface LiquidityChartOverlayProps {
  poolAddress: string;
  poolType: 'dlmm' | 'damm-v2' | 'dbc';
  binData?: BinData[];
  activeBinPrice?: number;
  currentPrice: number;
  tokenXSymbol: string;
  tokenYSymbol: string;
  onAddLiquidity?: (minPrice: number, maxPrice: number, amount: number) => void;
  onRemoveLiquidity?: (positionId: string) => void;
}

export function LiquidityChartOverlay({
  poolAddress,
  poolType,
  binData = [],
  activeBinPrice,
  currentPrice,
  tokenXSymbol,
  tokenYSymbol,
  onAddLiquidity,
  onRemoveLiquidity,
}: LiquidityChartOverlayProps) {
  const { publicKey } = useWallet();
  const [showControls, setShowControls] = useState(false);
  const [selectedBinRange, setSelectedBinRange] = useState<{ min: number; max: number } | null>(null);
  const [amount, setAmount] = useState('');

  // Only show for DLMM pools
  if (poolType !== 'dlmm') {
    return null;
  }

  // Find bins around active price
  const activeBinIndex = binData.findIndex(bin => bin.isActive);
  const visibleBins = activeBinIndex >= 0
    ? binData.slice(Math.max(0, activeBinIndex - 25), Math.min(binData.length, activeBinIndex + 26))
    : binData.slice(0, 50);

  // Calculate total liquidity
  const totalLiquidity = binData.reduce((sum, bin) => sum + (bin.totalLiquidity || 0), 0);

  // Calculate liquidity distribution percentages
  const liquidityByRange = {
    concentrated: binData.filter(bin =>
      Math.abs(bin.price - currentPrice) / currentPrice < 0.05
    ).reduce((sum, bin) => sum + (bin.totalLiquidity || 0), 0),
    moderate: binData.filter(bin => {
      const priceDiff = Math.abs(bin.price - currentPrice) / currentPrice;
      return priceDiff >= 0.05 && priceDiff < 0.15;
    }).reduce((sum, bin) => sum + (bin.totalLiquidity || 0), 0),
    wide: binData.filter(bin =>
      Math.abs(bin.price - currentPrice) / currentPrice >= 0.15
    ).reduce((sum, bin) => sum + (bin.totalLiquidity || 0), 0),
  };

  const handleAddLiquidity = () => {
    if (!selectedBinRange || !amount || !onAddLiquidity) return;
    onAddLiquidity(selectedBinRange.min, selectedBinRange.max, parseFloat(amount));
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full pointer-events-none">
      {/* Liquidity Distribution Sidebar */}
      <div className="h-full flex flex-col bg-gradient-to-l from-background-secondary/95 to-transparent backdrop-blur-sm border-l border-border-light pointer-events-auto">
        {/* Header */}
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Liquidity Distribution</h3>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
              title={showControls ? 'Hide Controls' : 'Show Controls'}
            >
              {showControls ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          </div>
          <div className="text-xs text-foreground-muted">
            Total: {formatUSD(totalLiquidity)}
          </div>
        </div>

        {/* Liquidity Histogram */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Distribution Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-foreground-muted">Concentrated (±5%)</span>
              </div>
              <span className="font-semibold text-foreground">
                {((liquidityByRange.concentrated / totalLiquidity) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                <span className="text-foreground-muted">Moderate (5-15%)</span>
              </div>
              <span className="font-semibold text-foreground">
                {((liquidityByRange.moderate / totalLiquidity) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-foreground-muted">Wide (&gt;15%)</span>
              </div>
              <span className="font-semibold text-foreground">
                {((liquidityByRange.wide / totalLiquidity) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Bin List */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-foreground-muted mb-2">
              Bins Around Active Price
            </div>
            {visibleBins.map((bin, idx) => {
              const liquidityPct = (bin.totalLiquidity / totalLiquidity) * 100;
              const priceDiff = ((bin.price - currentPrice) / currentPrice) * 100;

              return (
                <div
                  key={bin.binId}
                  className={`p-2 rounded-lg transition-colors ${
                    bin.isActive
                      ? 'bg-success/20 border border-success/40'
                      : 'bg-background-tertiary/50 hover:bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-mono ${bin.isActive ? 'text-success font-semibold' : 'text-foreground'}`}>
                      ${bin.pricePerToken.toFixed(6)}
                    </span>
                    <span className={`text-xs ${priceDiff >= 0 ? 'text-success' : 'text-error'}`}>
                      {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          bin.isActive ? 'bg-success' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(liquidityPct * 2, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      {formatNumber(bin.totalLiquidity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Liquidity Controls */}
        {showControls && publicKey && (
          <div className="p-4 border-t border-border-light bg-background/50 backdrop-blur-sm space-y-3">
            <div className="text-xs font-semibold text-foreground mb-2">
              Quick Add Liquidity
            </div>

            {/* Preset Range Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedBinRange({
                  min: currentPrice * 0.95,
                  max: currentPrice * 1.05,
                })}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedBinRange?.min === currentPrice * 0.95
                    ? 'bg-success text-white'
                    : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                ±5%
              </button>
              <button
                onClick={() => setSelectedBinRange({
                  min: currentPrice * 0.85,
                  max: currentPrice * 1.15,
                })}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedBinRange?.min === currentPrice * 0.85
                    ? 'bg-warning text-white'
                    : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                ±15%
              </button>
              <button
                onClick={() => setSelectedBinRange({
                  min: currentPrice * 0.7,
                  max: currentPrice * 1.3,
                })}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedBinRange?.min === currentPrice * 0.7
                    ? 'bg-primary text-white'
                    : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                ±30%
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <input
                type="number"
                placeholder="Amount (USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-background-tertiary border border-border-light rounded-lg text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50"
              />
            </div>

            {/* Selected Range Display */}
            {selectedBinRange && (
              <div className="p-2 bg-background-tertiary rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-foreground-muted">Min:</span>
                  <span className="font-mono text-foreground">${selectedBinRange.min.toFixed(6)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Max:</span>
                  <span className="font-mono text-foreground">${selectedBinRange.max.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={handleAddLiquidity}
              disabled={!selectedBinRange || !amount}
              className="w-full px-4 py-2 bg-gradient-to-r from-success to-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Add Liquidity
            </button>
          </div>
        )}

        {/* Connect Wallet Prompt */}
        {showControls && !publicKey && (
          <div className="p-4 border-t border-border-light bg-background/50 backdrop-blur-sm">
            <div className="text-center text-xs text-foreground-muted">
              Connect wallet to add liquidity
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
