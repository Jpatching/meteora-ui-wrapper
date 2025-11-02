'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { TokenCreationSection } from '@/components/form-sections/TokenCreationSection';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2CreateBalancedPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createBalancedPool } = useDAMMv2();
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
    baseAmount: '',
    quoteAmount: '',
    initPrice: '',
    maxPrice: '',
    tradeFeeInBps: '25',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const dammV2 = config.dammV2Config || {};
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
      baseAmount: dammV2.baseAmount?.toString() || '',
      quoteAmount: dammV2.quoteAmount?.toString() || '',
      initPrice: dammV2.initPrice?.toString() || '',
      maxPrice: dammV2.maxPrice?.toString() || '',
      tradeFeeInBps: dammV2.poolFees?.tradeFeeInBps?.toString() || '25',
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
    const loadingToast = toast.loading('Creating DAMM v2 balanced pool...');

    try {
      const result = await createBalancedPool({
        baseMint: tokenData.createNew ? undefined : tokenData.baseMint,
        quoteMint: formData.quoteMint,
        baseAmount: formData.baseAmount,
        quoteAmount: formData.quoteAmount,
        initialPrice: formData.initPrice,
        maxPrice: formData.maxPrice,
        tradeFeeInBps: formData.tradeFeeInBps,
        createBaseToken: tokenData.createNew ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.uri,
          decimals: Number(tokenData.decimals),
          supply: tokenData.supply,
        } : undefined,
      });

      toast.success('Pool created successfully!', { id: loadingToast });

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
          <h1 className="text-3xl font-bold gradient-text">Create Balanced Pool (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Create a Dynamic AMM v2 pool with balanced liquidity on both sides
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
          templateFile="damm-v2-create-balanced.example.jsonc"
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
                Configure the balanced liquidity pool parameters
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
                  helperText="Amount of base token to deposit"
                />
                <Input
                  label="Quote Amount"
                  type="number"
                  step="any"
                  required
                  value={formData.quoteAmount}
                  onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                  helperText="Amount of quote token to deposit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Initial Price"
                  type="number"
                  step="any"
                  required
                  value={formData.initPrice}
                  onChange={(e) => setFormData({ ...formData, initPrice: e.target.value })}
                  helperText="Starting price (quote per base)"
                />
                <Input
                  label="Max Price"
                  type="number"
                  step="any"
                  required
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                  helperText="Maximum price in the range"
                />
              </div>

              <Input
                label="Trade Fee (bps)"
                type="number"
                min="0"
                max="10000"
                required
                value={formData.tradeFeeInBps}
                onChange={(e) => setFormData({ ...formData, tradeFeeInBps: e.target.value })}
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
                  <p><strong>Balanced Pool:</strong> Liquidity is deposited on both sides (base and quote tokens).</p>
                  <p><strong>Dynamic AMM:</strong> Automatically adjusts fee rates based on market volatility.</p>
                  <p><strong>Fee Tiers:</strong> Recommended fees - 0.01% (1 bps) for stable pairs, 0.25% (25 bps) for volatile pairs.</p>
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
              protocol="damm-v2"
              action="create-balanced"
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
              {loading ? 'Creating Pool...' : '🏊 Create Balanced Pool'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
