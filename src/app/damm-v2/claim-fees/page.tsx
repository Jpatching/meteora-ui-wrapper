'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2ClaimFeesPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { claimFees } = useDAMMv2();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    positionAddress: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const claim = config.claimFees || {};
    setFormData({
      ...formData,
      poolAddress: claim.poolAddress || '',
      positionAddress: claim.positionAddress || '',
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
    const loadingToast = toast.loading('Claiming fees...');

    try {
      const result = await claimFees({
        poolAddress: formData.poolAddress,
      });

      toast.success('Fees claimed successfully!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to claim fees', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Claim Fees (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Claim accumulated trading fees from your liquidity position
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
                Select the pool and position to claim fees from
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

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Trading Fees:</strong> Earned from swaps that occur in your liquidity range.</p>
                  <p><strong>Fee Tokens:</strong> You'll receive fees in both base and quote tokens.</p>
                  <p><strong>No Position Impact:</strong> Claiming fees doesn't affect your liquidity position.</p>
                  <p><strong>Gas Optimization:</strong> Consider claiming when fees have accumulated to save on transaction costs.</p>
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
            {loading ? 'Claiming Fees...' : '💰 Claim Fees'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
