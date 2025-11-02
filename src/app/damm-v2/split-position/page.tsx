'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2SplitPositionPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { splitPosition } = useDAMMv2();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    positionAddress: '',
    splitPercentage: '50',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const split = config.splitPosition || {};
    setFormData({
      ...formData,
      poolAddress: split.poolAddress || '',
      positionAddress: split.positionAddress || '',
      splitPercentage: split.splitPercentage?.toString() || '50',
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
    const loadingToast = toast.loading('Splitting position...');

    try {
      const percentage = Number(formData.splitPercentage);
      const result = await splitPosition({
        poolAddress: formData.poolAddress,
        newPositionOwner: publicKey.toBase58(),
        unlockedLiquidityPercentage: percentage,
        permanentLockedLiquidityPercentage: 100 - percentage,
        feeAPercentage: percentage,
        feeBPercentage: percentage,
      });

      toast.success('Position split successfully!', { id: loadingToast });

      if (result.signature) {
        const explorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/tx/${result.signature}`
          : `https://solscan.io/tx/${result.signature}?cluster=${network}`;

        toast.success(
          <div>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View transaction on Solscan
            </a>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to split position', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Split Position (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Split your liquidity position into two separate positions
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
          expectedProtocol="damm-v2"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Position Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Position Selection</CardTitle>
              <CardDescription>
                Select the pool and position to split
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Pool Address"
                placeholder="PoolAddress..."
                required
                value={formData.poolAddress}
                onChange={(e) => setFormData({ ...formData, poolAddress: e.target.value })}
                className="font-mono text-sm"
                helperText="The address of the DAMM v2 pool"
              />
              <Input
                label="Position Address"
                placeholder="PositionAddress..."
                required
                value={formData.positionAddress}
                onChange={(e) => setFormData({ ...formData, positionAddress: e.target.value })}
                className="font-mono text-sm"
                helperText="The address of your liquidity position NFT"
              />
            </CardContent>
          </Card>

          {/* Split Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Split Configuration</CardTitle>
              <CardDescription>
                Configure how to split the position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Split Percentage"
                type="number"
                min="1"
                max="99"
                required
                value={formData.splitPercentage}
                onChange={(e) => setFormData({ ...formData, splitPercentage: e.target.value })}
                helperText="Percentage of liquidity to move to new position (1-99)"
              />

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Original Position:</span>
                    <span className="font-medium">{100 - Number(formData.splitPercentage || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">New Position:</span>
                    <span className="font-medium">{formData.splitPercentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Position Splitting:</strong> Create two positions from one for better management.</p>
                  <p><strong>Use Cases:</strong> Partial withdrawal, different lock periods, or separate fee recipients.</p>
                  <p><strong>NFTs:</strong> Both positions will be represented as separate NFTs.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure variant="default" />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading ? 'Splitting Position...' : '✂️ Split Position'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
