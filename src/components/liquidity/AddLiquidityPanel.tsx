'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { StrategySelector, StrategyType } from './StrategySelector';
import { RatioControl, RatioType } from './RatioControl';
import { PriceRangePicker } from './PriceRangePicker';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { useTokenBalance, useSOLBalance } from '@/lib/hooks/useTokenBalance';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';
import BN from 'bn.js';

interface AddLiquidityPanelProps {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
  currentPrice: number;
  binStep: number;
  baseFee?: number; // Base fee percentage
}

export function AddLiquidityPanel({
  poolAddress,
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
  currentPrice,
  binStep,
  baseFee,
}: AddLiquidityPanelProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const { initializePositionAndAddLiquidityByStrategy } = useDLMM();

  // Fetch token balances
  const { data: tokenXBalance } = useTokenBalance(tokenXMint);
  const { data: tokenYBalance } = useTokenBalance(tokenYMint);
  const { data: solBalance } = useSOLBalance();

  // Strategy state
  const [strategy, setStrategy] = useState<StrategyType>('curve');
  const [ratio, setRatio] = useState<RatioType>('one-side');

  // Price range state
  const [minPrice, setMinPrice] = useState(currentPrice * 0.5); // 50% below current
  const [maxPrice, setMaxPrice] = useState(currentPrice * 2); // 100% above current

  // Amount state
  const [tokenXAmount, setTokenXAmount] = useState('');
  const [tokenYAmount, setTokenYAmount] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  // Calculate ratio percentages based on strategy
  const tokenXPercentage = ratio === 'one-side' ? 100 : 50;
  const tokenYPercentage = ratio === 'one-side' ? 0 : 50;

  const handleStrategyChange = (newStrategy: StrategyType) => {
    setStrategy(newStrategy);

    // Auto-adjust price range based on strategy and bin step
    // Calculate bin-aligned prices for better liquidity distribution
    const binStepDecimal = binStep / 10000; // Convert basis points to decimal

    if (newStrategy === 'spot') {
      // Narrow range for spot: ±10 bins around current price
      const minPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, -10);
      const maxPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, 10);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    } else if (newStrategy === 'curve') {
      // Wide range for curve: ±100 bins for full price curve
      const minPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, -100);
      const maxPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, 100);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    } else if (newStrategy === 'bidAsk') {
      // Balanced range for bid-ask: ±50 bins
      const minPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, -50);
      const maxPriceCalc = currentPrice * Math.pow(1 + binStepDecimal, 50);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    }
  };

  const handleRatioChange = (newRatio: RatioType) => {
    setRatio(newRatio);

    // Auto-adjust amounts based on ratio
    if (newRatio === '50-50' && tokenXAmount) {
      // If switching to 50-50, set equal value amounts
      setTokenYAmount(tokenXAmount);
    } else if (newRatio === 'one-side') {
      // If switching to one-side, clear Y amount
      setTokenYAmount('0');
    }
  };

  const handleAddLiquidity = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenXAmount || parseFloat(tokenXAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (ratio === '50-50' && (!tokenYAmount || parseFloat(tokenYAmount) <= 0)) {
      toast.error('Please enter a valid amount for both tokens');
      return;
    }

    if (minPrice >= maxPrice) {
      toast.error('Min price must be less than max price');
      return;
    }

    // Validate SOL balance
    if (solBalance && solBalance < 0.5) {
      toast.error(`Insufficient SOL balance. You need at least 0.5 SOL for transaction fees and rent.`);
      return;
    }

    // Validate token balance
    const amountInLamports = parseFloat(tokenXAmount) * 1e9;
    if (tokenXBalance && amountInLamports > tokenXBalance.balance) {
      toast.error(`Insufficient ${tokenXSymbol} balance. You have ${tokenXBalance.uiAmount.toFixed(4)} ${tokenXSymbol}`);
      return;
    }

    if (ratio === '50-50' && tokenYAmount) {
      const quoteAmountInLamports = parseFloat(tokenYAmount) * 1e9;
      if (tokenYBalance && quoteAmountInLamports > tokenYBalance.balance) {
        toast.error(`Insufficient ${tokenYSymbol} balance. You have ${tokenYBalance.uiAmount.toFixed(4)} ${tokenYSymbol}`);
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading('Adding liquidity...');

    try {
      // Call the DLMM SDK add liquidity function
      const result = await initializePositionAndAddLiquidityByStrategy({
        poolAddress,
        strategy: strategy === 'spot' ? 'spot' : strategy === 'curve' ? 'curve' : 'bid-ask',
        minPrice,
        maxPrice,
        amount: parseFloat(tokenXAmount),
        tokenMint: tokenXMint,
        quoteAmount: ratio === '50-50' ? tokenYAmount : undefined,
        slippage: 1, // 1% slippage
      });

      if (result.success) {
        toast.success(
          <div>
            <p>Liquidity added successfully!</p>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-xs"
            >
              View on Solscan →
            </a>
          </div>,
          { id: loadingToast, duration: 8000 }
        );

        // Reset form
        setTokenXAmount('');
        setTokenYAmount('');
      }
    } catch (error: any) {
      console.error('Error adding liquidity:', error);
      toast.error(error.message || 'Failed to add liquidity', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Format helper
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Calculate current bin ID from currentPrice and binStep
  const calculateActiveBinId = () => {
    if (!currentPrice || !binStep) return null;
    // Formula: binId = floor(log(price) / log(1 + binStep/10000))
    const basisPointsDecimal = binStep / 10000;
    return Math.floor(Math.log(currentPrice) / Math.log(1 + basisPointsDecimal));
  };

  const activeBinId = calculateActiveBinId();

  return (
    <div className="space-y-6">
      {/* Pool Info Header */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-3">Pool Information</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-400 block mb-1">Pool Address</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white truncate">{poolAddress.slice(0, 8)}...{poolAddress.slice(-6)}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(poolAddress);
                  toast.success('Address copied!', { duration: 2000 });
                }}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Copy address"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Token Pair</span>
            <span className="font-semibold text-white">{tokenXSymbol} / {tokenYSymbol}</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Bin Step</span>
            <span className="font-semibold text-primary">{binStep} bps</span>
          </div>
          {baseFee !== undefined && (
            <div>
              <span className="text-gray-400 block mb-1">Base Fee</span>
              <span className="font-semibold text-warning">{baseFee.toFixed(2)}%</span>
            </div>
          )}
          <div>
            <span className="text-gray-400 block mb-1">Current Price</span>
            <span className="font-semibold text-white">${currentPrice.toFixed(8)}</span>
          </div>
          {activeBinId !== null && (
            <div>
              <span className="text-gray-400 block mb-1">Active Bin ID</span>
              <span className="font-semibold text-success">{activeBinId}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400 block mb-1">Network</span>
            <span className="font-semibold text-white capitalize">{network}</span>
          </div>
        </div>
      </div>

      {/* Strategy Selector */}
      <StrategySelector
        selected={strategy}
        onChange={handleStrategyChange}
        disabled={loading}
      />

      {/* Ratio Control */}
      <RatioControl
        selected={ratio}
        onChange={handleRatioChange}
        tokenXSymbol={tokenXSymbol}
        tokenYSymbol={tokenYSymbol}
        tokenXPercentage={tokenXPercentage}
        tokenYPercentage={tokenYPercentage}
        disabled={loading}
      />

      {/* Price Range Picker */}
      <PriceRangePicker
        currentPrice={currentPrice}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        tokenXSymbol={tokenXSymbol}
        tokenYSymbol={tokenYSymbol}
        disabled={loading}
        poolAddress={poolAddress}
      />

      {/* Amount Inputs */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Deposit Amount
        </label>

        {/* Token X Amount */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            {tokenXSymbol} Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={tokenXAmount}
              onChange={(e) => setTokenXAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 pr-20 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => {
                if (tokenXBalance) {
                  setTokenXAmount(tokenXBalance.uiAmount.toFixed(6));
                }
              }}
              disabled={loading || !tokenXBalance}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
          <span className="block text-xs text-gray-500 mt-1">
            Balance: {tokenXBalance ? tokenXBalance.uiAmount.toFixed(4) : '0.00'} {tokenXSymbol}
          </span>
        </div>

        {/* Token Y Amount (only if 50:50) */}
        {ratio === '50-50' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              {tokenYSymbol} Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={tokenYAmount}
                onChange={(e) => setTokenYAmount(e.target.value)}
                disabled={loading}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 pr-20 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => {
                  if (tokenYBalance) {
                    setTokenYAmount(tokenYBalance.uiAmount.toFixed(6));
                  }
                }}
                disabled={loading || !tokenYBalance}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
            <span className="block text-xs text-gray-500 mt-1">
              Balance: {tokenYBalance ? tokenYBalance.uiAmount.toFixed(4) : '0.00'} {tokenYSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Pool Info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-800/30 border border-gray-700">
          <span className="text-xs text-gray-400">Bin Step</span>
          <span className="text-sm font-semibold text-primary">{binStep}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-800/30 border border-gray-700">
          <span className="text-xs text-gray-400">Slippage</span>
          <span className="text-sm font-semibold text-white">1.0%</span>
        </div>
      </div>

      {/* Add Liquidity Button */}
      <Button
        onClick={handleAddLiquidity}
        disabled={!connected || loading || !tokenXAmount}
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full"
      >
        {!connected ? 'Connect Wallet' : 'Add Liquidity'}
      </Button>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> Liquidity will be deposited according to your selected strategy and price range. Fees earned will be automatically compounded.
        </p>
      </div>
    </div>
  );
}
