'use client';

import { useState, useEffect, useRef } from 'react';
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
  const { openPosition } = useVaultIntegration();

  // Fetch token balances
  const { data: tokenXBalance } = useTokenBalance(tokenXMint);
  const { data: tokenYBalance } = useTokenBalance(tokenYMint);
  const { data: solBalance } = useSOLBalance();

  // Strategy state
  const [strategy, setStrategy] = useState<StrategyType>('curve');
  const [ratio, setRatio] = useState<RatioType>('one-side');

  // Price range state - handle case where currentPrice is 0 or NaN (no liquidity pool)
  const safeCurrentPrice = Number(currentPrice) > 0 ? Number(currentPrice) : 1; // Default to 1:1 if no price

  console.log('[AddLiquidityPanel] Received currentPrice:', {
    raw: currentPrice,
    safe: safeCurrentPrice,
    poolAddress: poolAddress.slice(0, 8),
  });

  // Pool-specific position width limit
  // Note: Each pool may have different restrictions on position width
  // The protocol limit is 1400 bins, but individual pools may have stricter limits
  const MAX_PROTOCOL_BINS = 1400; // Protocol hard limit
  const RECOMMENDED_MAX_BINS = 50; // Recommended safe range for most pools
  const WARNING_THRESHOLD_BINS = 30; // Show warning above this

  // For empty pools, minPrice MUST be >= pool's initial price
  // Set default range starting at current price (not below it)
  const [minPrice, setMinPrice] = useState(safeCurrentPrice); // Start at current price
  const [maxPrice, setMaxPrice] = useState(safeCurrentPrice * 1.05); // Conservative 5% range

  // Amount state
  const [tokenXAmount, setTokenXAmount] = useState('');
  const [tokenYAmount, setTokenYAmount] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  // Track last price update to avoid infinite loops
  const lastPriceUpdateRef = useRef(safeCurrentPrice);

  // Update price range when currentPrice changes (e.g., when activeBin loads)
  useEffect(() => {
    const newSafePrice = Number(currentPrice) > 0 ? Number(currentPrice) : 1;

    // Only update if price changed significantly from last update
    const hasSignificantChange = Math.abs(newSafePrice - lastPriceUpdateRef.current) / lastPriceUpdateRef.current > 0.01;
    const isPriceLoaded = newSafePrice > 0 && newSafePrice !== 1;

    if (hasSignificantChange && isPriceLoaded) {
      console.log(`[AddLiquidity] Current price updated: ${lastPriceUpdateRef.current.toFixed(6)} → ${newSafePrice.toFixed(6)}`);

      // Recalculate range based on current strategy
      const binStepDecimal = binStep / 10000;
      let binsAbove = 10; // Default

      if (strategy === 'spot') {
        binsAbove = 10;
      } else if (strategy === 'curve') {
        binsAbove = WARNING_THRESHOLD_BINS;
      } else if (strategy === 'bidAsk') {
        binsAbove = 20;
      }

      const newMinPrice = newSafePrice;
      const newMaxPrice = newSafePrice * Math.pow(1 + binStepDecimal, binsAbove);

      setMinPrice(newMinPrice);
      setMaxPrice(newMaxPrice);
      lastPriceUpdateRef.current = newSafePrice; // Update ref to prevent re-runs

      console.log(`[AddLiquidity] Range updated: ${newMinPrice.toFixed(6)} - ${newMaxPrice.toFixed(6)} (${binsAbove} bins)`);
    }
  }, [currentPrice, strategy, binStep]); // Re-run when currentPrice, strategy, or binStep changes

  // Calculate ratio percentages based on strategy
  const tokenXPercentage = ratio === 'one-side' ? 100 : 50;
  const tokenYPercentage = ratio === 'one-side' ? 0 : 50;

  // Calculate number of bins in selected range
  // This matches the SDK's bin calculation logic
  const calculateNumBins = () => {
    if (minPrice <= 0 || maxPrice <= 0 || maxPrice <= minPrice) return 0;
    const binStepDecimal = binStep / 10000;

    // Calculate bin IDs from prices (matching SDK logic)
    const minBinId = Math.floor(Math.log(minPrice) / Math.log(1 + binStepDecimal));
    const maxBinId = Math.ceil(Math.log(maxPrice) / Math.log(1 + binStepDecimal));

    // Bin range size is the difference + 1
    const calculatedBins = maxBinId - minBinId + 1;
    return isFinite(calculatedBins) && !isNaN(calculatedBins) && calculatedBins >= 0 ? calculatedBins : 0;
  };

  const numBins = calculateNumBins();
  const isSafeRange = numBins <= MAX_PROTOCOL_BINS;
  const rangeWarningLevel =
    numBins > RECOMMENDED_MAX_BINS ? 'error' :
    numBins > WARNING_THRESHOLD_BINS ? 'warning' :
    'safe';

  // Check if price range includes current price (important for empty pools)
  const priceRangeIncludesActive = minPrice <= safeCurrentPrice && maxPrice >= safeCurrentPrice;
  const showPriceWarning = !priceRangeIncludesActive;

  const handleStrategyChange = (newStrategy: StrategyType) => {
    setStrategy(newStrategy);

    // Auto-adjust price range based on strategy and bin step
    // Calculate bin-aligned prices for better liquidity distribution
    const binStepDecimal = binStep / 10000; // Convert basis points to decimal

    // IMPORTANT: For dual-sided deposits (50-50), range MUST include active bin
    // For single-sided deposits, range should be on one side of active bin
    const isDualSided = ratio === '50-50';

    if (newStrategy === 'spot') {
      // Narrow range: ±5 bins for dual-sided, or +10 bins for single-sided
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -5);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 5);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        // Single-sided: start at active price, go up (Token X only)
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 10);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
    } else if (newStrategy === 'curve') {
      // Moderate range: ±15 bins for dual-sided, or +30 bins for single-sided
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -15);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 15);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, WARNING_THRESHOLD_BINS);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
    } else if (newStrategy === 'bidAsk') {
      // Wider range: ±10 bins for dual-sided, or +20 bins for single-sided
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -10);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 10);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 20);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
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

    // Auto-adjust price range based on ratio change
    // Dual-sided needs range that includes active bin
    // Single-sided needs range on one side of active bin
    const binStepDecimal = binStep / 10000;
    const isDualSided = newRatio === '50-50';

    if (strategy === 'spot') {
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -5);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 5);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 10);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
    } else if (strategy === 'curve') {
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -15);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 15);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, WARNING_THRESHOLD_BINS);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
    } else if (strategy === 'bidAsk') {
      if (isDualSided) {
        const minPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, -10);
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 10);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      } else {
        const minPriceCalc = safeCurrentPrice;
        const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, 20);
        setMinPrice(minPriceCalc);
        setMaxPrice(maxPriceCalc);
      }
    }
  };

  const handleAddLiquidity = async () => {
    console.log('🚀 [AddLiquidity] Starting add liquidity process...');
    console.log('📊 [AddLiquidity] Wallet Info:', {
      connected,
      publicKey: publicKey?.toBase58(),
      network,
      solBalance,
      tokenXBalance: tokenXBalance?.uiAmount,
      tokenYBalance: tokenYBalance?.uiAmount,
    });

    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      console.error('❌ [AddLiquidity] Wallet not connected');
      return;
    }

    if (!tokenXAmount || parseFloat(tokenXAmount) <= 0) {
      toast.error('Please enter a valid amount');
      console.error('❌ [AddLiquidity] Invalid amount:', tokenXAmount);
      return;
    }

    if (ratio === '50-50' && (!tokenYAmount || parseFloat(tokenYAmount) <= 0)) {
      toast.error('Please enter a valid amount for both tokens');
      console.error('❌ [AddLiquidity] Invalid dual-sided amounts');
      return;
    }

    if (minPrice >= maxPrice) {
      toast.error('Min price must be less than max price');
      console.error('❌ [AddLiquidity] Invalid price range:', { minPrice, maxPrice });
      return;
    }

    // CRITICAL: Validate bin range to prevent protocol errors
    if (!isSafeRange) {
      toast.error(
        <div className="max-w-sm">
          <p className="font-semibold mb-1">⚠️ Price range exceeds protocol limit</p>
          <p className="text-xs opacity-90">
            Your range has {numBins} bins (protocol max: {MAX_PROTOCOL_BINS}). This will cause a transaction failure.
          </p>
          <p className="text-xs opacity-75 mt-1">
            Please narrow your price range significantly or use a strategy preset.
          </p>
        </div>,
        { duration: 8000 }
      );
      console.error('❌ [AddLiquidity] Range too wide:', { numBins, maxProtocol: MAX_PROTOCOL_BINS });
      return;
    }

    // RECOMMENDED: Warn about wide ranges
    if (numBins > RECOMMENDED_MAX_BINS) {
      toast.error(
        <div className="max-w-sm">
          <p className="font-semibold mb-1">⚠️ Price range may be too wide</p>
          <p className="text-xs opacity-90">
            Your range has {numBins} bins (recommended max: {RECOMMENDED_MAX_BINS}). Some pools may reject this.
          </p>
          <p className="text-xs opacity-75 mt-1">
            Consider using a narrower range for better transaction success rate.
          </p>
        </div>,
        { duration: 6000 }
      );
      console.warn('⚠️ [AddLiquidity] Range wider than recommended:', { numBins, recommended: RECOMMENDED_MAX_BINS });
    }

    // CRITICAL: For dual-sided deposits, validate that range INCLUDES active bin
    if (ratio === '50-50' && !priceRangeIncludesActive) {
      toast.error(
        <div className="max-w-sm">
          <p className="font-semibold mb-1">⚠️ Invalid range for dual-sided deposit</p>
          <p className="text-xs opacity-90">
            Your price range (${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)}) does NOT include the active price (${safeCurrentPrice.toFixed(6)}).
          </p>
          <p className="text-xs opacity-75 mt-1">
            For dual-sided deposits (50-50), your range <strong>must include</strong> the active price.
            Otherwise, only one token will be deposited.
          </p>
          <p className="text-xs font-semibold mt-2">
            💡 Tip: Switch to "One Side" ratio if you want to deposit only {tokenXSymbol}.
          </p>
        </div>,
        { duration: 10000 }
      );
      console.error('❌ [AddLiquidity] Dual-sided deposit range does not include active bin:', {
        minPrice,
        maxPrice,
        activePrice: safeCurrentPrice,
        includesActive: priceRangeIncludesActive,
      });
      return;
    }

    // CRITICAL: For single-sided deposits, validate that range includes or is adjacent to active bin
    if (ratio === 'one-side' && showPriceWarning) {
      toast.error(
        <div className="max-w-sm">
          <p className="font-semibold mb-1">⚠️ Invalid range for single-sided deposit</p>
          <p className="text-xs opacity-90">
            Your price range (${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)}) does not include the active price (${safeCurrentPrice.toFixed(6)}).
          </p>
          <p className="text-xs opacity-75 mt-1">
            For single-sided {tokenXSymbol} deposits, your <strong>minimum price must be at or below</strong> the active price.
            Please adjust your range or use a strategy preset.
          </p>
        </div>,
        { duration: 8000 }
      );
      console.error('❌ [AddLiquidity] Single-sided deposit range does not include active bin:', {
        minPrice,
        maxPrice,
        activePrice: safeCurrentPrice,
        includesActive: priceRangeIncludesActive,
      });
      return;
    }

    // Validate SOL balance
    if (solBalance && solBalance < 0.5) {
      const message = `Insufficient SOL balance. You need at least 0.5 SOL for transaction fees and rent. Current: ${solBalance.toFixed(4)} SOL`;
      toast.error(message);
      console.error('❌ [AddLiquidity]', message);
      return;
    }

    // Validate token balance
    const amountInLamports = parseFloat(tokenXAmount) * 1e9;
    if (tokenXBalance && amountInLamports > tokenXBalance.balance) {
      const message = `Insufficient ${tokenXSymbol} balance. You have ${tokenXBalance.uiAmount.toFixed(4)} ${tokenXSymbol}`;
      toast.error(message);
      console.error('❌ [AddLiquidity]', message);
      return;
    }

    if (ratio === '50-50' && tokenYAmount) {
      const quoteAmountInLamports = parseFloat(tokenYAmount) * 1e9;
      if (tokenYBalance && quoteAmountInLamports > tokenYBalance.balance) {
        const message = `Insufficient ${tokenYSymbol} balance. You have ${tokenYBalance.uiAmount.toFixed(4)} ${tokenYSymbol}`;
        toast.error(message);
        console.error('❌ [AddLiquidity]', message);
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading('Processing transaction...');

    console.log('✅ [AddLiquidity] All validations passed. Starting transaction...');
    console.log('📋 [AddLiquidity] Transaction params:', {
      poolAddress,
      strategy,
      minPrice,
      maxPrice,
      amount: parseFloat(tokenXAmount),
      tokenMint: tokenXMint,
      ratio,
    });

    try {
      toast.loading('Adding liquidity to pool...', { id: loadingToast });

      // Prepare liquidity parameters based on ratio selection
      const liquidityParams: any = {
        poolAddress,
        strategy: strategy === 'spot' ? 'spot' : strategy === 'curve' ? 'curve' : 'bid-ask',
        minPrice,
        maxPrice,
      };

      if (ratio === '50-50') {
        // Dual-sided deposit: pass both amounts
        liquidityParams.baseAmount = parseFloat(tokenXAmount) || 0;
        liquidityParams.quoteAmount = parseFloat(tokenYAmount) || 0;
      } else {
        // Single-sided deposit: use the old API for backward compatibility
        liquidityParams.amount = parseFloat(tokenXAmount);
        liquidityParams.tokenMint = tokenXMint;
      }

      const result = await initializePositionAndAddLiquidityByStrategy(liquidityParams);

      console.log('✅ [AddLiquidity] Transaction successful:', result);

      if (result.success) {
        // Display accurate message based on actual deposit type
        const depositMessage = result.depositType === 'dual-sided'
          ? `Added ${result.amounts.tokenX} ${tokenXSymbol} and ${result.amounts.tokenY} ${tokenYSymbol}`
          : result.depositType === 'single-sided (Token X)'
            ? `Added ${result.amounts.tokenX} ${tokenXSymbol} (single-sided)`
            : `Added ${result.amounts.tokenY} ${tokenYSymbol} (single-sided)`;

        toast.success(
          <div>
            <p className="font-semibold mb-1">✅ Liquidity added successfully!</p>
            <p className="text-xs text-gray-300 mb-2">{depositMessage}</p>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary underline text-xs mt-2"
            >
              View transaction on Solscan →
            </a>
          </div>,
          { id: loadingToast, duration: 10000 }
        );

        // Reset form
        setTokenXAmount('');
        setTokenYAmount('');
      }
    } catch (error: any) {
      console.error('❌ [AddLiquidity] Transaction failed with error:', error);
      console.error('❌ [AddLiquidity] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.slice(0, 500),
        logs: error.logs,
      });

      // Enhanced error messages with actionable advice
      let userMessage = 'Failed to add liquidity';
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        userMessage = '❌ Transaction rejected by wallet';
        console.error('❌ [AddLiquidity] User rejected the transaction in wallet');
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient SOL')) {
        userMessage = `❌ Insufficient SOL for fees. Need ~0.05 SOL. Try: solana airdrop 1 ${publicKey.toBase58()} --url devnet`;
        console.error('❌ [AddLiquidity] Insufficient SOL for transaction fees');
      } else if (error.message?.includes('insufficient')) {
        userMessage = '❌ Insufficient token balance';
        console.error('❌ [AddLiquidity] Insufficient token balance');
      } else if (error.message?.includes('blockhash') || error.message?.includes('expired')) {
        userMessage = '❌ Transaction expired. Please try again';
        console.error('❌ [AddLiquidity] Blockhash expired');
      } else if (error.message) {
        userMessage = `❌ ${error.message}`;
      }

      toast.error(
        <div className="max-w-sm">
          <p className="font-semibold mb-1">{userMessage}</p>
          <p className="text-xs opacity-75">Check browser console (F12) for detailed logs</p>
        </div>,
        { id: loadingToast, duration: 8000 }
      );
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

  // Detect which token(s) user is depositing
  const tokenXAmt = parseFloat(tokenXAmount) || 0;
  const tokenYAmt = parseFloat(tokenYAmount) || 0;
  const isDepositingOnlyTokenX = tokenXAmt > 0 && tokenYAmt === 0;
  const isDepositingOnlyTokenY = tokenYAmt > 0 && tokenXAmt === 0;
  const isDualSided = tokenXAmt > 0 && tokenYAmt > 0;

  // Auto-adjust price range when ratio changes or strategy changes
  // to ensure range is valid for the deposit type
  useEffect(() => {
    const binStepDecimal = binStep / 10000;

    // Only auto-adjust when user changes ratio to one-side
    if (ratio === 'one-side') {
      // Default to Token X range (above active price)
      // User can manually change to Token Y by entering Token Y amount instead
      const minPriceCalc = safeCurrentPrice;
      const maxPriceCalc = safeCurrentPrice * Math.pow(1 + binStepDecimal, WARNING_THRESHOLD_BINS);
      setMinPrice(minPriceCalc);
      setMaxPrice(maxPriceCalc);
    }
  }, [ratio]); // Only run when ratio changes

  // Validate range based on deposit type
  let rangeValidationMessage = '';
  if (isDepositingOnlyTokenX) {
    // Token X deposits: range must include or be adjacent to active bin
    // User's min price should be at or below the active price
    if (minPrice > safeCurrentPrice * 1.001) { // Allow tiny rounding errors
      rangeValidationMessage = `⚠️ For Token X deposits, your minimum price (${minPrice.toFixed(6)}) must be at or below the active price (${safeCurrentPrice.toFixed(6)})`;
    } else if (maxPrice < safeCurrentPrice) {
      rangeValidationMessage = `⚠️ Token X deposits require range to be at or above active price (${safeCurrentPrice.toFixed(6)})`;
    }
  } else if (isDepositingOnlyTokenY) {
    // Token Y deposits: range must include or be adjacent to active bin
    // User's max price should be at or above the active price
    if (maxPrice < safeCurrentPrice * 0.999) { // Allow tiny rounding errors
      rangeValidationMessage = `⚠️ For Token Y deposits, your maximum price (${maxPrice.toFixed(6)}) must be at or above the active price (${safeCurrentPrice.toFixed(6)})`;
    } else if (minPrice > safeCurrentPrice) {
      rangeValidationMessage = `⚠️ Token Y deposits require range to be at or below active price (${safeCurrentPrice.toFixed(6)})`;
    }
  }

  return (
    <div className="space-y-4">
      {/* Strategy Selector - Tile */}
      <div className="bg-background-secondary/30 border border-border-light rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Strategy</h3>
        <StrategySelector
          selected={strategy}
          onChange={handleStrategyChange}
          disabled={loading}
        />
      </div>

      {/* Ratio Control - Tile */}
      <div className="bg-background-secondary/30 border border-border-light rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ratio</h3>
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

      {/* Price Range Picker - Tile */}
      <div className="bg-background-secondary/30 border border-border-light rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Price Range</h3>
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
          depositType={
            isDepositingOnlyTokenX ? 'token-x' :
            isDepositingOnlyTokenY ? 'token-y' :
            isDualSided ? 'dual' :
            'none'
          }
        />

        {/* Range Safety Indicator */}
        <div className="mt-3 pt-3 border-t border-border-light/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Range Size</span>
            <span className={`text-xs font-mono font-semibold ${
              rangeWarningLevel === 'error' ? 'text-error' :
              rangeWarningLevel === 'warning' ? 'text-warning' :
              'text-success'
            }`}>
              {numBins} bins {numBins > RECOMMENDED_MAX_BINS && `(⚠️ > ${RECOMMENDED_MAX_BINS})`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rangeWarningLevel === 'error' ? 'bg-error' :
                rangeWarningLevel === 'warning' ? 'bg-warning' :
                'bg-success'
              }`}
              style={{ width: `${Math.min(100, (numBins / RECOMMENDED_MAX_BINS) * 100)}%` }}
            />
          </div>

          {/* Range validation warning for single-sided deposits */}
          {rangeValidationMessage && (
            <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
              {rangeValidationMessage}
              <div className="mt-1 text-[10px] opacity-80">
                {isDepositingOnlyTokenX && 'Token X sits in bins to the right (above) the active price'}
                {isDepositingOnlyTokenY && 'Token Y sits in bins to the left (below) the active price'}
              </div>
            </div>
          )}

          {/* Warning message */}
          {rangeWarningLevel === 'error' && (
            <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded text-xs text-error">
              ⚠️ Range too wide! Will cause transaction failure. Please narrow your range.
            </div>
          )}
          {rangeWarningLevel === 'warning' && !rangeValidationMessage && (
            <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
              ⚡ Approaching limit. Consider using a narrower range for safety.
            </div>
          )}
          {rangeWarningLevel === 'safe' && numBins > 0 && !rangeValidationMessage && (
            <div className="mt-2 text-xs text-success/80">
              ✓ Safe range - transaction should succeed
            </div>
          )}
        </div>
      </div>

      {/* Deposit Amount - Tile */}
      <div className="bg-background-secondary/30 border border-border-light rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Amount</h3>

        {/* Token X Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-300">{tokenXSymbol}</label>
            <span className="text-xs text-gray-500">
              Balance: {tokenXBalance ? tokenXBalance.uiAmount.toFixed(4) : '0.00'}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={tokenXAmount}
              onChange={(e) => setTokenXAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2.5 pr-16 rounded-lg bg-background border border-border-light text-white text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
            />
            <button
              onClick={() => {
                if (tokenXBalance) {
                  setTokenXAmount(tokenXBalance.uiAmount.toFixed(6));
                }
              }}
              disabled={loading || !tokenXBalance}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Token Y Amount - Only for 50:50 */}
        {ratio === '50-50' && (
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
