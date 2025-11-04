'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import toast from 'react-hot-toast';

function DLMMSeedLFGContent() {
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { seedLiquidityLFG } = useDLMM();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    baseMint: '',
    quoteMint: 'So11111111111111111111111111111111111111112',
    minPrice: '',
    maxPrice: '',
    curvature: '0.6',
    seedAmount: '',
    positionOwner: '',
    feeOwner: '',
    lockReleasePoint: '0',
  });

  // Pre-fill baseMint from query params (from create pool workflow)
  useEffect(() => {
    const baseMintParam = searchParams.get('baseMint');
    if (baseMintParam) {
      setFormData(prev => ({ ...prev, baseMint: baseMintParam }));
      toast.success('Token address pre-filled from pool creation!', { duration: 3000 });
    }
  }, [searchParams]);

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const lfg = config.lfgSeedLiquidity || {};
    setFormData({
      ...formData,
      baseMint: config.baseMint || formData.baseMint,
      quoteMint: config.quoteMint || formData.quoteMint,
      minPrice: lfg.minPrice?.toString() || '',
      maxPrice: lfg.maxPrice?.toString() || '',
      curvature: lfg.curvature?.toString() || '0.6',
      seedAmount: lfg.seedAmount?.toString() || '',
      positionOwner: lfg.positionOwner || '',
      feeOwner: lfg.feeOwner || '',
      lockReleasePoint: lfg.lockReleasePoint?.toString() || '0',
    });
    toast.success('Config loaded and form pre-filled!');
  };

  // Calculate price range statistics
  const minPrice = parseFloat(formData.minPrice) || 0;
  const maxPrice = parseFloat(formData.maxPrice) || 0;
  const priceSpread = maxPrice > minPrice ? ((maxPrice - minPrice) / minPrice) * 100 : 0;
  const isWideRange = priceSpread > 1000; // >1000% spread
  const isVeryWideRange = priceSpread > 5000; // >5000% spread

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Validate price range
    if (minPrice <= 0 || maxPrice <= 0) {
      toast.error('Both min and max price must be greater than 0');
      return;
    }

    if (maxPrice <= minPrice) {
      toast.error('Max price must be greater than min price');
      return;
    }

    // Warn about very wide ranges
    if (isVeryWideRange) {
      toast.error(
        `Price range is extremely wide (${priceSpread.toFixed(0)}% spread). This may fail due to high bin array costs. Please reduce the range.`,
        { duration: 6000 }
      );
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Seeding liquidity with LFG strategy...');

    try {
      const result = await seedLiquidityLFG(formData);

      toast.success(
        `Liquidity seeded successfully! ${result.signatures.length} transaction(s) confirmed`,
        { id: loadingToast, duration: 5000 }
      );

      // Log signatures for user reference
      console.log('LFG Seeding complete:');
      console.log('Pool address:', result.poolAddress);
      console.log('Signatures:', result.signatures);
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Seed Liquidity (LFG)</h1>
          <p className="text-foreground-secondary mt-2">
            Seed liquidity using the Launch Fair Guarantee (LFG) strategy with customizable price curve
          </p>
        </div>

        {/* Wallet Warning */}
        {!publicKey && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-warning">Connect your wallet to continue</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Upload */}
        <ConfigUpload
          onConfigLoaded={handleConfigLoaded}
          expectedProtocol="dlmm"
          templateFile="dlmm-seed-lfg.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Pair */}
          <Card>
            <CardHeader>
              <CardTitle>Token Pair</CardTitle>
              <CardDescription>
                Select the token pair for your DLMM pool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Base Token Mint"
                placeholder="TokenMint111..."
                required
                value={formData.baseMint}
                onChange={(e) => setFormData({ ...formData, baseMint: e.target.value })}
                className="font-mono text-sm"
                helperText="The base token mint address"
              />
              <QuoteMintSelector
                value={formData.quoteMint}
                onChange={(value) => setFormData({ ...formData, quoteMint: value })}
              />
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader>
              <CardTitle>Price Range</CardTitle>
              <CardDescription>
                Define the price range for liquidity distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Price"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.minPrice}
                  onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                  helperText="Minimum price in the range"
                />
                <Input
                  label="Max Price"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                  helperText="Maximum price in the range"
                />
              </div>
              <Input
                label="Curvature"
                type="number"
                step="0.01"
                min="0"
                max="1"
                required
                value={formData.curvature}
                onChange={(e) => setFormData({ ...formData, curvature: e.target.value })}
                helperText="Distribution curve (0 = uniform, 1 = concentrated at current price)"
              />

              {/* Price Range Warning */}
              {minPrice > 0 && maxPrice > 0 && (
                <div className={`p-3 rounded-lg border ${
                  isVeryWideRange
                    ? 'border-error/30 bg-error/10'
                    : isWideRange
                    ? 'border-warning/30 bg-warning/10'
                    : 'border-success/30 bg-success/10'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">
                      {isVeryWideRange ? '🚨' : isWideRange ? '⚠️' : '✅'}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm font-medium ${
                        isVeryWideRange
                          ? 'text-error'
                          : isWideRange
                          ? 'text-warning'
                          : 'text-success'
                      }`}>
                        Price Spread: {priceSpread.toFixed(1)}%
                      </p>
                      <p className="text-xs text-foreground-secondary">
                        {isVeryWideRange
                          ? 'Extremely wide range! This will likely fail due to high bin array initialization costs (~0.075 SOL per array). Please reduce the range significantly.'
                          : isWideRange
                          ? 'Wide price range requires many bin arrays (~0.075 SOL each). Consider narrowing the range to reduce costs and avoid transaction failures.'
                          : 'Good price range - should execute without excessive bin array costs.'}
                      </p>
                      {(isWideRange || isVeryWideRange) && (
                        <p className="text-xs text-foreground-muted mt-1">
                          Recommended: Keep spread below 1000% for optimal results
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liquidity Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Configuration</CardTitle>
              <CardDescription>
                Configure the liquidity seeding parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Seed Amount"
                type="number"
                step="any"
                min="0"
                required
                value={formData.seedAmount}
                onChange={(e) => setFormData({ ...formData, seedAmount: e.target.value })}
                helperText="Amount of tokens to seed"
              />
              <Input
                label="Position Owner (Optional)"
                placeholder="Leave empty to use your wallet"
                value={formData.positionOwner}
                onChange={(e) => setFormData({ ...formData, positionOwner: e.target.value })}
                className="font-mono text-sm"
                helperText="Address that will own the liquidity position (defaults to your connected wallet)"
              />
              <Input
                label="Fee Owner (Optional)"
                placeholder="Leave empty to use position owner"
                value={formData.feeOwner}
                onChange={(e) => setFormData({ ...formData, feeOwner: e.target.value })}
                className="font-mono text-sm"
                helperText="Address that will receive trading fees (defaults to position owner)"
              />
              <Input
                label="Lock Release Point (Optional)"
                type="number"
                min="0"
                value={formData.lockReleasePoint}
                onChange={(e) => setFormData({ ...formData, lockReleasePoint: e.target.value })}
                helperText="Unix timestamp when position can be withdrawn (0 = no lock)"
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>LFG Strategy:</strong> Launch Fair Guarantee ensures fair launch by distributing liquidity across a price range with customizable curve.</p>
                  <p><strong>Curvature:</strong> Higher values concentrate liquidity near current price, lower values spread it more evenly.</p>
                  <p><strong>Lock Period:</strong> Optionally lock liquidity until a specific timestamp for added security.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure variant="default" />

          <div className="flex gap-3">
            <ConfigExportButton
              formData={formData}
              protocol="dlmm"
              action="seed-lfg"
              variant="outline"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!publicKey || loading}
              className="flex-1"
            >
              {loading ? 'Seeding Liquidity...' : '💧 Seed Liquidity'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

export default function DLMMSeedLFGPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DLMMSeedLFGContent />
    </Suspense>
  );
}
