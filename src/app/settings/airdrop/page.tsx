'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button } from '@/components/ui';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';

export default function AirdropPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('1');

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (network === 'mainnet-beta') {
      toast.error('Airdrop is not available on mainnet');
      return;
    }

    const airdropAmount = Number(amount);
    if (isNaN(airdropAmount) || airdropAmount <= 0 || airdropAmount > 5) {
      toast.error('Please enter a valid amount (0-5 SOL)');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Requesting ${amount} SOL airdrop...`);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        airdropAmount * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`Successfully airdropped ${amount} SOL!`, { id: loadingToast });
    } catch (error: any) {
      console.error('Airdrop error:', error);
      toast.error(error.message || 'Airdrop failed. Try a smaller amount or wait a moment.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">SOL Airdrop</h1>
          <p className="text-foreground-secondary mt-2">
            Request test SOL on devnet
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

        {/* Mainnet Warning */}
        {network === 'mainnet-beta' && (
          <Card className="border-error/20 bg-error/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <p className="text-error">Airdrop is not available on mainnet. Switch to devnet.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-secondary">Current Network</p>
                <p className="text-lg font-medium capitalize">{network}</p>
              </div>
              {publicKey && (
                <div className="text-right">
                  <p className="text-sm text-foreground-secondary">Your Address</p>
                  <p className="text-sm font-mono">{publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Airdrop Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Airdrop</CardTitle>
            <CardDescription>
              Get test SOL for development and testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Amount (SOL)"
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helperText="Max 2 SOL per request on devnet"
            />

            <Button
              onClick={handleAirdrop}
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!publicKey || loading || network === 'mainnet-beta'}
              className="w-full"
            >
              {loading ? 'Requesting Airdrop...' : '💧 Request Airdrop'}
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-info/20 bg-info/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <span className="text-2xl">💡</span>
              <div className="space-y-2 text-sm text-foreground-secondary">
                <p><strong>Airdrop Limits:</strong></p>
                <p>• <strong>Devnet:</strong> Up to 2 SOL per request, rate limited</p>
                <p>• <strong>Mainnet:</strong> No airdrop available (real SOL only)</p>
                <p className="pt-2"><strong>Tips:</strong></p>
                <p>• If airdrop fails, wait a few seconds and try again</p>
                <p>• Use smaller amounts if requests are failing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLI Alternative */}
        <Card>
          <CardHeader>
            <CardTitle>Alternative: Use Solana CLI</CardTitle>
            <CardDescription>
              Command line airdrop instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-foreground-secondary">1. Configure network:</p>
              <div className="p-3 rounded-lg bg-background-tertiary font-mono text-sm">
                solana config set --url {network === 'devnet' ? 'devnet' : 'mainnet-beta'}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground-secondary">2. Request airdrop:</p>
              <div className="p-3 rounded-lg bg-background-tertiary font-mono text-sm">
                solana airdrop {amount} {publicKey?.toBase58() || 'YOUR_ADDRESS'}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground-secondary">3. Check balance:</p>
              <div className="p-3 rounded-lg bg-background-tertiary font-mono text-sm">
                solana balance
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
