/**
 * Swap Panel for all pool types (DLMM, DAMM, DBC)
 * Allows users to swap tokens directly within the pool
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { useTokenBalance, useSOLBalance } from '@/lib/hooks/useTokenBalance';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';
import BN from 'bn.js';

interface SwapPanelProps {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
  poolType: string;
}

export function SwapPanel({
  poolAddress,
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
  poolType,
}: SwapPanelProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<'XtoY' | 'YtoX'>('XtoY');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [quoteData, setQuoteData] = useState<{
    fee: string;
    priceImpact: string;
    minReceived: number;
  } | null>(null);

  // Get token balances
  const { data: tokenXBalance } = useTokenBalance(tokenXMint);
  const { data: tokenYBalance } = useTokenBalance(tokenYMint);
  const { data: solBalance } = useSOLBalance();

  const inputToken = swapDirection === 'XtoY' ? tokenXSymbol : tokenYSymbol;
  const outputToken = swapDirection === 'XtoY' ? tokenYSymbol : tokenXSymbol;
  const inputBalance = swapDirection === 'XtoY' ? tokenXBalance : tokenYBalance;
  const outputBalance = swapDirection === 'XtoY' ? tokenYBalance : tokenXBalance;

  const handleSwapDirection = () => {
    setSwapDirection(swapDirection === 'XtoY' ? 'YtoX' : 'XtoY');
    // Swap amounts
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  const handleSwap = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate SOL balance
    if (solBalance && solBalance < 0.1) {
      toast.error(`Insufficient SOL balance. You need at least 0.1 SOL for transaction fees.`);
      return;
    }

    // Validate token balance
    const amountInLamports = parseFloat(inputAmount) * 1e9;
    if (inputBalance && amountInLamports > inputBalance.balance) {
      toast.error(`Insufficient ${inputToken} balance. You have ${inputBalance.uiAmount.toFixed(4)} ${inputToken}`);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Swapping ${inputToken} to ${outputToken}...`);

    try {
      // Only DLMM is supported for now (DAMM v2 and DBC coming soon)
      if (poolType !== 'dlmm') {
        toast.error(`Swap for ${poolType.toUpperCase()} pools coming soon!`, { id: loadingToast });
        return;
      }

      // Import the swapTokens function dynamically
      const { useDLMM } = await import('@/lib/meteora/useDLMM');
      const dlmm = useDLMM();

      // Determine token mints
      const tokenMintIn = swapDirection === 'XtoY' ? tokenXMint : tokenYMint;
      const tokenMintOut = swapDirection === 'XtoY' ? tokenYMint : tokenXMint;

      // Convert slippage to basis points (1% = 100 bps)
      const slippageBps = slippage * 100;

      const result = await dlmm.swapTokens({
        poolAddress,
        amountIn: parseFloat(inputAmount),
        tokenMintIn,
        tokenMintOut,
        slippageBps,
      });

      if (result.success) {
        toast.success(
          <div>
            <p>Swap successful!</p>
            <p className="text-xs">Received: {result.outAmount?.toFixed(6)} {outputToken}</p>
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

        // Reset amounts
        setInputAmount('');
        setOutputAmount('');
      }
    } catch (error: any) {
      console.error('Error swapping:', error);
      toast.error(error.message || 'Failed to swap', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Calculate quote using DLMM SDK
  const handleCalculateQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setOutputAmount('');
      return;
    }

    if (poolType !== 'dlmm') {
      // Fallback for non-DLMM pools
      const estimatedOutput = (parseFloat(inputAmount) * 0.997).toFixed(6);
      setOutputAmount(estimatedOutput);
      return;
    }

    try {
      // Import DLMM SDK dynamically
      const { default: DLMM } = await import('@meteora-ag/dlmm');
      const { Connection, PublicKey } = await import('@solana/web3.js');

      const connection = new Connection(
        network === 'mainnet-beta'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com'
      );

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
        cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
      });

      // Get swap quote
      const inAmount = Math.floor(parseFloat(inputAmount) * 1e9); // Convert to lamports (assuming 9 decimals)
      const swapYtoX = swapDirection === 'YtoX';

      // Fetch bin arrays required for swap quote
      const binArrays = await dlmmPool.getBinArrays();

      const swapQuote = dlmmPool.swapQuote(
        new BN(inAmount),
        swapYtoX,
        new BN(slippage * 100), // Convert percentage to basis points
        binArrays
      );

      // Convert output amount back to UI amount
      const outAmount = Number(swapQuote.outAmount) / 1e9;
      setOutputAmount(outAmount.toFixed(6));

      // Store quote data for display
      const feeAmount = Number(swapQuote.fee || 0) / 1e9;
      const feePercent = parseFloat(inputAmount) > 0
        ? ((feeAmount / parseFloat(inputAmount)) * 100).toFixed(4)
        : '0';

      const priceImpact = swapQuote.priceImpact
        ? (Number(swapQuote.priceImpact) / 100).toFixed(4) // Convert bps to percent
        : '0';

      const minReceived = outAmount * (1 - slippage / 100);

      setQuoteData({
        fee: `${feePercent}%`,
        priceImpact: `${priceImpact}%`,
        minReceived,
      });

      console.log('[SwapPanel] Quote calculated:', {
        inAmount: parseFloat(inputAmount),
        outAmount,
        feeAmount,
        feePercent: `${feePercent}%`,
        priceImpact: `${priceImpact}%`,
        minReceived,
      });

    } catch (error: any) {
      console.error('[SwapPanel] Quote calculation failed:', error);
      // Fallback to mock calculation
      const estimatedOutput = (parseFloat(inputAmount) * 0.997).toFixed(6);
      setOutputAmount(estimatedOutput);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pool Info */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Pool Type</span>
          <span className="font-semibold text-primary uppercase">{poolType}</span>
        </div>
      </div>

      {/* Input Token */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          You Pay
        </label>
        <div className="relative">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => {
              setInputAmount(e.target.value);
              handleCalculateQuote();
            }}
            disabled={loading}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-4 pr-28 rounded-lg bg-gray-800 border border-gray-700 text-white text-lg font-semibold focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => {
                if (inputBalance) {
                  setInputAmount(inputBalance.uiAmount.toFixed(6));
                  handleCalculateQuote();
                }
              }}
              disabled={loading || !inputBalance}
              className="px-2 py-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
            <span className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm font-semibold text-white">
              {inputToken}
            </span>
          </div>
        </div>
        <span className="block text-xs text-gray-500 mt-1.5">
          Balance: {inputBalance ? inputBalance.uiAmount.toFixed(4) : '0.00'} {inputToken}
        </span>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-3">
        <button
          onClick={handleSwapDirection}
          disabled={loading}
          className="p-3 rounded-full bg-background-secondary border-4 border-background hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Output Token */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          You Receive
        </label>
        <div className="relative">
          <input
            type="number"
            value={outputAmount}
            readOnly
            disabled
            placeholder="0.00"
            className="w-full px-4 py-4 pr-28 rounded-lg bg-gray-800 border border-gray-700 text-white text-lg font-semibold focus:outline-none opacity-75"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm font-semibold text-white">
              {outputToken}
            </span>
          </div>
        </div>
        <span className="block text-xs text-gray-500 mt-1.5">
          Balance: {outputBalance ? outputBalance.uiAmount.toFixed(4) : '0.00'} {outputToken}
        </span>
      </div>

      {/* Slippage Settings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Slippage Tolerance
          </label>
          <span className="text-sm font-semibold text-primary">{slippage}%</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0.5, 1.0, 2.0, 5.0].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`
                px-3 py-2 rounded-lg text-sm font-semibold transition-all
                ${slippage === value
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }
              `}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      {/* Swap Details - DLMM Real-time Quote */}
      {outputAmount && quoteData && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Rate</span>
            <span className="font-semibold text-white">
              1 {inputToken} ≈ {outputAmount && inputAmount ? (parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6) : '0'} {outputToken}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Price Impact</span>
            <span className={`font-semibold ${
              parseFloat(quoteData.priceImpact) < 0.1 ? 'text-success' :
              parseFloat(quoteData.priceImpact) < 1 ? 'text-warning' :
              'text-error'
            }`}>
              {quoteData.priceImpact}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Minimum Received</span>
            <span className="font-semibold text-white">
              {quoteData.minReceived.toFixed(6)} {outputToken}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Dynamic Fee</span>
              <span className="text-[10px] text-gray-500" title="Base fee + volatility-adjusted fee">ⓘ</span>
            </div>
            <span className="font-semibold text-warning">{quoteData.fee}</span>
          </div>
        </div>
      )}

      {/* Fallback for non-DLMM or loading */}
      {outputAmount && !quoteData && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Rate</span>
            <span className="font-semibold text-white">
              1 {inputToken} ≈ {outputAmount && inputAmount ? (parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6) : '0'} {outputToken}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Fee</span>
            <span className="font-semibold text-warning">~0.3%</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {poolType === 'dlmm' ? 'Calculating quote...' : 'Exact quote coming soon for this pool type'}
          </p>
        </div>
      )}

      {/* Swap Button */}
      <Button
        onClick={handleSwap}
        disabled={!connected || loading || !inputAmount || !outputAmount}
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full"
      >
        {!connected ? 'Connect Wallet' : !inputAmount ? 'Enter Amount' : 'Swap'}
      </Button>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> Swaps are executed directly on the {poolType.toUpperCase()} pool. Slippage tolerance protects you from price movement during the transaction.
        </p>
      </div>
    </div>
  );
}
