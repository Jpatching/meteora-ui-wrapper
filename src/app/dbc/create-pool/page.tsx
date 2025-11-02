'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { TokenCreationSection } from '@/components/form-sections/TokenCreationSection';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCCreatePoolPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createPool } = useDBC();
  const [loading, setLoading] = useState(false);

  // Token creation state
  const [tokenData, setTokenData] = useState({
    createNew: true,
    name: '',
    symbol: '',
    uri: '',
    decimals: '9',
    supply: '',
    baseMint: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    quoteMint: 'So11111111111111111111111111111111111111112',
    configAddress: '',
    initialPrice: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const pool = config.dbcPool || {};
    const tokenCreate = config.createBaseToken;

    if (tokenCreate) {
      setTokenData({
        createNew: true,
        name: tokenCreate.name || '',
        symbol: tokenCreate.symbol || '',
        uri: tokenCreate.uri || '',
        decimals: tokenCreate.decimals?.toString() || '9',
        supply: tokenCreate.supply?.toString() || '',
        baseMint: '',
      });
    }

    setFormData({
      ...formData,
      quoteMint: config.quoteMint || formData.quoteMint,
      configAddress: pool.configAddress || '',
      initialPrice: pool.initialPrice?.toString() || '',
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
    const loadingToast = toast.loading('Creating DBC pool...');

    try {
      const result = await createPool({
        baseMint: tokenData.createNew ? undefined : tokenData.baseMint,
        configAddress: formData.configAddress,
        name: tokenData.name,
        symbol: tokenData.symbol,
        uri: tokenData.uri,
        createBaseToken: tokenData.createNew ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.uri,
          decimals: Number(tokenData.decimals),
          supply: tokenData.supply,
        } : undefined,
      });

      toast.success('DBC pool created successfully!', { id: loadingToast });

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

      if (result.baseMint) {
        toast.success(`Base mint: ${result.baseMint}`, { duration: 10000 });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pool', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Create DBC Pool</h1>
          <p className="text-foreground-secondary mt-2">
            Create a Dynamic Bonding Curve pool for token launch
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
          templateFile="dbc-create-pool.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Creation */}
          <TokenCreationSection
            data={tokenData}
            onChange={(updates) => setTokenData({ ...tokenData, ...updates })}
          />

          {/* Pool Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Configuration</CardTitle>
              <CardDescription>
                Configure the bonding curve pool parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuoteMintSelector
                value={formData.quoteMint}
                onChange={(value) => setFormData({ ...formData, quoteMint: value })}
              />

              <Input
                label="DBC Config Address"
                placeholder="ConfigAddress..."
                required
                value={formData.configAddress}
                onChange={(e) => setFormData({ ...formData, configAddress: e.target.value })}
                className="font-mono text-sm"
                helperText="The address of the DBC configuration to use"
              />

              <Input
                label="Initial Price"
                type="number"
                step="any"
                required
                value={formData.initialPrice}
                onChange={(e) => setFormData({ ...formData, initialPrice: e.target.value })}
                helperText="Starting price for the bonding curve (quote per base)"
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Launch Mechanism:</strong> Price increases along a bonding curve as tokens are purchased.</p>
                  <p><strong>Fair Launch:</strong> No presale, everyone buys at the current curve price.</p>
                  <p><strong>Auto Migration:</strong> When threshold is reached, automatically becomes a full AMM pool.</p>
                  <p><strong>Creator Benefits:</strong> Collect fees and maintain control during bonding curve phase.</p>
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
              action="create-pool"
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
              {loading ? 'Creating Pool...' : '🚀 Create DBC Pool'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
