'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Select, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import toast from 'react-hot-toast';

export default function DLMMSeedSinglePage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { seedLiquiditySingleBin } = useDLMM();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    baseMint: '',
    quoteMint: 'So11111111111111111111111111111111111111112',
    price: '',
    priceRounding: 'up',
    seedAmount: '',
    positionOwner: '',
    feeOwner: '',
    lockReleasePoint: '0',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const single = config.singleBinSeedLiquidity || {};
    setFormData({
      ...formData,
      baseMint: config.baseMint || formData.baseMint,
      quoteMint: config.quoteMint || formData.quoteMint,
      price: single.price?.toString() || '',
      priceRounding: single.priceRounding || 'up',
      seedAmount: single.seedAmount?.toString() || '',
      positionOwner: single.positionOwner || '',
      feeOwner: single.feeOwner || '',
      lockReleasePoint: single.lockReleasePoint?.toString() || '0',
    });
    toast.success('Config loaded and form pre-filled!');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Seeding liquidity in single bin...');

    try {
      const result = await seedLiquiditySingleBin(formData);

      toast.success(
        'Liquidity seeded successfully!',
        { id: loadingToast, duration: 5000 }
      );

      // Log results for user reference
      console.log('Single bin seeding complete:');
      console.log('Pool address:', result.poolAddress);
      console.log('Signature:', result.signature);
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
          <h1 className="text-3xl font-bold gradient-text">Seed Liquidity (Single Bin)</h1>
          <p className="text-foreground-secondary mt-2">
            Seed all liquidity in a single price bin for concentrated liquidity provision
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

          {/* Price Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Price Configuration</CardTitle>
              <CardDescription>
                Set the exact price bin for liquidity concentration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Price"
                type="number"
                step="any"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                helperText="Target price for liquidity (quote tokens per base token)"
              />
              <Select
                label="Price Rounding"
                value={formData.priceRounding}
                onChange={(e) => setFormData({ ...formData, priceRounding: e.target.value })}
                helperText="How to round price to nearest valid bin"
              >
                <option value="up">Round Up</option>
                <option value="down">Round Down</option>
              </Select>
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
                required
                value={formData.seedAmount}
                onChange={(e) => setFormData({ ...formData, seedAmount: e.target.value })}
                helperText="Amount of tokens to seed in the single bin"
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
                  <p><strong>Single Bin Strategy:</strong> All liquidity is concentrated in one price bin for maximum capital efficiency at the target price.</p>
                  <p><strong>Best For:</strong> Stablecoins or tokens expected to trade at a specific price point.</p>
                  <p><strong>Risk:</strong> If price moves out of the bin, your liquidity won't earn fees until price returns.</p>
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
              action="seed-single"
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
              {loading ? 'Seeding Liquidity...' : '💦 Seed Liquidity'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
