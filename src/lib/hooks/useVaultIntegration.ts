/**
 * useVaultIntegration - Hook to integrate Steel vault with liquidity operations
 * Handles atomic fee payments when adding/removing liquidity
 */

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import {
  createOpenPositionInstruction,
  createClosePositionInstruction,
  createUpdatePositionTVLInstruction,
  getOrCreateVault,
  Protocol,
  Strategy,
  calculateFee,
  METATOOLS_VAULT_PROGRAM_ID,
} from '@/lib/vault/metatools-vault';
import toast from 'react-hot-toast';

// Default fee configuration (matches Steel contract defaults)
// Using System Program as placeholder until vault is deployed
const DEFAULT_TREASURY = new PublicKey('11111111111111111111111111111111');
const DEFAULT_BUYBACK = new PublicKey('11111111111111111111111111111111');

interface OpenPositionParams {
  pool: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  initialTvl: bigint; // Initial value in lamports
  protocol: Protocol;
  strategy: Strategy;
  referrer?: PublicKey;
}

interface ClosePositionParams {
  positionId: bigint;
}

interface UpdatePositionParams {
  positionId: bigint;
  newTvl: bigint;
  feesClaimed: bigint;
  totalCompounded: bigint;
}

export function useVaultIntegration() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  /**
   * Open a new position with atomic fee payment
   * This should be called BEFORE executing the actual liquidity add
   */
  const openPosition = useCallback(
    async (params: OpenPositionParams): Promise<{ success: boolean; signature?: string; positionId?: bigint }> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const {
        pool,
        baseMint,
        quoteMint,
        initialTvl,
        protocol,
        strategy,
        referrer = publicKey,
      } = params;

      try {
        const transaction = new Transaction();

        // Check if vault exists, create if needed
        const vaultStatus = await getOrCreateVault(connection, publicKey, referrer);
        if (!vaultStatus.exists && vaultStatus.instruction) {
          transaction.add(vaultStatus.instruction);
          console.log('Added CreateVault instruction');
        }

        // Calculate fee (0.7% of initial TVL)
        const feeAmount = calculateFee(initialTvl);
        console.log(`Fee amount: ${feeAmount} lamports (0.7% of ${initialTvl})`);

        // Add OpenPosition instruction
        const openPosIx = createOpenPositionInstruction(
          publicKey,
          pool,
          baseMint,
          quoteMint,
          initialTvl,
          protocol,
          strategy,
          DEFAULT_TREASURY,
          DEFAULT_BUYBACK,
          referrer
        );
        transaction.add(openPosIx);
        console.log('Added OpenPosition instruction');

        // Send transaction
        const signature = await sendTransaction(transaction, connection);
        console.log('Transaction sent:', signature);

        // Wait for confirmation with better timeout handling
        try {
          await connection.confirmTransaction(signature, 'confirmed');
          console.log('Transaction confirmed');
        } catch (timeoutError: any) {
          // If confirmation times out, check if transaction actually succeeded
          console.warn('Confirmation timeout, checking transaction status...');
          const status = await connection.getSignatureStatus(signature);

          if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
            console.log('Transaction actually succeeded despite timeout');
            toast.success('Position opened! (confirmed after timeout)', { duration: 5000 });
          } else if (status.value?.err) {
            console.error('Transaction failed:', status.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          } else {
            // Still pending or timeout without status
            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            toast(
              `Transaction sent but not confirmed yet. Check status: ${explorerUrl}`,
              { duration: 10000, icon: '⚠️' }
            );
            throw timeoutError;
          }
        }

        // Generate position ID (deterministic based on pool + wallet)
        const positionId = BigInt(Date.now()); // In production, this should be derived from PDA

        return {
          success: true,
          signature,
          positionId,
        };
      } catch (error: any) {
        console.error('Error opening position:', error);
        // Don't show error toast here if we already showed a warning/success
        if (!error.message?.includes('timeout')) {
          toast.error(`Failed to open position: ${error.message}`);
        }
        return { success: false };
      }
    },
    [connection, publicKey, sendTransaction]
  );

  /**
   * Close a position
   * This should be called AFTER removing liquidity
   */
  const closePosition = useCallback(
    async (params: ClosePositionParams): Promise<{ success: boolean; signature?: string }> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const { positionId } = params;

      try {
        const transaction = new Transaction();

        // Add ClosePosition instruction
        const closePosIx = createClosePositionInstruction(publicKey, positionId);
        transaction.add(closePosIx);
        console.log('Added ClosePosition instruction');

        // Send transaction
        const signature = await sendTransaction(transaction, connection);
        console.log('Transaction sent:', signature);

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('Transaction confirmed');

        return {
          success: true,
          signature,
        };
      } catch (error: any) {
        console.error('Error closing position:', error);
        toast.error(`Failed to close position: ${error.message}`);
        return { success: false };
      }
    },
    [connection, publicKey, sendTransaction]
  );

  /**
   * Update position TVL (for analytics)
   * Call this periodically or after compounding fees
   */
  const updatePositionTVL = useCallback(
    async (params: UpdatePositionParams): Promise<{ success: boolean; signature?: string }> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const { positionId, newTvl, feesClaimed, totalCompounded } = params;

      try {
        const transaction = new Transaction();

        // Add UpdatePositionTVL instruction
        const updateIx = createUpdatePositionTVLInstruction(
          publicKey,
          positionId,
          newTvl,
          feesClaimed,
          totalCompounded
        );
        transaction.add(updateIx);
        console.log('Added UpdatePositionTVL instruction');

        // Send transaction
        const signature = await sendTransaction(transaction, connection);
        console.log('Transaction sent:', signature);

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('Transaction confirmed');

        return {
          success: true,
          signature,
        };
      } catch (error: any) {
        console.error('Error updating position TVL:', error);
        return { success: false };
      }
    },
    [connection, publicKey, sendTransaction]
  );

  return {
    openPosition,
    closePosition,
    updatePositionTVL,
  };
}
