'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv1 } from '@/lib/meteora/useDAMMv1';
import toast from 'react-hot-toast';

export default function DAMMv1CreateStake2EarnPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createStake2Earn } = useDAMMv1();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    rewardMint: '',
    rewardAmount: '',
    duration: '30',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const farm = config.stake2EarnFarm || {};
    setFormData({
      ...formData,
      poolAddress: farm.poolAddress || '',
      rewardMint: farm.rewardMint || '',
      rewardAmount: farm.rewardAmount?.toString() || '',
      duration: farm.duration?.toString() || '30',
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
    const loadingToast = toast.loading('Creating Stake2Earn farm...');

    try {
      const result = await createStake2Earn(formData);

      toast.success('Stake2Earn farm created successfully!', { id: loadingToast });

      // Show transaction link
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
      toast.error(error.message || 'Failed to create farm', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Calculate end date
  const getEndDate = () => {
    const days = Number(formData.duration || 0);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Create Stake2Earn (DAMM v1)</h1>
          <p className="text-foreground-secondary mt-2">
            Create a staking rewards farm for your DAMM v1 pool
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
          expectedProtocol="damm-v1"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DAMM v1 pool to create rewards for
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
                helperText="The address of the DAMM v1 pool"
              />
            </CardContent>
          </Card>

          {/* Reward Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Reward Configuration</CardTitle>
              <CardDescription>
                Configure the staking rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Reward Token Mint"
                placeholder="RewardMint111..."
                required
                value={formData.rewardMint}
                onChange={(e) => setFormData({ ...formData, rewardMint: e.target.value })}
                className="font-mono text-sm"
                helperText="Token to distribute as rewards"
              />

              <Input
                label="Total Reward Amount"
                type="number"
                step="any"
                required
                value={formData.rewardAmount}
                onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                helperText="Total tokens to distribute over the duration"
              />

              <Input
                label="Duration (days)"
                type="number"
                min="1"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                helperText="Number of days to distribute rewards"
              />

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Daily Rewards:</span>
                    <span className="font-medium">
                      {formData.rewardAmount && formData.duration
                        ? (Number(formData.rewardAmount) / Number(formData.duration)).toFixed(4)
                        : '0'} tokens/day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">End Date:</span>
                    <span className="font-medium">{getEndDate()}</span>
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
                  <p><strong>Stake2Earn:</strong> Incentivize liquidity by rewarding LP token stakers.</p>
                  <p><strong>Distribution:</strong> Rewards are distributed proportionally to stakers over time.</p>
                  <p><strong>Benefits:</strong> Attracts more liquidity and increases pool TVL.</p>
                  <p><strong>Cost:</strong> You provide the reward tokens from your wallet.</p>
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
            {loading ? 'Creating Farm...' : '🌾 Create Stake2Earn Farm'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
