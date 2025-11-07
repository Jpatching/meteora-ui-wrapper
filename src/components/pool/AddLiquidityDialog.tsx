/**
 * Add Liquidity Dialog Component
 * Modal for adding liquidity to DLMM pools with strategy selection
 */

'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { Pool } from '@/lib/jupiter/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface AddLiquidityDialogProps {
  pool: Pool;
  isOpen: boolean;
  onClose: () => void;
}

export function AddLiquidityDialog({ pool, isOpen, onClose }: AddLiquidityDialogProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tokenAAmount: '',
    tokenBAmount: '',
    strategy: 'spot',
  });

  const strategies = [
    { value: 'spot', label: 'Spot (Balanced)', description: 'Balanced liquidity around current price' },
    { value: 'curve', label: 'Curve (Wide Range)', description: 'Wider price range for more trading volume' },
    { value: 'bidask', label: 'Bid/Ask (Tight Range)', description: 'Concentrated liquidity for better capital efficiency' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.tokenAAmount && !formData.tokenBAmount) {
      toast.error('Please enter at least one token amount');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating position...');

    try {
      // Call backend to create position transaction
      const response = await fetch('http://localhost:4000/api/positions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress: pool.id,
          walletAddress: publicKey.toBase58(),
          tokenAAmount: formData.tokenAAmount ? parseFloat(formData.tokenAAmount) * (10 ** (pool.baseAsset.decimals || 9)) : 0,
          tokenBAmount: formData.tokenBAmount ? parseFloat(formData.tokenBAmount) * (10 ** 9) : 0, // Default to 9 decimals for quote asset
          strategy: formData.strategy,
          network: 'mainnet-beta', // TODO: Use network from context
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create position');
      }

      console.log('✅ Position transaction created:', result.data);

      // Deserialize and sign transaction
      const txBuffer = Buffer.from(result.data.transaction, 'base64');
      const tx = Transaction.from(txBuffer);

      // Sign transaction with wallet
      const signedTx = await signTransaction(tx);

      // Send transaction
      const signature = await sendTransaction(signedTx, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('📤 Transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Position created successfully!', { id: loadingToast });
      toast.success(
        <div>
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View transaction on Solscan →
          </a>
        </div>,
        { duration: 10000 }
      );

      // Reset form and close dialog
      setFormData({ tokenAAmount: '', tokenBAmount: '', strategy: 'spot' });
      onClose();
    } catch (error: any) {
      console.error('❌ Error creating position:', error);
      toast.error(error.message || 'Failed to create position', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-2xl w-full mx-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add Liquidity to {pool.baseAsset.symbol}/{pool.quoteAsset?.symbol || 'USDC'}</CardTitle>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-white transition-colors"
              disabled={loading}
            >
              ✕
            </button>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pool Info */}
              <div className="bg-surface-light rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Pool Address:</span>
                  <code className="text-primary">{pool.id.slice(0, 8)}...{pool.id.slice(-8)}</code>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Current Price:</span>
                  <span className="text-white">${pool.baseAsset.usdPrice?.toFixed(6) || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">TVL:</span>
                  <span className="text-white">${pool.baseAsset.liquidity?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>

              {/* Token Amounts */}
              <div className="space-y-4">
                <Input
                  label={`${pool.baseAsset.symbol} Amount`}
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={formData.tokenAAmount}
                  onChange={(e) => setFormData({ ...formData, tokenAAmount: e.target.value })}
                  helperText={`Amount of ${pool.baseAsset.symbol} to deposit`}
                  disabled={loading}
                />

                <Input
                  label={`${pool.quoteAsset?.symbol || 'USDC'} Amount`}
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={formData.tokenBAmount}
                  onChange={(e) => setFormData({ ...formData, tokenBAmount: e.target.value })}
                  helperText={`Amount of ${pool.quoteAsset?.symbol || 'USDC'} to deposit`}
                  disabled={loading}
                />
              </div>

              {/* Strategy Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Liquidity Strategy
                </label>
                <div className="space-y-2">
                  {strategies.map((strategy) => (
                    <label
                      key={strategy.value}
                      className={`block cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        formData.strategy === strategy.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value={strategy.value}
                        checked={formData.strategy === strategy.value}
                        onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                        className="sr-only"
                        disabled={loading}
                      />
                      <div className="flex items-start">
                        <div className={`mt-0.5 mr-3 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          formData.strategy === strategy.value ? 'border-primary' : 'border-border'
                        }`}>
                          {formData.strategy === strategy.value && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{strategy.label}</div>
                          <div className="text-sm text-text-secondary">{strategy.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-warning mr-2">⚠️</span>
                  <div className="text-sm text-text-secondary">
                    <strong className="text-warning">Important:</strong> By adding liquidity, you expose yourself to impermanent loss.
                    Please ensure you understand the risks before proceeding.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                  disabled={!publicKey}
                >
                  {!publicKey ? 'Connect Wallet' : 'Add Liquidity'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
