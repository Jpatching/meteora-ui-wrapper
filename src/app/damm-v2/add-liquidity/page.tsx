'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2AddLiquidityPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { addLiquidity } = useDAMMv2();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    baseAmount: '',
    quoteAmount: '',
    slippageBps: '100',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const add = config.addLiquidity || {};
    setFormData({
      ...formData,
      poolAddress: add.poolAddress || '',
      baseAmount: add.baseAmount?.toString() || '',
      quoteAmount: add.quoteAmount?.toString() || '',
      slippageBps: add.slippageBps?.toString() || '100',
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
    const loadingToast = toast.loading('Adding liquidity...');

    try {
      const result = await addLiquidity({
        poolAddress: formData.poolAddress,
        amountIn: formData.baseAmount,
        isTokenA: true,
        slippageBps: Number(formData.slippageBps),
      });

      toast.success('Liquidity added successfully!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to add liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Add Liquidity (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Add liquidity to an existing DAMM v2 pool
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
          templateFile="damm-v2-add-liquidity.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DAMM v2 pool to add liquidity to
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
                helperText="The address of the DAMM v2 pool"
              />
            </CardContent>
          </Card>

          {/* Liquidity Amounts */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Amounts</CardTitle>
              <CardDescription>
                Specify how much of each token to deposit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base Amount"
                  type="number"
                  step="any"
                  required
                  value={formData.baseAmount}
                  onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                  helperText="Amount of base token"
                />
                <Input
                  label="Quote Amount"
                  type="number"
                  step="any"
                  required
                  value={formData.quoteAmount}
                  onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                  helperText="Amount of quote token"
                />
              </div>

              <Input
                label="Slippage Tolerance (bps)"
                type="number"
                min="0"
                max="10000"
                required
                value={formData.slippageBps}
                onChange={(e) => setFormData({ ...formData, slippageBps: e.target.value })}
                helperText="Maximum price slippage allowed (100 bps = 1%)"
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Balanced Deposit:</strong> Tokens are added in proportion to the current pool ratio.</p>
                  <p><strong>Slippage Protection:</strong> Transaction will fail if price moves more than tolerance.</p>
                  <p><strong>LP Tokens:</strong> You'll receive LP tokens representing your share of the pool.</p>
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
              action="add-liquidity"
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
              {loading ? 'Adding Liquidity...' : '➕ Add Liquidity'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
