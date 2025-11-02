'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Select, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import toast from 'react-hot-toast';

export default function DLMMSetStatusPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { setPoolStatus } = useDLMM();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    status: 'enabled',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const status = config.setDlmmPoolStatus || {};
    setFormData({
      ...formData,
      poolAddress: status.poolAddress || '',
      status: status.status || 'enabled',
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
    const loadingToast = toast.loading('Updating pool status...');

    try {
      const result = await setPoolStatus(formData);

      toast.success(
        `Pool ${formData.status === 'enabled' ? 'enabled' : 'disabled'} successfully!`,
        { id: loadingToast, duration: 5000 }
      );

      // Log results for user reference
      console.log('Pool status updated:');
      console.log('Status:', result.status);
      console.log('Signature:', result.signature);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pool status', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Set Pool Status</h1>
          <p className="text-foreground-secondary mt-2">
            Enable or disable trading on your DLMM pool
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
          {/* Pool Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Configuration</CardTitle>
              <CardDescription>
                Select the pool and desired status
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
                helperText="The address of the DLMM pool to modify"
              />
              <Select
                label="Pool Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                helperText="Enable or disable trading on this pool"
              >
                <option value="enabled">Enabled (Trading Active)</option>
                <option value="disabled">Disabled (Trading Paused)</option>
              </Select>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Pool Control:</strong> Only the pool creator can enable/disable trading.</p>
                  <p><strong>Enabled:</strong> Users can swap and add/remove liquidity.</p>
                  <p><strong>Disabled:</strong> All trading is paused. Useful for maintenance or emergency situations.</p>
                  <p><strong>Note:</strong> Disabling a pool does not affect existing liquidity positions, only new swaps.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card for Disabling */}
          {formData.status === 'disabled' && (
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="space-y-2 text-sm text-warning">
                    <p><strong>Warning:</strong> Disabling the pool will prevent all users from trading.</p>
                    <p>Only disable if absolutely necessary (e.g., security issue, migration, maintenance).</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure variant="default" />

          <Button
            type="submit"
            variant={formData.status === 'enabled' ? 'primary' : 'danger'}
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading
              ? 'Updating...'
              : formData.status === 'enabled'
                ? '✅ Enable Pool'
                : '🛑 Disable Pool'
            }
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
