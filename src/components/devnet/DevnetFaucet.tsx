'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface DevnetFaucetProps {
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

/**
 * Devnet Faucet Component
 *
 * Shows a "Request Test Tokens" button when on devnet
 * Calls backend endpoint to airdrop tokens to connected wallet
 */
export function DevnetFaucet({
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
}: DevnetFaucetProps) {
  const { publicKey, connected } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);

  // Only show on devnet
  if (network !== 'devnet') {
    return null;
  }

  const handleRequestTokens = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Requesting test tokens...');

    try {
      // Call backend endpoint to airdrop tokens
      const response = await fetch('/api/devnet/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: publicKey.toBase58(),
          tokenXMint,
          tokenYMint,
          amount: 100000, // 100k tokens
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Success! Sent 100,000 ${tokenXSymbol} and 100,000 ${tokenYSymbol} to your wallet`,
          { id: loadingToast, duration: 6000 }
        );

        // Refresh page to update balances
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to request tokens', { id: loadingToast });
      }
    } catch (error: any) {
      console.error('Faucet error:', error);
      toast.error('Failed to request tokens. Please try again.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-500 mb-1">
            Devnet Testing Mode
          </h3>
          <p className="text-xs text-gray-300 mb-3">
            You're on devnet. Need test tokens to add liquidity? Click below to get free {tokenXSymbol} and {tokenYSymbol} tokens.
          </p>

          <Button
            onClick={handleRequestTokens}
            disabled={!connected || loading}
            variant="primary"
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Requesting...
              </>
            ) : (
              <>
                🎁 Request Test Tokens
              </>
            )}
          </Button>

          <p className="text-[10px] text-gray-500 mt-2">
            This will send 100,000 {tokenXSymbol} and 100,000 {tokenYSymbol} to your connected wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
