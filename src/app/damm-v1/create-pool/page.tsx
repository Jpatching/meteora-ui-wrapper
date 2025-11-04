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
import { useDAMMv1 } from '@/lib/meteora/useDAMMv1';
import toast from 'react-hot-toast';

export default function DAMMv1CreatePoolPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createPool } = useDAMMv1();
  const [loading, setLoading] = useState(false);
  const [useMetadataService, setUseMetadataService] = useState(false);

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
    baseAmount: '',
    quoteAmount: '',
    fee: '25',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const dammV1 = config.dammV1Config || {};
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
      baseAmount: dammV1.baseAmount?.toString() || '',
      quoteAmount: dammV1.quoteAmount?.toString() || '',
      fee: dammV1.fee?.toString() || '25',
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
    const loadingToast = toast.loading('Creating DAMM v1 pool...');

    try {
      const result = await createPool({
        baseMint: tokenData.createNew ? undefined : tokenData.baseMint,
        quoteMint: formData.quoteMint,
        baseAmount: formData.baseAmount,
        quoteAmount: formData.quoteAmount,
        feeBps: formData.fee,
        createBaseToken: tokenData.createNew ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.uri,
          decimals: Number(tokenData.decimals),
          supply: tokenData.supply,
        } : undefined,
      });

      toast.success('Pool created successfully!', { id: loadingToast });

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

      if (result.poolAddress) {
        toast.success(`Pool address: ${result.poolAddress}`, { duration: 10000 });
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
          <h1 className="text-3xl font-bold gradient-text">Create Pool (DAMM v1)</h1>
          <p className="text-foreground-secondary mt-2">
            Create a Dynamic AMM v1 constant product pool
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
          templateFile="damm-v1-create-pool.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Creation */}
          <TokenCreationSection
            data={tokenData}
            onChange={(updates) => setTokenData({ ...tokenData, ...updates })}
            metadataServiceEnabled={true}
            onMetadataServiceToggle={setUseMetadataService}
          />

          {/* Pool Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Configuration</CardTitle>
              <CardDescription>
                Configure the constant product pool parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuoteMintSelector
                value={formData.quoteMint}
                onChange={(value) => setFormData({ ...formData, quoteMint: value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base Amount"
                  type="number"
                  step="any"
                  required
                  value={formData.baseAmount}
                  onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                  helperText="Initial base token liquidity"
                />
                <Input
                  label="Quote Amount"
                  type="number"
                  step="any"
                  required
                  value={formData.quoteAmount}
                  onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                  helperText="Initial quote token liquidity"
                />
              </div>

              <Input
                label="Trading Fee (bps)"
                type="number"
                min="0"
                max="10000"
                required
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                helperText="Trading fee in basis points (100 bps = 1%)"
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>DAMM v1:</strong> Constant product (x * y = k) AMM model, similar to Uniswap v2.</p>
                  <p><strong>Initial Price:</strong> Determined by the ratio of base to quote amounts.</p>
                  <p><strong>Fee Recommendation:</strong> 0.25% (25 bps) for most pairs, 0.01% (1 bps) for stablecoins.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure
            variant="default"
            includeMetadataService={useMetadataService}
          />

          <div className="flex gap-3">
            <ConfigExportButton
              formData={formData}
              protocol="damm-v1"
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
              {loading ? 'Creating Pool...' : '🏊 Create Pool'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
