'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import toast from 'react-hot-toast';

export default function DAMMv2RemoveLiquidityPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { removeLiquidity } = useDAMMv2();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    lpTokenAmount: '',
    slippageBps: '100',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const remove = config.removeLiquidity || {};
    setFormData({
      ...formData,
      poolAddress: remove.poolAddress || '',
      lpTokenAmount: remove.lpTokenAmount?.toString() || '',
      slippageBps: remove.slippageBps?.toString() || '100',
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
    const loadingToast = toast.loading('Removing liquidity...');

    try {
      const result = await removeLiquidity({
        poolAddress: formData.poolAddress,
        liquidityAmount: formData.lpTokenAmount,
        slippageBps: Number(formData.slippageBps),
      });

      toast.success('Liquidity removed successfully!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to remove liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Remove Liquidity (DAMM v2)</h1>
          <p className="text-foreground-secondary mt-2">
            Withdraw liquidity from a DAMM v2 pool by burning LP tokens
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
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DAMM v2 pool to remove liquidity from
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

          {/* Withdrawal Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Configuration</CardTitle>
              <CardDescription>
                Specify how much liquidity to withdraw
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="LP Token Amount"
                type="number"
                step="any"
                required
                value={formData.lpTokenAmount}
                onChange={(e) => setFormData({ ...formData, lpTokenAmount: e.target.value })}
                helperText="Amount of LP tokens to burn (will receive both base and quote tokens)"
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
                  <p><strong>LP Token Burning:</strong> Your LP tokens are burned and you receive the underlying assets.</p>
                  <p><strong>Proportional Withdrawal:</strong> You'll receive both base and quote tokens based on your share.</p>
                  <p><strong>Fees Included:</strong> Your withdrawal includes any accumulated trading fees.</p>
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
            {loading ? 'Removing Liquidity...' : '➖ Remove Liquidity'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
