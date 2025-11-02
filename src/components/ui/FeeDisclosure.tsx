'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from './Card';
import { loadFeeConfig } from '@/lib/fees';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface FeeDisclosureProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

/**
 * FeeDisclosure Component
 *
 * Displays platform fee information to users before they submit transactions.
 * Shows whether fees are enabled and the amount charged.
 *
 * @param variant - Display style: 'default' (card), 'compact' (inline), 'detailed' (with breakdown)
 * @param className - Additional CSS classes
 */
export function FeeDisclosure({ variant = 'default', className = '' }: FeeDisclosureProps) {
  const [feeConfig, setFeeConfig] = useState<ReturnType<typeof loadFeeConfig> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFeeConfig(loadFeeConfig());
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!feeConfig) {
    return null; // Loading
  }

  if (!feeConfig.enabled) {
    return null; // No fees enabled, don't show anything
  }

  const feeInSOL = feeConfig.feeLamports / LAMPORTS_PER_SOL;
  const hasTokenFee = feeConfig.feeTokenMint && feeConfig.feeTokenAmount > 0;

  // Compact variant - minimal inline display
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className="text-foreground-secondary">Platform fee:</span>
        <span className="font-medium text-warning">
          {feeInSOL.toFixed(4)} SOL
        </span>
      </div>
    );
  }

  // Detailed variant - full breakdown
  if (variant === 'detailed') {
    return (
      <Card className={`border-warning/20 bg-warning/5 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💰</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-warning mb-2">Platform Fee</h3>
              <p className="text-sm text-foreground-secondary mb-4">
                A small platform fee is charged for this transaction to support ongoing development
                and maintenance of the Meteora Invent platform.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary">
                  <span className="text-sm text-foreground-secondary">Transaction Fee</span>
                  <span className="font-mono font-medium text-warning">
                    {feeInSOL.toFixed(4)} SOL
                  </span>
                </div>

                {hasTokenFee && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary">
                    <span className="text-sm text-foreground-secondary">Token Fee</span>
                    <span className="font-mono font-medium text-warning">
                      {feeConfig.feeTokenAmount} tokens
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-border-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Platform Fee</span>
                    <span className="font-mono font-bold text-warning">
                      {feeInSOL.toFixed(4)} SOL
                      {hasTokenFee && ` + ${feeConfig.feeTokenAmount} tokens`}
                    </span>
                  </div>
                </div>
              </div>

              {feeConfig.feeWallet && (
                <div className="mt-4 pt-4 border-t border-border-primary">
                  <p className="text-xs text-foreground-secondary">
                    Fee recipient: <span className="font-mono">{feeConfig.feeWallet.toBase58().slice(0, 8)}...{feeConfig.feeWallet.toBase58().slice(-8)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant - centered card
  return (
    <Card className={`border-warning/20 bg-warning/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-sm font-medium text-warning mb-1">Platform Fee</p>
            <p className="font-mono text-2xl font-bold text-warning">{feeInSOL.toFixed(4)} SOL</p>
            {hasTokenFee && (
              <p className="text-xs text-foreground-secondary mt-1">
                + {feeConfig.feeTokenAmount} tokens
              </p>
            )}
          </div>
          <p className="text-xs text-foreground-secondary max-w-md">
            This transaction includes a platform fee to support ongoing development
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
