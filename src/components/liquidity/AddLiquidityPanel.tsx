'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui';
import { StrategySelector, StrategyType } from './StrategySelector';
import { RatioControl, RatioType } from './RatioControl';
import { PriceRangePicker } from './PriceRangePicker';
import { DevnetFaucet, QuickLiquidityTester } from '@/components/devnet';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { useTokenBalance, useSOLBalance } from '@/lib/hooks/useTokenBalance';
import { useVaultIntegration } from '@/lib/hooks/useVaultIntegration';
import { Protocol, Strategy as VaultStrategy } from '@/lib/vault/metatools-vault';
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
  poolType?: string; // Pool type for header (dlmm, damm-v2, etc.)
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
  poolType = 'dlmm',
}: AddLiquidityPanelProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const { initializePositionAndAddLiquidityByStrategy } = useDLMM();
  const { openPosition } = useVaultIntegration();

  // Fetch token balances
  const { data: tokenXBalance } = useTokenBalance(tokenXMint);
  const { data: tokenYBalance } = useTokenBalance(tokenYMint);
  const { data: solBalance } = useSOLBalance();

  // Strategy state
  const [strategy, setStrategy] = useState<StrategyType>('curve');
  const [ratio, setRatio] = useState<RatioType>('one-side-x');

  // Price range state - handle case where currentPrice is 0 or NaN (no liquidity pool)
  const safeCurrentPrice = Number(currentPrice) > 0 ? Number(currentPrice) : 1; // Default to 1:1 if no price

  // For empty pools, minPrice MUST be >= pool's initial price
  // Set default range starting at current price (not below it)
  const [minPrice, setMinPrice] = useState(safeCurrentPrice); // Start at current price
  const [maxPrice, setMaxPrice] = useState(safeCurrentPrice * 2); // 100% above current

  // Amount state
  const [tokenXAmount, setTokenXAmount] = useState('');
  const [tokenYAmount, setTokenYAmount] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  // Slippage state
  const [slippage, setSlippage] = useState(1); // Default 1%

  // Calculate ratio percentages based on ratio selection
  const tokenXPercentage = ratio === 'one-side-x' ? 100 : ratio === '50-50' ? 50 : 0;
  const tokenYPercentage = ratio === 'one-side-y' ? 100 : ratio === '50-50' ? 50 : 0;

  // Check if price range includes current price (important for empty pools)
  const priceRangeIncludesActive = minPrice <= safeCurrentPrice && maxPrice >= safeCurrentPrice;
  const showPriceWarning = !priceRangeIncludesActive;

  const handleStrategyChange = (newStrategy: StrategyType) => {
    setStrategy(newStrategy);

    // Auto-adjust price range based on strategy and bin step
    // Calculate bin-aligned prices for better liquidity distribution
    const binStepDecimal = binStep / 10000; // Convert basis points to decimal

    if (newStrategy === 'spot') {
      // Narrow range for spot: Current price to +20 bins above
      // (Never go below current price for empty pools)
      const minPriceCalc = safeCurrentPrice;
      const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 20);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    } else if (newStrategy === 'curve') {
      // Wide range for curve: Current price to +100 bins above
      // (Never go below current price for empty pools)
      const minPriceCalc = safeCurrentPrice;
      const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 100);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    } else if (newStrategy === 'bidAsk') {
      // Balanced range for bid-ask: Current price to +50 bins
      // (Never go below current price for empty pools)
      const minPriceCalc = safeCurrentPrice;
      const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 50);
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
    const loadingToast = toast.loading('Processing transaction...');

    try {
      // TODO: Vault integration temporarily disabled - add back after vault is initialized on devnet
      // const tvlInLamports = BigInt(Math.floor(parseFloat(tokenXAmount) * 1e9));
      // const vaultStrategy = strategy === 'spot' ? VaultStrategy.Spot :
      //                      strategy === 'curve' ? VaultStrategy.Curve :
      //                      VaultStrategy.BidAsk;
      // const vaultResult = await openPosition({
      //   pool: new PublicKey(poolAddress),
      //   baseMint: new PublicKey(tokenXMint),
      //   quoteMint: new PublicKey(tokenYMint),
      //   initialTvl: tvlInLamports,
      //   protocol: Protocol.DLMM,
      //   strategy: vaultStrategy,
      // });

      // Add liquidity directly to Meteora pool (no vault fees for now)
      toast.loading('Adding liquidity to pool...', { id: loadingToast });

      const result = await initializePositionAndAddLiquidityByStrategy({
        poolAddress,
        strategy: strategy === 'spot' ? 'spot' : strategy === 'curve' ? 'curve' : 'bid-ask',
        minPrice,
        maxPrice,
        amount: parseFloat(tokenXAmount),
        tokenMint: tokenXMint,
      });

      if (result.success) {
        toast.success(
          <div>
            <p className="font-semibold mb-1">Liquidity added successfully!</p>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary underline text-xs mt-2"
            >
              View transaction on Solscan →
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
    if (!safeCurrentPrice || safeCurrentPrice <= 0 || !binStep) return null;
    // Formula: binId = floor(log(price) / log(1 + binStep/10000))
    const basisPointsDecimal = binStep / 10000;
    const calculated = Math.floor(Math.log(safeCurrentPrice) / Math.log(1 + basisPointsDecimal));
    return isFinite(calculated) && !isNaN(calculated) ? calculated : 0;
  };

  const activeBinId = calculateActiveBinId();

  // Get pool type display name
  const poolTypeDisplay = poolType === 'damm-v2' ? 'DYN2' : poolType.toUpperCase();

  return (
    <div className="space-y-3">
      {/* Header - Pool Type + Token Pair + Slippage (charting.ag style) */}
      <div>
        {/* Pool Type Label */}
        <div className="text-sm font-bold text-white mb-2">{poolTypeDisplay}</div>

        {/* Token Pair Display with Slippage */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                {tokenXSymbol.slice(0, 1)}
              </div>
              <span className="text-sm font-medium text-white">{tokenXSymbol}-{tokenYSymbol}</span>
            </div>
          </div>

          {/* Slippage Control */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 1)))}
              className="w-10 px-1.5 py-0.5 bg-background text-white text-xs rounded border border-border-light focus:outline-none focus:border-primary"
              step="0.1"
              min="0.1"
              max="50"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>

      {/* Strategy Selector - Clean, no box */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Strategy</h3>
        <StrategySelector
          selected={strategy}
          onChange={handleStrategyChange}
          disabled={loading}
        />
      </div>

      {/* Ratio Control - Clean, no box */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Ratio</h3>
        <RatioControl
          selected={ratio}
          onChange={handleRatioChange}
          tokenXSymbol={tokenXSymbol}
          tokenYSymbol={tokenYSymbol}
          tokenXPercentage={tokenXPercentage}
          tokenYPercentage={tokenYPercentage}
          disabled={loading}
        />
      </div>

      {/* Price Range Picker - Clean, no box */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Price Range</h3>
        <PriceRangePicker
          currentPrice={safeCurrentPrice}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          tokenXSymbol={tokenXSymbol}
          tokenYSymbol={tokenYSymbol}
          disabled={loading}
          poolAddress={poolAddress}
          binStep={binStep}
        />
      </div>

      {/* Token Input - charting.ag style (compact, in header area) */}
      <div className="bg-background-secondary/20 border border-border-light rounded-lg p-3">
        {/* Token Icon + Input */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
            {tokenYSymbol.slice(0, 1)}
          </div>
          <span className="text-sm font-medium text-white mr-auto">{tokenYSymbol}</span>
          <div className="text-right">
            <input
              type="number"
              value={tokenXAmount}
              onChange={(e) => setTokenXAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-24 px-2 py-1 bg-transparent text-white text-right text-base font-medium focus:outline-none"
            />
            <div className="text-xs text-gray-500">$0.00</div>
          </div>
        </div>

        {/* Balance + 50% + Max */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Balance: {tokenXBalance ? tokenXBalance.uiAmount.toFixed(2) : '0'} {tokenYSymbol}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (tokenXBalance) {
                  setTokenXAmount((tokenXBalance.uiAmount * 0.5).toFixed(6));
                }
              }}
              disabled={loading || !tokenXBalance}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              50%
            </button>
            <button
              onClick={() => {
                if (tokenXBalance) {
                  setTokenXAmount(tokenXBalance.uiAmount.toFixed(6));
                }
              }}
              disabled={loading || !tokenXBalance}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {/* Token Y Amount - Only for 50:50 (hidden for now, can add later) */}
      {ratio === '50-50' && false && (
          <div className="space-y-1.5 mt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300">{tokenYSymbol}</label>
              <span className="text-xs text-gray-500">
                Balance: {tokenYBalance ? tokenYBalance.uiAmount.toFixed(4) : '0.00'}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={tokenYAmount}
                onChange={(e) => setTokenYAmount(e.target.value)}
                disabled={loading}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 pr-16 rounded-lg bg-background border border-border-light text-white text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
              />
              <button
                onClick={() => {
                  if (tokenYBalance) {
                    setTokenYAmount(tokenYBalance.uiAmount.toFixed(6));
                  }
                }}
                disabled={loading || !tokenYBalance}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Liquidity Button - Outside tile, prominent */}
      <Button
        onClick={handleAddLiquidity}
        disabled={!connected || loading || !tokenXAmount}
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full shadow-lg shadow-primary/20"
        title={!connected ? 'Connect wallet first' : 'Liquidity will be deposited according to your selected strategy and price range'}
      >
        {!connected ? 'Connect Wallet' : 'Add Liquidity'}
      </Button>

      {/* Quick Liquidity Tester - Devnet Only */}
      {network === 'devnet' && (
        <details className="group" open>
          <summary className="cursor-pointer px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 transition-colors border border-purple-500/30">
            <span className="text-xs font-semibold text-white">🧪 Quick Test: Add Liquidity & See Bins</span>
          </summary>
          <div className="mt-2 bg-background-secondary/30 border border-border-light rounded-lg p-3">
            <QuickLiquidityTester
              poolAddress={poolAddress}
              tokenXMint={tokenXMint}
              tokenYMint={tokenYMint}
              tokenXSymbol={tokenXSymbol}
              tokenYSymbol={tokenYSymbol}
              currentPrice={safeCurrentPrice}
              binStep={binStep}
              onLiquidityAdded={() => {
                // Callback to refresh bin data - will be handled by react-query refetch
                console.log('[AddLiquidity] Liquidity added - bins will refresh automatically');
              }}
            />
          </div>
        </details>
      )}

      {/* Devnet Faucet - Collapsible */}
      {network === 'devnet' && (
        <details className="group">
          <summary className="cursor-pointer px-3 py-2 rounded-lg bg-background-secondary/30 hover:bg-background-secondary/50 transition-colors border border-border-light">
            <span className="text-xs font-semibold text-gray-300">💧 Need test tokens?</span>
          </summary>
          <div className="mt-2 bg-background-secondary/30 border border-border-light rounded-lg p-3">
            <DevnetFaucet
              tokenXMint={tokenXMint}
              tokenYMint={tokenYMint}
              tokenXSymbol={tokenXSymbol}
              tokenYSymbol={tokenYSymbol}
            />
          </div>
        </details>
      )}
    </div>
  );
}
