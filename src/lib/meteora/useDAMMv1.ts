'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import BN from 'bn.js';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  getTokenDecimals,
  validatePublicKey,
  getAmountInLamports,
  fromAllocationsToAmount,
} from './helpers';

/**
 * Hook for DAMM v1 (Constant Product AMM) operations
 * SDK: @meteora-ag/dynamic-amm-sdk
 * Based on /studio/src/lib/damm_v1/index.ts
 */
export function useDAMMv1() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();

  /**
   * Create constant product pool (x * y = k)
   */
  const createPool = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating DAMM v1 pool:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');

      // Get decimals
      const baseDecimals = await getTokenDecimals(connection, baseMint);
      const quoteDecimals = await getTokenDecimals(connection, quoteMint);

      // Convert amounts
      const baseAmount = getAmountInLamports(params.baseAmount, baseDecimals);
      const quoteAmount = getAmountInLamports(params.quoteAmount, quoteDecimals);

      // Customize parameters
      const customizeParam = {
        tradeFeeNumerator: Number(params.tradeFeeNumerator || params.feeBps || 25),
        activationType: Number(params.activationType || 0),
        activationPoint: params.activationPoint ? new BN(params.activationPoint) : undefined,
        hasAlphaVault: Boolean(params.hasAlphaVault),
        padding: 0,
      };

      // Create pool transaction using static method
      // SDK signature: createCustomizablePermissionlessConstantProductPool(connection, payer, tokenAMint, tokenBMint, tokenAAmount, tokenBAmount, customizableParams, opt?)
      const tx = await AmmImpl.createCustomizablePermissionlessConstantProductPool(
        connection as any, // Type workaround for SDK compatibility
        publicKey, // payer
        baseMint,  // tokenAMint
        quoteMint, // tokenBMint
        baseAmount, // tokenAAmount
        quoteAmount, // tokenBAmount
        customizeParam as any // Type workaround for IDL-derived types
      );

      tx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('DAMM v1 pool created:', signature);

      return {
        success: true,
        signature,
        poolAddress: 'Derived from transaction',
      };
    } catch (error: any) {
      console.error('Error creating DAMM v1 pool:', error);
      throw new Error(error.message || 'Failed to create DAMM v1 pool');
    }
  };

  /**
   * Lock liquidity to specific addresses
   */
  const lockLiquidity = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Locking liquidity:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');

      // Validate allocations
      if (!params.allocations || params.allocations.length === 0) {
        throw new Error('Allocations are required');
      }

      // Initialize AMM with pool
      const pool = await AmmImpl.create(connection, poolAddress);

      // Get total LP balance
      const totalLpAmount = new BN(params.totalLpAmount || 0); // TODO: Fetch from wallet

      // Convert allocations to amounts
      const allocationAmounts = fromAllocationsToAmount(params.allocations, totalLpAmount);

      const signatures: string[] = [];

      // Lock liquidity for each allocation
      for (const alloc of allocationAmounts) {
        // SDK signature: lockLiquidity(owner, amount, feePayer?, opt?)
        const tx = await pool.lockLiquidity(
          alloc.address, // owner (lock address)
          alloc.amount,  // amount
          publicKey     // feePayer
        );

        tx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
        );

        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, 'confirmed');
        signatures.push(sig);

        console.log(`Locked ${alloc.amount.toString()} to ${alloc.address.toString()}`);
      }

      return {
        success: true,
        signatures,
      };
    } catch (error: any) {
      console.error('Error locking liquidity:', error);
      throw new Error(error.message || 'Failed to lock liquidity');
    }
  };

  /**
   * Create Stake2Earn farm
   * NOTE: This may require @meteora-ag/farming-sdk instead
   */
  const createStake2Earn = async (params: any): Promise<{success: boolean; signature?: string}> => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating Stake2Earn:', params);

    // TODO: Implement when farming SDK is integrated
    throw new Error('Stake2Earn creation not yet implemented - requires farming SDK');
  };

  /**
   * Lock Stake2Earn farm
   * NOTE: This may require @meteora-ag/farming-sdk instead
   */
  const lockStake2Earn = async (params: any): Promise<{success: boolean; signatures?: string[]}> => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Locking Stake2Earn:', params);

    // TODO: Implement when farming SDK is integrated
    throw new Error('Stake2Earn locking not yet implemented - requires farming SDK');
  };

  return {
    createPool,
    lockLiquidity,
    createStake2Earn,
    lockStake2Earn,
  };
}
