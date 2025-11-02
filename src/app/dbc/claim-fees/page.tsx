'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCClaimFeesPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { claimFees } = useDBC();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const claim = config.dbcClaimFees || config.claimFees || {};
    setFormData({
      ...formData,
      poolAddress: claim.poolAddress || '',
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
        baseMint: formData.poolAddress,
      });

      toast.success('Fees claimed successfully!', { id: loadingToast });

      if (result.signatures && result.signatures.length > 0) {
        result.signatures.forEach((sig: string, index: number) => {
          const explorerUrl = network === 'mainnet-beta'
            ? `https://solscan.io/tx/${sig}`
            : `https://solscan.io/tx/${sig}?cluster=${network}`;

          toast.success(
            <div>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
                View transaction {index + 1} on Solscan
              </a>
            </div>,
            { duration: 10000 }
          );
        });
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
          <h1 className="text-3xl font-bold gradient-text">Claim Fees (DBC)</h1>
          <p className="text-foreground-secondary mt-2">
            Claim accumulated trading fees from your DBC pool
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
          expectedProtocol="dbc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DBC pool to claim fees from
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
                helperText="The address of your DBC pool"
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Creator Fees:</strong> As the pool creator, you earn fees from all trading activity.</p>
                  <p><strong>Accumulation:</strong> Fees accumulate in the pool until claimed.</p>
                  <p><strong>Claim Anytime:</strong> No minimum threshold or waiting period.</p>
                  <p><strong>Both Phases:</strong> Earn fees during bonding curve and after AMM migration.</p>
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
