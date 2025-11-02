'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Select, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCSwapPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { swap } = useDBC();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    amount: '',
    side: 'buy',
    slippageBps: '100',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const swap = config.dbcSwap || {};
    setFormData({
      ...formData,
      poolAddress: swap.poolAddress || '',
      amount: swap.amount?.toString() || '',
      side: swap.side || 'buy',
      slippageBps: swap.slippageBps?.toString() || '100',
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
    const loadingToast = toast.loading(`${formData.side === 'buy' ? 'Buying' : 'Selling'} tokens...`);

    try {
      const result = await swap({
        baseMint: formData.poolAddress,
        amountIn: formData.amount,
        side: formData.side,
        slippageBps: Number(formData.slippageBps),
      });

      toast.success(`${formData.side === 'buy' ? 'Bought' : 'Sold'} successfully!`, { id: loadingToast });

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
      toast.error(error.message || 'Swap failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">DBC Swap</h1>
          <p className="text-foreground-secondary mt-2">
            Buy or sell tokens on the Dynamic Bonding Curve
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
          templateFile="dbc-swap.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DBC pool to trade on
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
                helperText="The address of the DBC pool"
              />
            </CardContent>
          </Card>

          {/* Swap Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Swap Configuration</CardTitle>
              <CardDescription>
                Configure your swap parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Swap Side"
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                helperText="Buy tokens with quote currency or sell tokens for quote currency"
              >
                <option value="buy">Buy (Quote → Base)</option>
                <option value="sell">Sell (Base → Quote)</option>
              </Select>

              <Input
                label="Amount"
                type="number"
                step="any"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                helperText={formData.side === 'buy' ? 'Amount of quote tokens to spend' : 'Amount of base tokens to sell'}
              />

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
                  <p><strong>Bonding Curve Pricing:</strong> Price increases with each buy, decreases with each sell.</p>
                  <p><strong>Buy:</strong> Spend quote tokens (e.g., SOL) to receive base tokens.</p>
                  <p><strong>Sell:</strong> Sell base tokens to receive quote tokens.</p>
                  <p><strong>Slippage:</strong> Larger trades will move the price more on the curve.</p>
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
              action="swap"
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
              {loading
                ? 'Processing...'
                : formData.side === 'buy'
                  ? '📈 Buy Tokens'
                  : '📉 Sell Tokens'
              }
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
