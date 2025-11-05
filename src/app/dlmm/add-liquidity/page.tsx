/**
 * DLMM Add Liquidity Page
 * Docs: https://docs.meteora.ag/developer-guide/dlmm/add-liquidity
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function DLMMAddLiquidityPage() {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    poolAddress: '',
    tokenAAmount: '',
    tokenBAmount: '',
    minBinId: '',
    maxBinId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Adding liquidity...');

    try {
      const response = await fetch('/api/dlmm/add-liquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          walletAddress: publicKey?.toBase58(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Liquidity added successfully!', { id: loadingToast });
        // Reset form
        setFormData({
          poolAddress: '',
          tokenAAmount: '',
          tokenBAmount: '',
          minBinId: '',
          maxBinId: '',
        });
      } else {
        toast.error(result.error || 'Failed to add liquidity', { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>DLMM Add Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Pool Address"
                placeholder="Enter DLMM pool address"
                value={formData.poolAddress}
                onChange={(e) => setFormData({ ...formData, poolAddress: e.target.value })}
                required
                helperText="The address of the DLMM pool"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Token A Amount"
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={formData.tokenAAmount}
                  onChange={(e) => setFormData({ ...formData, tokenAAmount: e.target.value })}
                  required
                  helperText="Amount of Token A"
                />

                <Input
                  label="Token B Amount"
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={formData.tokenBAmount}
                  onChange={(e) => setFormData({ ...formData, tokenBAmount: e.target.value })}
                  required
                  helperText="Amount of Token B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Bin ID"
                  type="number"
                  placeholder="e.g. -100"
                  value={formData.minBinId}
                  onChange={(e) => setFormData({ ...formData, minBinId: e.target.value })}
                  required
                  helperText="Minimum bin ID for liquidity range"
                />

                <Input
                  label="Max Bin ID"
                  type="number"
                  placeholder="e.g. 100"
                  value={formData.maxBinId}
                  onChange={(e) => setFormData({ ...formData, maxBinId: e.target.value })}
                  required
                  helperText="Maximum bin ID for liquidity range"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  disabled={!connected}
                >
                  {connected ? 'Add Liquidity' : 'Connect Wallet'}
                </Button>
              </div>

              {!connected && (
                <p className="text-sm text-warning text-center">
                  Please connect your wallet to add liquidity
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
