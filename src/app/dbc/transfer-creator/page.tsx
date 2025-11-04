'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, ReferralInput, FeeDisclosure } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDBC } from '@/lib/meteora/useDBC';
import toast from 'react-hot-toast';

export default function DBCTransferCreatorPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { transferCreator } = useDBC();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poolAddress: '',
    newCreator: '',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const transfer = config.transferCreator || {};
    setFormData({
      ...formData,
      poolAddress: transfer.poolAddress || '',
      newCreator: transfer.newCreator || '',
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
    const loadingToast = toast.loading('Transferring creator role...');

    try {
      const result = await transferCreator({
        baseMint: formData.poolAddress,
        newCreator: formData.newCreator,
      });

      toast.success('Creator role transferred successfully!', { id: loadingToast });

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
      toast.error(error.message || 'Failed to transfer creator role', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Transfer Creator Role</h1>
          <p className="text-foreground-secondary mt-2">
            Transfer creator permissions to a new address
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
                Select the DBC pool to transfer creator role
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

          {/* Transfer Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Configuration</CardTitle>
              <CardDescription>
                Specify the new creator address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="New Creator Address"
                placeholder="PublicKey..."
                required
                value={formData.newCreator}
                onChange={(e) => setFormData({ ...formData, newCreator: e.target.value })}
                className="font-mono text-sm"
                helperText="The wallet address that will become the new creator"
              />
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-2 text-sm text-warning">
                  <p><strong>Critical Warning:</strong> This action is irreversible!</p>
                  <p>You will permanently lose creator permissions for this pool.</p>
                  <p>The new creator will have full control including fee collection and migration.</p>
                  <p>Double-check the new creator address before confirming.</p>
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
                  <p><strong>Creator Permissions:</strong> Control pool settings, fee collection, and migration.</p>
                  <p><strong>Use Cases:</strong> Transferring to multi-sig, DAO, or new team member.</p>
                  <p><strong>Verification:</strong> Ensure the recipient address is correct before proceeding.</p>
                  <p><strong>No Reversal:</strong> You cannot reclaim creator role after transfer.</p>
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
            {loading ? 'Transferring...' : '🔑 Transfer Creator Role'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
