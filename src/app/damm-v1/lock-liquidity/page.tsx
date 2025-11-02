'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDAMMv1 } from '@/lib/meteora/useDAMMv1';
import toast from 'react-hot-toast';

export default function DAMMv1LockLiquidityPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { lockLiquidity } = useDAMMv1();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    baseMint: '',
    quoteMint: 'So11111111111111111111111111111111111111112',
    duration: '7',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const lock = config.dammV1LockLiquidity || {};
    setFormData({
      ...formData,
      baseMint: lock.baseMint || config.baseMint || '',
      quoteMint: lock.quoteMint || config.quoteMint || formData.quoteMint,
      duration: lock.duration?.toString() || '7',
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
    const loadingToast = toast.loading('Locking liquidity...');

    try {
      const result = await lockLiquidity(formData);

      toast.success('Liquidity locked successfully!', { id: loadingToast });

      // Show transaction links (multiple signatures)
      if (result.signatures && result.signatures.length > 0) {
        result.signatures.forEach((sig: string, index: number) => {
          const explorerUrl = network === 'mainnet-beta'
            ? `https://solscan.io/tx/${sig}`
            : `https://solscan.io/tx/${sig}?cluster=${network}`;

          toast.success(
            <div>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
                View transaction {index + 1} on Solscan
              </a>
            </div>,
            { duration: 10000 }
          );
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to lock liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Calculate unlock date
  const getUnlockDate = () => {
    const days = Number(formData.duration || 0);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Lock Liquidity (DAMM v1)</h1>
          <p className="text-foreground-secondary mt-2">
            Time-lock your liquidity to prevent early withdrawal
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
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Selection</CardTitle>
              <CardDescription>
                Select the DAMM v1 pool to lock liquidity in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Base Token Mint"
                placeholder="TokenMint111..."
                required
                value={formData.baseMint}
                onChange={(e) => setFormData({ ...formData, baseMint: e.target.value })}
                className="font-mono text-sm"
                helperText="The base token mint address"
              />
              <Input
                label="Quote Token Mint"
                placeholder="So11111111111111111111111111111111111111112"
                required
                value={formData.quoteMint}
                onChange={(e) => setFormData({ ...formData, quoteMint: e.target.value })}
                className="font-mono text-sm"
                helperText="The quote token mint address (usually SOL)"
              />
            </CardContent>
          </Card>

          {/* Lock Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Lock Configuration</CardTitle>
              <CardDescription>
                Configure the time-lock duration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Lock Duration (days)"
                type="number"
                min="1"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                helperText="Number of days to lock liquidity"
              />

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Lock Duration:</span>
                    <span className="font-medium">{formData.duration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Unlock Date:</span>
                    <span className="font-medium">{getUnlockDate()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-2 text-sm text-warning">
                  <p><strong>Warning:</strong> This action cannot be reversed.</p>
                  <p>Your liquidity will be locked until {getUnlockDate()}.</p>
                  <p>You will NOT be able to withdraw or remove liquidity during this period.</p>
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
                  <p><strong>Purpose:</strong> Demonstrate commitment to the project and prevent rug pulls.</p>
                  <p><strong>Benefits:</strong> Builds trust with community and other liquidity providers.</p>
                  <p><strong>Fees:</strong> You continue to earn trading fees during the lock period.</p>
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
            variant="danger"
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading ? 'Locking Liquidity...' : '🔒 Lock Liquidity'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
