'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Select, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { TokenCreationSection } from '@/components/form-sections/TokenCreationSection';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2CreateOneSidedPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { createOneSidedPool } = useDAMMv2();
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
    depositSide: 'base',
    depositAmount: '',
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
      depositAmount: dammV2.baseAmount?.toString() || dammV2.quoteAmount?.toString() || '',
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
    const loadingToast = toast.loading('Creating DAMM v2 one-sided pool...');

    try {
      const result = await createOneSidedPool({
        baseMint: tokenData.createNew ? undefined : tokenData.baseMint,
        quoteMint: formData.quoteMint,
        baseAmount: formData.depositAmount,
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
          <h1 className="text-3xl font-bold gradient-text">Create One-Sided Pool (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Create a Dynamic AMM v2 pool with liquidity on only one side
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
                Configure the one-sided liquidity pool parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuoteMintSelector
                value={formData.quoteMint}
                onChange={(value) => setFormData({ ...formData, quoteMint: value })}
              />

              <Select
                label="Deposit Side"
                value={formData.depositSide}
                onChange={(e) => setFormData({ ...formData, depositSide: e.target.value })}
                helperText="Which token to deposit"
              >
                <option value="base">Base Token Only</option>
                <option value="quote">Quote Token Only</option>
              </Select>

              <Input
                label="Deposit Amount"
                type="number"
                step="any"
                required
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                helperText={`Amount of ${formData.depositSide === 'base' ? 'base' : 'quote'} token to deposit`}
              />

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
                  <p><strong>One-Sided Pool:</strong> Liquidity is deposited on only one side (base OR quote token).</p>
                  <p><strong>Use Case:</strong> Ideal when you only have one token and want to provide liquidity.</p>
                  <p><strong>Note:</strong> The pool will automatically convert to two-sided as swaps occur.</p>
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading ? 'Creating Pool...' : '🏊 Create One-Sided Pool'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
