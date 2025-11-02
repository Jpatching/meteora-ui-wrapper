'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCCreateConfigPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createConfig } = useDBC();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    migrationQuoteThreshold: '',
    tradingFee: '25',
    protocolFee: '10',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const dbcCfg = config.dbcConfig || {};
    setFormData({
      ...formData,
      migrationQuoteThreshold: dbcCfg.migrationQuoteThreshold?.toString() || '',
      tradingFee: dbcCfg.tradingFee?.toString() || '25',
      protocolFee: dbcCfg.protocolFee?.toString() || '10',
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
    const loadingToast = toast.loading('Creating DBC config...');

    try {
      const result = await createConfig({
        quoteMint: 'So11111111111111111111111111111111111111112',
        migrationQuoteThreshold: formData.migrationQuoteThreshold,
        tradingFee: formData.tradingFee,
        protocolFee: formData.protocolFee,
      });

      toast.success('DBC config created successfully!', { id: loadingToast });

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

      if (result.configAddress) {
        toast.success(`Config address: ${result.configAddress}`, { duration: 10000 });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create config', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Create DBC Config</h1>
          <p className="text-foreground-secondary mt-2">
            Create a configuration for Dynamic Bonding Curve pools
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
          templateFile="dbc-create-config.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Configuration Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Parameters</CardTitle>
              <CardDescription>
                Set the parameters for your DBC pools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Migration Quote Threshold"
                type="number"
                step="any"
                required
                value={formData.migrationQuoteThreshold}
                onChange={(e) => setFormData({ ...formData, migrationQuoteThreshold: e.target.value })}
                helperText="Amount of quote tokens needed to trigger migration to AMM pool"
              />

              <Input
                label="Trading Fee (bps)"
                type="number"
                min="0"
                max="10000"
                required
                value={formData.tradingFee}
                onChange={(e) => setFormData({ ...formData, tradingFee: e.target.value })}
                helperText="Trading fee in basis points (100 bps = 1%)"
              />

              <Input
                label="Protocol Fee (bps)"
                type="number"
                min="0"
                max="10000"
                required
                value={formData.protocolFee}
                onChange={(e) => setFormData({ ...formData, protocolFee: e.target.value })}
                helperText="Protocol fee in basis points (100 bps = 1%)"
              />

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Total Fee:</span>
                    <span className="font-medium">
                      {Number(formData.tradingFee || 0) + Number(formData.protocolFee || 0)} bps (
                      {((Number(formData.tradingFee || 0) + Number(formData.protocolFee || 0)) / 100).toFixed(2)}%)
                    </span>
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
                  <p><strong>Dynamic Bonding Curve:</strong> A two-phase token launch mechanism.</p>
                  <p><strong>Phase 1 - Bonding Curve:</strong> Price increases as more tokens are bought.</p>
                  <p><strong>Phase 2 - AMM Pool:</strong> Automatically migrates to full AMM once threshold is reached.</p>
                  <p><strong>Migration:</strong> Happens when quote token collected reaches the threshold.</p>
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
              protocol="dbc"
              action="create-config"
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
              {loading ? 'Creating Config...' : '⚙️ Create DBC Config'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
