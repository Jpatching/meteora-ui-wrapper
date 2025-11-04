'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2ClosePositionPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { closePosition } = useDAMMv2();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    positionAddress: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const close = config.closePosition || {};
    setFormData({
      ...formData,
      poolAddress: close.poolAddress || '',
      positionAddress: close.positionAddress || '',
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
    const loadingToast = toast.loading('Closing position...');

    try {
      const result = await closePosition({
        poolAddress: formData.poolAddress,
      });

      toast.success('Position closed successfully!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to close position', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Close Position (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Close your liquidity position and withdraw all assets
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
                Select the pool and position to close
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

          {/* Warning Card */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-2 text-sm text-warning">
                  <p><strong>Warning:</strong> Closing the position is irreversible.</p>
                  <p>You will receive all remaining liquidity plus any unclaimed fees.</p>
                  <p>The position NFT will be burned and cannot be recovered.</p>
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
                  <p><strong>Full Withdrawal:</strong> Withdraws all liquidity from the position.</p>
                  <p><strong>Auto Fee Claim:</strong> Automatically claims any unclaimed fees.</p>
                  <p><strong>NFT Burned:</strong> The position NFT is permanently burned.</p>
                  <p><strong>Received:</strong> Base tokens + Quote tokens + Unclaimed fees.</p>
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
            variant="danger"
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading ? 'Closing Position...' : '🔴 Close Position'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
