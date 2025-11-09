'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';

interface QuickLiquidityTesterProps {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
  currentPrice: number;
  binStep: number;
  onLiquidityAdded?: () => void; // Callback to refresh bin data
}

/**
 * Quick Liquidity Tester
 * One-click utility to add small amounts of liquidity for testing bin visualization
 */
export function QuickLiquidityTester({
  poolAddress,
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
  currentPrice,
  binStep,
  onLiquidityAdded,
}: QuickLiquidityTesterProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const { initializePositionAndAddLiquidityByStrategy } = useDLMM();
  const [loading, setLoading] = useState(false);

  const handleQuickAdd = async (strategy: 'spot' | 'curve' | 'bid-ask', amount: number) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Adding ${amount} ${tokenXSymbol} with ${strategy} strategy...`);

    try {
      // Calculate smart price range based on strategy
      const binStepDecimal = binStep / 10000;
      let minPrice: number;
      let maxPrice: number;

      if (strategy === 'spot') {
        // Narrow: ±10 bins
        minPrice = currentPrice * Math.pow(1 + binStepDecimal, -10);
        maxPrice = currentPrice * Math.pow(1 + binStepDecimal, 10);
      } else if (strategy === 'curve') {
        // Wide: ±50 bins
        minPrice = currentPrice * Math.pow(1 + binStepDecimal, -50);
        maxPrice = currentPrice * Math.pow(1 + binStepDecimal, 50);
      } else {
        // Medium: ±25 bins
        minPrice = currentPrice * Math.pow(1 + binStepDecimal, -25);
        maxPrice = currentPrice * Math.pow(1 + binStepDecimal, 25);
      }

      console.log(`[QuickTest] Adding ${amount} ${tokenXSymbol} liquidity`);
      console.log(`[QuickTest] Price range: ${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)}`);

      const result = await initializePositionAndAddLiquidityByStrategy({
        poolAddress,
        strategy,
        minPrice,
        maxPrice,
        amount,
        tokenMint: tokenXMint,
      });

      if (result.success) {
        toast.success(
          <div>
            <p className="font-semibold mb-1">✅ Test liquidity added!</p>
            <p className="text-xs text-gray-300">Refresh the page to see updated bins</p>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary underline text-xs mt-2"
            >
              View on Solscan →
            </a>
          </div>,
          { id: loadingToast, duration: 10000 }
        );

        // Trigger callback to refresh bin data
        setTimeout(() => {
          onLiquidityAdded?.();
        }, 2000); // Wait 2s for RPC propagation
      }
    } catch (error: any) {
      console.error('[QuickTest] Error:', error);

      let errorMessage = error.message || 'Failed to add liquidity';

      // Friendly error messages
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = `Need more SOL. Get devnet SOL: solana airdrop 1 ${publicKey.toBase58()} --url devnet`;
      } else if (errorMessage.includes('Insufficient')) {
        errorMessage = `Need ${tokenXSymbol} tokens. Use the faucet below to get test tokens.`;
      }

      toast.error(
        <div>
          <p className="font-semibold mb-1">❌ Failed to add liquidity</p>
          <p className="text-xs text-gray-300">{errorMessage}</p>
        </div>,
        { id: loadingToast, duration: 8000 }
      );
    } finally {
      setLoading(false);
    }
  };

  if (network !== 'devnet') {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-300">
          ⚠️ Quick Liquidity Tester is only available on devnet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">🧪 Quick Liquidity Tester</h4>
          <p className="text-xs text-gray-400 mt-0.5">
            One-click liquidity addition to test bin visualization
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Spot Strategy - Narrow Range */}
        <button
          onClick={() => handleQuickAdd('spot', 10)}
          disabled={!connected || loading}
          className="flex flex-col items-start gap-1 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            Spot
          </div>
          <div className="text-[10px] text-gray-400">±10 bins</div>
          <div className="text-[11px] font-mono font-semibold text-white">10 {tokenXSymbol}</div>
        </button>

        {/* Curve Strategy - Wide Range */}
        <button
          onClick={() => handleQuickAdd('curve', 50)}
          disabled={!connected || loading}
          className="flex flex-col items-start gap-1 p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Curve
          </div>
          <div className="text-[10px] text-gray-400">±50 bins</div>
          <div className="text-[11px] font-mono font-semibold text-white">50 {tokenXSymbol}</div>
        </button>

        {/* Bid-Ask Strategy - Medium Range */}
        <button
          onClick={() => handleQuickAdd('bid-ask', 25)}
          disabled={!connected || loading}
          className="flex flex-col items-start gap-1 p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 hover:border-green-500/60 hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-300">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Bid-Ask
          </div>
          <div className="text-[10px] text-gray-400">±25 bins</div>
          <div className="text-[11px] font-mono font-semibold text-white">25 {tokenXSymbol}</div>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-300">Processing transaction...</span>
        </div>
      )}

      {!connected && (
        <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-300">
            💡 Connect your wallet to use quick liquidity tester
          </p>
        </div>
      )}

      <div className="px-3 py-2 bg-background-tertiary/50 border border-border-light/50 rounded-lg space-y-1">
        <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide">How it works:</p>
        <ol className="text-[10px] text-gray-400 space-y-0.5 list-decimal list-inside">
          <li>Click a strategy to add test liquidity</li>
          <li>Transaction will execute with smart price ranges</li>
          <li>Wait ~2-3 seconds for confirmation</li>
          <li>Refresh page to see pink glowing bins appear!</li>
        </ol>
      </div>
    </div>
  );
}
