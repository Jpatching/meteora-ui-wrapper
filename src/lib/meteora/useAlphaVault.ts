'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import AlphaVault from '@meteora-ag/alpha-vault';
import BN from 'bn.js';
import { useNetwork } from '@/contexts/NetworkContext';
import { useReferral } from '@/contexts/ReferralContext';
import { getFeeDistributionInstructions } from '@/lib/feeDistribution';
import {
  validatePublicKey,
  validateFutureTimestamp,
  getAmountInLamports,
} from './helpers';

/**
 * Hook for Alpha Vault operations
 * SDK: @meteora-ag/alpha-vault
 * Based on /studio/src/lib/alpha_vault/index.ts
 */
export function useAlphaVault() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { referrerWallet } = useReferral();

  /**
   * Create Alpha Vault
   * MVP: FCFS (First-Come-First-Serve) mode only
   */
  const createVault = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating Alpha Vault:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');

      // Validate timestamps
      const depositingPoint = new BN(params.depositingPoint || Math.floor(Date.now() / 1000));
      const startVestingPoint = new BN(params.startVestingPoint);
      const endVestingPoint = new BN(params.endVestingPoint);

      validateFutureTimestamp(startVestingPoint.toNumber(), 'Start vesting point');
      validateFutureTimestamp(endVestingPoint.toNumber(), 'End vesting point');

      if (endVestingPoint.lte(startVestingPoint)) {
        throw new Error('End vesting point must be after start vesting point');
      }

      // Convert amounts
      const maxDepositingCap = new BN(params.maxDepositCap || 0);
      const individualDepositingCap = new BN(params.individualDepositingCap || 0);
      const escrowFee = new BN(params.escrowFee || 0);

      // Determine pool type
      const poolType = convertPoolType(params.poolType);
      const whitelistMode = params.whitelistMode || 0; // 0 = Permissionless

      // Build vault params object
      const vaultParams = {
        quoteMint,
        baseMint,
        poolAddress,
        poolType,
        depositingPoint,
        startVestingPoint,
        endVestingPoint,
        maxDepositingCap,
        individualDepositingCap,
        escrowFee,
        whitelistMode,
      };

      // Create FCFS vault transaction
      // SDK signature: createCustomizableFcfsVault(connection, vaultParam, owner, opt?)
      const tx = await AlphaVault.createCustomizableFcfsVault(
        connection,
        vaultParams,
        publicKey
      );

      tx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      // Get fee instructions to prepend atomically
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // ATOMIC: Prepend fee instructions to transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          tx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to create vault');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Alpha Vault created:', signature);

      return {
        success: true,
        signature,
        vaultAddress: 'Derived from transaction',
      };
    } catch (error: any) {
      console.error('Error creating Alpha Vault:', error);
      throw new Error(error.message || 'Failed to create Alpha Vault');
    }
  };

  return {
    createVault,
  };
}

/**
 * Helper: Convert pool type string to SDK enum
 */
function convertPoolType(poolType: string): number {
  const typeMap: Record<string, number> = {
    'dlmm': 0,
    'damm-v1': 1,
    'damm-v2': 2,
    'cp-amm': 1, // Alias for damm-v1
    'dynamic-amm': 2, // Alias for damm-v2
  };

  return typeMap[poolType.toLowerCase()] || 0;
}
