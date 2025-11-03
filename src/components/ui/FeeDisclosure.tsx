'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from './Card';
import { loadFeeConfig, loadMetadataServiceConfig } from '@/lib/fees';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export type FeeTier = 'free' | 'pro';

interface FeeDisclosureProps {
  variant?: 'default' | 'compact' | 'detailed' | 'selector';
  className?: string;
  selectedTier?: FeeTier;
  onTierChange?: (tier: FeeTier) => void;
  includeMetadataService?: boolean; // NEW: Show metadata service fee
}

const FEE_TIERS: Record<FeeTier, {
  label: string;
  price: number;
  lamports: number;
  features: string[];
  recommended?: boolean;
}> = {
  free: {
    label: 'Free Tier',
    price: 0.0075,
    lamports: 7500000,
    features: [
      'Standard mainnet RPC',
      'Rate limited',
      'Perfect for testing',
    ],
  },
  pro: {
    label: 'Pro Tier',
    price: 0.0085,
    lamports: 8500000,
    features: [
      'Premium Helius + Alchemy RPCs',
      'Higher rate limits',
      'Faster transactions',
      'Priority support',
    ],
    recommended: true,
  },
};

/**
 * FeeDisclosure Component
 *
 * Displays platform fee information to users before they submit transactions.
 * Shows whether fees are enabled and the amount charged.
 *
 * @param variant - Display style: 'default' (card), 'compact' (inline), 'detailed' (with breakdown), 'selector' (tier chooser)
 * @param className - Additional CSS classes
 * @param selectedTier - Currently selected fee tier
 * @param onTierChange - Callback when tier changes
 */
export function FeeDisclosure({
  variant = 'default',
  className = '',
  selectedTier = 'pro',
  onTierChange,
  includeMetadataService = false
}: FeeDisclosureProps) {
  const [feeConfig, setFeeConfig] = useState<ReturnType<typeof loadFeeConfig> | null>(null);
  const [metadataConfig, setMetadataConfig] = useState<ReturnType<typeof loadMetadataServiceConfig> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTier, setActiveTier] = useState<FeeTier>(selectedTier);

  useEffect(() => {
    setMounted(true);
    setFeeConfig(loadFeeConfig());
    setMetadataConfig(loadMetadataServiceConfig());
  }, []);

  useEffect(() => {
    setActiveTier(selectedTier);
  }, [selectedTier]);

  const handleTierChange = (tier: FeeTier) => {
    setActiveTier(tier);
    onTierChange?.(tier);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Tier selector variant - NEW
  if (variant === 'selector') {
    return (
      <Card className={`border-primary/20 ${className}`}>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-ui">Select Fee Tier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(FEE_TIERS) as FeeTier[]).map((tier) => {
              const tierInfo = FEE_TIERS[tier];
              const isSelected = activeTier === tier;

              return (
                <button
                  key={tier}
                  onClick={() => handleTierChange(tier)}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-left
                    ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border-light bg-background-tertiary hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-ui">
                        {tierInfo.label}
                      </span>
                      {tierInfo.recommended && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary font-ui">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-foreground font-mono">
                      {tierInfo.price.toFixed(4)} SOL
                    </span>
                  </div>
                  <ul className="text-xs text-foreground-secondary space-y-1">
                    {tierInfo.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-foreground-muted mt-4 text-center">
            All fees support platform development and are transparently distributed on-chain
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!feeConfig) {
    return null; // Loading
  }

  if (!feeConfig.enabled) {
    return null; // No fees enabled, don't show anything
  }

  const feeInSOL = FEE_TIERS[activeTier].price;
  const hasTokenFee = feeConfig.feeTokenMint && feeConfig.feeTokenAmount > 0;
  const metadataFeeInSOL = metadataConfig ? metadataConfig.feeLamports / LAMPORTS_PER_SOL : 0;
  const showMetadataFee = includeMetadataService && metadataConfig?.enabled;
  const totalFeeInSOL = feeInSOL + (showMetadataFee ? metadataFeeInSOL : 0);

  // Compact variant - minimal inline display
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-1 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-foreground-secondary">Platform fee:</span>
          <span className="font-medium text-warning">
            {feeInSOL.toFixed(4)} SOL
          </span>
        </div>
        {showMetadataFee && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-foreground-secondary">Metadata service:</span>
              <span className="font-medium text-primary">
                {metadataFeeInSOL.toFixed(4)} SOL
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-border-primary">
              <span className="text-foreground font-medium">Total:</span>
              <span className="font-bold text-warning">
                {totalFeeInSOL.toFixed(4)} SOL
              </span>
            </div>
          </>
        )}
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
                  <span className="text-sm text-foreground-secondary">Platform Fee</span>
                  <span className="font-mono font-medium text-warning">
                    {feeInSOL.toFixed(4)} SOL
                  </span>
                </div>

                {showMetadataFee && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary">
                    <span className="text-sm text-foreground-secondary">Metadata Service</span>
                    <span className="font-mono font-medium text-primary">
                      {metadataFeeInSOL.toFixed(4)} SOL
                    </span>
                  </div>
                )}

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
                    <span className="text-sm font-medium">Total Fee</span>
                    <span className="font-mono font-bold text-warning">
                      {totalFeeInSOL.toFixed(4)} SOL
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
            <p className="text-sm font-medium text-warning mb-1">
              {showMetadataFee ? 'Transaction Fees' : 'Platform Fee'}
            </p>
            <p className="font-mono text-2xl font-bold text-warning">{totalFeeInSOL.toFixed(4)} SOL</p>
            {showMetadataFee && (
              <p className="text-xs text-foreground-secondary mt-1">
                Platform: {feeInSOL.toFixed(4)} SOL + Metadata: {metadataFeeInSOL.toFixed(4)} SOL
              </p>
            )}
            {hasTokenFee && (
              <p className="text-xs text-foreground-secondary mt-1">
                + {feeConfig.feeTokenAmount} tokens
              </p>
            )}
          </div>
          <p className="text-xs text-foreground-secondary max-w-md">
            {showMetadataFee
              ? 'Includes platform fee and metadata service (IPFS upload + builder)'
              : 'This transaction includes a platform fee to support ongoing development'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
