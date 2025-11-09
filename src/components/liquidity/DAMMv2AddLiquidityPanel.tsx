/**
 * DAMM v2 Add Liquidity Panel
 * Uses CpAmm.addLiquidity() with deposit quote
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import { useTokenBalance, useSOLBalance } from '@/lib/hooks/useTokenBalance';
import toast from 'react-hot-toast';

interface DAMMv2AddLiquidityPanelProps {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

export function DAMMv2AddLiquidityPanel({
  poolAddress,
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
}: DAMMv2AddLiquidityPanelProps) {
  const { connected } = useWallet();
  const { addLiquidity } = useDAMMv2();

  // Token balances
  const { data: tokenXBalance } = useTokenBalance(tokenXMint);
  const { data: tokenYBalance } = useTokenBalance(tokenYMint);
  const { data: solBalance } = useSOLBalance();

  // Form state
  const [amountIn, setAmountIn] = useState('');
  const [isTokenA, setIsTokenA] = useState(true);
  const [slippageBps, setSlippageBps] = useState(100); // 1% default
  const [loading, setLoading] = useState(false);

  const selectedToken = isTokenA ? tokenXSymbol : tokenYSymbol;
  const selectedBalance = isTokenA ? tokenXBalance?.uiAmount : tokenYBalance?.uiAmount;

  const handleAddLiquidity = async () => {
    if (!connected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Adding liquidity...');

    try {
      const result = await addLiquidity({
        poolAddress,
        amountIn,
        isTokenA,
        slippageBps,
      });

      toast.success('Liquidity added successfully!', { id: toastId });
      toast.success(
        <div>
          <div className="font-semibold">Transaction Complete</div>
          <a
            href={`https://solscan.io/tx/${result.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            View on Solscan →
          </a>
        </div>,
        { duration: 5000 }
      );

      // Reset form
      setAmountIn('');
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      toast.error(error.message || 'Failed to add liquidity', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Token Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Deposit Token
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTokenA(true)}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${isTokenA
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-gray-400 hover:bg-background-tertiary'
              }
            `}
          >
            {tokenXSymbol}
          </button>
          <button
            onClick={() => setIsTokenA(false)}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${!isTokenA
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-gray-400 hover:bg-background-tertiary'
              }
            `}
          >
            {tokenYSymbol}
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Amount</label>
          {selectedBalance !== undefined && selectedBalance !== null && (
            <button
              onClick={() => setAmountIn(selectedBalance.toString())}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Balance: {selectedBalance?.toFixed(4) || '0.0000'} {selectedToken}
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-background-secondary border border-border-light rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {selectedToken}
          </div>
        </div>
      </div>

      {/* Slippage Tolerance */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Slippage Tolerance
        </label>
        <div className="flex gap-2">
          {[50, 100, 200].map((bps) => (
            <button
              key={bps}
              onClick={() => setSlippageBps(bps)}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm transition-colors
                ${slippageBps === bps
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-gray-400 hover:bg-background-tertiary'
                }
              `}
            >
              {bps / 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-blue-400 text-sm">ℹ️</span>
          <div className="text-xs text-gray-300">
            <p className="font-medium mb-1">DAMM v2 Single-Sided Deposit</p>
            <p className="text-gray-400">
              Add liquidity with a single token. The pool will automatically convert your deposit to maintain the correct ratio.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleAddLiquidity}
        loading={loading}
        disabled={!connected || !amountIn}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {!connected ? 'Connect Wallet' : 'Add Liquidity'}
      </Button>
    </div>
  );
}
