'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv1 } from '@/lib/meteora/useDAMMv1';
import toast from 'react-hot-toast';

export default function DAMMv1LockStake2EarnPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { lockStake2Earn } = useDAMMv1();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    farmAddress: '',
    lockDuration: '7',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const lock = config.lockStake2Earn || {};
    setFormData({
      ...formData,
      farmAddress: lock.farmAddress || '',
      lockDuration: lock.lockDuration?.toString() || '7',
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
    const loadingToast = toast.loading('Locking Stake2Earn farm...');

    try {
      const result = await lockStake2Earn(formData);

      toast.success('Stake2Earn farm locked successfully!', { id: loadingToast });

      // Show transaction links
      if (result.signatures && result.signatures.length > 0) {
        const firstSig = result.signatures[0];
        const explorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/tx/${firstSig}`
          : `https://solscan.io/tx/${firstSig}?cluster=${network}`;

        toast.success(
          <div>
            {result.signatures.length} transaction(s) successful! <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View on Solscan
            </a>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to lock farm', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Calculate unlock date
  const getUnlockDate = () => {
    const days = Number(formData.lockDuration || 0);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Lock Stake2Earn (DAMM v1)</h1>
          <p className="text-foreground-secondary mt-2">
            Time-lock your Stake2Earn farm to prevent early closure
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
          {/* Farm Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Farm Selection</CardTitle>
              <CardDescription>
                Select the Stake2Earn farm to lock
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Farm Address"
                placeholder="FarmAddress..."
                required
                value={formData.farmAddress}
                onChange={(e) => setFormData({ ...formData, farmAddress: e.target.value })}
                className="font-mono text-sm"
                helperText="The address of the Stake2Earn farm"
              />
            </CardContent>
          </Card>

          {/* Lock Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Lock Configuration</CardTitle>
              <CardDescription>
                Configure the time-lock duration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Lock Duration (days)"
                type="number"
                min="1"
                required
                value={formData.lockDuration}
                onChange={(e) => setFormData({ ...formData, lockDuration: e.target.value })}
                helperText="Number of days to lock the farm"
              />

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Lock Duration:</span>
                    <span className="font-medium">{formData.lockDuration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Unlock Date:</span>
                    <span className="font-medium">{getUnlockDate()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-2 text-sm text-warning">
                  <p><strong>Warning:</strong> This action cannot be reversed.</p>
                  <p>The farm will be locked until {getUnlockDate()}.</p>
                  <p>You will NOT be able to close the farm or withdraw rewards during this period.</p>
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
                  <p><strong>Purpose:</strong> Guarantee reward availability for the full farm duration.</p>
                  <p><strong>Benefits:</strong> Builds trust with stakers and demonstrates long-term commitment.</p>
                  <p><strong>Staking:</strong> Users can still stake and unstake LP tokens during the lock period.</p>
                  <p><strong>Rewards:</strong> Rewards continue to be distributed according to the farm schedule.</p>
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
            {loading ? 'Locking Farm...' : '🔒 Lock Stake2Earn'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
