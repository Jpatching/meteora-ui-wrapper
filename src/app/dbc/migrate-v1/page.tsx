'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCMigrateV1Page() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { migrateToDAMMv1 } = useDBC();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const migrate = config.migrateV1 || {};
    setFormData({
      ...formData,
      poolAddress: migrate.poolAddress || '',
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
    const loadingToast = toast.loading('Migrating to DAMM v1...');

    try {
      const result = await migrateToDAMMv1({
        baseMint: formData.poolAddress,
      });

      toast.success('Migration to DAMM v1 successful!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to migrate', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Migrate to DAMM v1</h1>
          <p className="text-foreground-secondary mt-2">
            Migrate your DBC pool to a DAMM v1 constant product AMM
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
                Select the DBC pool to migrate
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
                helperText="The address of the DBC pool to migrate"
              />
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-2 text-sm text-warning">
                  <p><strong>Important:</strong> This action is irreversible.</p>
                  <p>The bonding curve will be permanently converted to a DAMM v1 pool.</p>
                  <p>Ensure the migration threshold has been reached before proceeding.</p>
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
                  <p><strong>Migration Process:</strong> Converts bonding curve to traditional constant product AMM.</p>
                  <p><strong>DAMM v1:</strong> Uses x * y = k pricing model, similar to Uniswap v2.</p>
                  <p><strong>Liquidity:</strong> All bonding curve liquidity becomes AMM liquidity.</p>
                  <p><strong>Trading:</strong> Users can now add/remove liquidity freely like any AMM pool.</p>
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
            {loading ? 'Migrating...' : '🔄 Migrate to DAMM v1'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
