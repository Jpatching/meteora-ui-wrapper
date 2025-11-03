'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PositionWithPNL } from '@/lib/hooks/usePositions';

interface PositionCardProps {
  position: PositionWithPNL;
  onClaim?: (position: PositionWithPNL) => void;
  onClose?: (position: PositionWithPNL) => void;
  onViewDetails?: (position: PositionWithPNL) => void;
}

export function PositionCard({
  position,
  onClaim,
  onClose,
  onViewDetails,
}: PositionCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Format currency
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Format token amount
  const formatTokenAmount = (amount: number, decimals = 4) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  // Get protocol color
  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'DLMM': return 'from-cyan-500 to-blue-500';
      case 'DAMM v2': return 'from-purple-500 to-pink-500';
      case 'DAMM v1': return 'from-blue-500 to-indigo-500';
      case 'DBC': return 'from-orange-500 to-red-500';
      case 'Alpha Vault': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Get PNL color
  const getPNLColor = (pnl: number) => {
    if (pnl > 0) return 'text-success';
    if (pnl < 0) return 'text-error';
    return 'text-foreground-muted';
  };

  // Get health score color and label
  const getHealthScore = (score: number) => {
    if (score >= 80) return { color: 'text-success', bg: 'bg-success/20', label: 'Healthy' };
    if (score >= 60) return { color: 'text-warning', bg: 'bg-warning/20', label: 'Fair' };
    if (score >= 40) return { color: 'text-orange-500', bg: 'bg-orange-500/20', label: 'Risky' };
    return { color: 'text-error', bg: 'bg-error/20', label: 'Critical' };
  };

  const healthInfo = getHealthScore(position.healthScore);
  const protocolGradient = getProtocolColor(position.protocol);

  return (
    <Card hover className="overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${protocolGradient}`} />

      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {/* Protocol Badge */}
            <Badge variant="purple" className="text-xs">
              {position.protocol}
            </Badge>

            {/* Token Pair */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text font-accent">
                {position.baseSymbol}/{position.quoteSymbol}
              </span>
            </div>
          </div>

          {/* Health Score */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-foreground-muted">Health</span>
            <div className={`${healthInfo.bg} ${healthInfo.color} px-2 py-1 rounded text-xs font-semibold`}>
              {healthInfo.label}
            </div>
          </div>
        </div>

        {/* Value and PNL */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Value */}
          <div>
            <div className="text-xs text-foreground-muted mb-1">Current Value</div>
            <div className="text-lg font-bold font-accent">
              {formatUSD(position.currentValue)}
            </div>
          </div>

          {/* PNL */}
          <div>
            <div className="text-xs text-foreground-muted mb-1">PNL</div>
            <div className={`text-lg font-bold font-accent ${getPNLColor(position.pnl)}`}>
              {formatUSD(position.pnl)}
              <span className="text-sm ml-1">
                ({formatPercent(position.pnlPercent)})
              </span>
            </div>
          </div>
        </div>

        {/* Unclaimed Fees */}
        {position.unclaimedFeesUSD > 0 && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-foreground-muted">Unclaimed Fees</div>
                <div className="text-lg font-bold text-success">
                  {formatUSD(position.unclaimedFeesUSD)}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onClaim?.(position)}
                className="text-xs"
              >
                Claim
              </Button>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          <span>{expanded ? 'Less' : 'More'} Details</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Position Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-foreground-muted mb-1">Base Amount</div>
                <div className="font-mono text-foreground">
                  {formatTokenAmount(position.baseAmount)} {position.baseSymbol}
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground-muted mb-1">Quote Amount</div>
                <div className="font-mono text-foreground">
                  {formatTokenAmount(position.quoteAmount)} {position.quoteSymbol}
                </div>
              </div>
            </div>

            {/* Fees Breakdown */}
            {(position.unclaimedFeesBase > 0 || position.unclaimedFeesQuote > 0) && (
              <div className="bg-background-tertiary rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-foreground-muted">Fee Breakdown</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-foreground-muted">Base:</span>
                    <span className="ml-1 font-mono text-foreground">
                      {formatTokenAmount(position.unclaimedFeesBase)} {position.baseSymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">Quote:</span>
                    <span className="ml-1 font-mono text-foreground">
                      {formatTokenAmount(position.unclaimedFeesQuote)} {position.quoteSymbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Impermanent Loss */}
            {position.impermanentLoss !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">Impermanent Loss</span>
                <span className={position.impermanentLoss < 0 ? 'text-error' : 'text-success'}>
                  {formatUSD(position.impermanentLoss)} ({formatPercent(position.impermanentLossPercent || 0)})
                </span>
              </div>
            )}

            {/* APR */}
            {position.apr !== undefined && position.apr > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">Estimated APR</span>
                <span className="text-success font-semibold">{formatPercent(position.apr)}</span>
              </div>
            )}

            {/* Pool Address */}
            <div className="text-xs">
              <span className="text-foreground-muted">Pool: </span>
              <a
                href={`https://solscan.io/account/${position.poolAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-[10px]"
              >
                {position.poolAddress.slice(0, 8)}...{position.poolAddress.slice(-8)}
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {onViewDetails && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewDetails(position)}
                  className="flex-1"
                >
                  View Details
                </Button>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClose(position)}
                  className="flex-1 text-error hover:bg-error/10"
                >
                  Close Position
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
