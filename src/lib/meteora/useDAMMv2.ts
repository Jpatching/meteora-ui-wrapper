'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';
import { useNetwork } from '@/contexts/NetworkContext';
import { useReferral } from '@/contexts/ReferralContext';
import { getFeeDistributionInstructions } from '@/lib/feeDistribution';
import {
  getTokenDecimals,
  getSqrtPriceFromPrice,
  validatePublicKey,
  validateAndConvertAmount,
  getAmountInLamports,
  validatePercentage,
} from './helpers';

/**
 * Hook for DAMM v2 (Dynamic AMM v2 / CP AMM) operations
 * SDK: @meteora-ag/cp-amm-sdk
 * Based on /studio/src/lib/damm_v2/index.ts
 */
export function useDAMMv2() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { referrerWallet } = useReferral();

  /**
   * Create a balanced DAMM v2 pool with both tokens
   */
  const createBalancedPool = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating balanced DAMM v2 pool:', params);

    try {
      // Validate inputs
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');

      // Get decimals
      const baseDecimals = await getTokenDecimals(connection, baseMint);
      const quoteDecimals = await getTokenDecimals(connection, quoteMint);

      // Convert amounts
      const baseAmount = getAmountInLamports(params.baseAmount, baseDecimals);
      const quoteAmount = getAmountInLamports(params.quoteAmount, quoteDecimals);

      // Convert prices to sqrt prices
      const initSqrtPrice = getSqrtPriceFromPrice(
        parseFloat(params.initialPrice || params.initPrice),
        baseDecimals,
        quoteDecimals
      );
      const maxSqrtPrice = getSqrtPriceFromPrice(
        parseFloat(params.maxPrice),
        baseDecimals,
        quoteDecimals
      );

      // Initialize CP AMM instance
      const cpAmmInstance = new CpAmm(connection);

      // Calculate liquidity delta
      const liquidityDelta = await cpAmmInstance.getLiquidityDelta({
        tokenAAmount: baseAmount,
        tokenBAmount: quoteAmount,
        initSqrtPrice,
        maxSqrtPrice,
      } as any);

      // Prepare pool fees
      const tradeFeeInBps = new BN(params.tradeFeeInBps || params.feeBps || 25);
      const poolFees = {
        baseFee: {
          maxBaseFeeBps: tradeFeeInBps,
        },
        dynamicFee: null, // Null for static fees
        padding: 0,
      };

      // Create pool transaction (type cast for SDK compatibility)
      const result = await cpAmmInstance.createCustomPool({
        tokenAMint: baseMint,
        tokenBMint: quoteMint,
        tokenAAmount: baseAmount,
        tokenBAmount: quoteAmount,
        liquidityDelta,
        initSqrtPrice,
        poolFees,
        owner: publicKey,
        hasAlphaVault: params.hasAlphaVault || false,
        activationType: params.activationType || 0,
        activationPoint: params.activationPoint ? new BN(params.activationPoint) : null,
      } as any);

      // Add compute budget
      result.tx.instructions.unshift(
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
          result.tx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to balanced pool creation');
      }

      // Send transaction
      const signature = await sendTransaction(result.tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Balanced pool created:', signature);
      console.log('Pool address:', result.pool.toString());

      return {
        success: true,
        signature,
        poolAddress: result.pool.toString(),
      };
    } catch (error: any) {
      console.error('Error creating balanced pool:', error);
      throw new Error(error.message || 'Failed to create balanced pool');
    }
  };

  /**
   * Create a one-sided DAMM v2 pool (single token)
   */
  const createOneSidedPool = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating one-sided DAMM v2 pool:', params);

    try {
      // Validate inputs
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');

      // Get decimals
      const baseDecimals = await getTokenDecimals(connection, baseMint);
      const quoteDecimals = await getTokenDecimals(connection, quoteMint);

      // Convert amount
      const baseAmount = getAmountInLamports(params.baseAmount, baseDecimals);

      // Convert prices
      const initSqrtPrice = getSqrtPriceFromPrice(
        parseFloat(params.initialPrice || params.initPrice),
        baseDecimals,
        quoteDecimals
      );
      const maxSqrtPrice = getSqrtPriceFromPrice(
        parseFloat(params.maxPrice),
        baseDecimals,
        quoteDecimals
      );

      // Initialize CP AMM
      const cpAmmInstance = new CpAmm(connection);

      // For one-sided: tokenBAmount = 0
      const quoteAmount = new BN(0);

      // Calculate liquidity for single-sided
      const liquidityDelta = await cpAmmInstance.getLiquidityDelta({
        tokenAAmount: baseAmount,
        tokenBAmount: quoteAmount,
        initSqrtPrice,
        maxSqrtPrice,
      } as any);

      // Prepare fees
      const tradeFeeInBps = new BN(params.tradeFeeInBps || params.feeBps || 25);
      const poolFees = {
        baseFee: {
          maxBaseFeeBps: tradeFeeInBps,
        },
        dynamicFee: null,
        padding: 0,
      };

      // Create pool (type cast for SDK compatibility)
      const result = await cpAmmInstance.createCustomPool({
        tokenAMint: baseMint,
        tokenBMint: quoteMint,
        tokenAAmount: baseAmount,
        tokenBAmount: quoteAmount,
        liquidityDelta,
        initSqrtPrice,
        poolFees,
        owner: publicKey,
        hasAlphaVault: params.hasAlphaVault || false,
        activationType: params.activationType || 0,
        activationPoint: params.activationPoint ? new BN(params.activationPoint) : null,
      } as any);

      // Add compute budget
      result.tx.instructions.unshift(
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
          result.tx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to one-sided pool creation');
      }

      // Send transaction
      const signature = await sendTransaction(result.tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('One-sided pool created:', signature);
      console.log('Pool address:', result.pool.toString());

      return {
        success: true,
        signature,
        poolAddress: result.pool.toString(),
      };
    } catch (error: any) {
      console.error('Error creating one-sided pool:', error);
      throw new Error(error.message || 'Failed to create one-sided pool');
    }
  };

  /**
   * Add liquidity to existing position
   */
  const addLiquidity = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Adding liquidity:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');
      const amountIn = validateAndConvertAmount(params.amountIn, 'Amount in', 9);
      const isTokenA = params.isTokenA !== false; // Default true

      // Initialize CP AMM with pool
      const cpAmmInstance = await (CpAmm as any).create(connection, poolAddress);

      // Get deposit quote
      const quote = await cpAmmInstance.getDepositQuote({
        amountIn,
        isTokenA,
        slippageBps: params.slippageBps || 100, // 1% default
      });

      console.log('Deposit quote:', quote);

      // Add liquidity transaction
      const tx = await cpAmmInstance.addLiquidity({
        owner: publicKey,
        liquidityDelta: quote.liquidityDelta,
        maxAmountTokenA: quote.maxTokenAAmount,
        maxAmountTokenB: quote.maxTokenBAmount,
      });

      // Add compute budget
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
        console.log('Fee instructions prepended atomically to add liquidity');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Liquidity added:', signature);

      return {
        success: true,
        signature,
        liquidityAdded: quote.liquidityDelta.toString(),
      };
    } catch (error: any) {
      console.error('Error adding liquidity:', error);
      throw new Error(error.message || 'Failed to add liquidity');
    }
  };

  /**
   * Remove liquidity from position
   */
  const removeLiquidity = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Removing liquidity:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');
      const liquidityAmount = validateAndConvertAmount(params.liquidityAmount, 'Liquidity amount', 9);

      // Initialize CP AMM
      const cpAmmInstance = await (CpAmm as any).create(connection, poolAddress);

      // Get withdraw quote
      const quote = await cpAmmInstance.getWithdrawQuote({
        liquidityDelta: liquidityAmount,
        slippageBps: params.slippageBps || 100,
      });

      console.log('Withdraw quote:', quote);

      // Remove liquidity transaction
      const tx = await cpAmmInstance.removeLiquidity({
        owner: publicKey,
        liquidityDelta: liquidityAmount,
        minTokenAAmount: quote.minTokenAAmount,
        minTokenBAmount: quote.minTokenBAmount,
      });

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
        console.log('Fee instructions prepended atomically to remove liquidity');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Liquidity removed:', signature);

      return {
        success: true,
        signature,
        liquidityRemoved: liquidityAmount.toString(),
      };
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      throw new Error(error.message || 'Failed to remove liquidity');
    }
  };

  /**
   * Claim trading fees from position
   */
  const claimFees = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Claiming fees:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');

      // Initialize CP AMM
      const cpAmmInstance = await (CpAmm as any).create(connection, poolAddress);

      // Claim position fee transaction
      const tx = await cpAmmInstance.claimPositionFee({
        owner: publicKey,
      });

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
        console.log('Fee instructions prepended atomically to claim fees');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Fees claimed:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('Error claiming fees:', error);
      throw new Error(error.message || 'Failed to claim fees');
    }
  };

  /**
   * Split position into two positions
   */
  const splitPosition = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Splitting position:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');
      const newPositionOwner = validatePublicKey(params.newPositionOwner, 'New position owner');

      // Validate percentages
      validatePercentage(params.unlockedLiquidityPercentage, 'Unlocked liquidity percentage');
      validatePercentage(params.permanentLockedLiquidityPercentage, 'Permanent locked liquidity percentage');
      validatePercentage(params.feeAPercentage, 'Fee A percentage');
      validatePercentage(params.feeBPercentage, 'Fee B percentage');

      // Initialize CP AMM
      const cpAmmInstance = await (CpAmm as any).create(connection, poolAddress);

      // Split position transaction
      const tx = await cpAmmInstance.splitPosition({
        owner: publicKey,
        newPositionOwner,
        unlockedLiquidityPercentage: params.unlockedLiquidityPercentage,
        permanentLockedLiquidityPercentage: params.permanentLockedLiquidityPercentage,
        feeAPercentage: params.feeAPercentage,
        feeBPercentage: params.feeBPercentage,
        reward0Percentage: params.reward0Percentage || 50,
        reward1Percentage: params.reward1Percentage || 50,
      });

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
        console.log('Fee instructions prepended atomically to split position');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Position split:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('Error splitting position:', error);
      throw new Error(error.message || 'Failed to split position');
    }
  };

  /**
   * Close empty position
   */
  const closePosition = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Closing position:', params);

    try {
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');

      // Initialize CP AMM
      const cpAmmInstance = await (CpAmm as any).create(connection, poolAddress);

      // Close position transaction
      const tx = await cpAmmInstance.closePosition({
        owner: publicKey,
      });

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
        console.log('Fee instructions prepended atomically to close position');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Position closed:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('Error closing position:', error);
      throw new Error(error.message || 'Failed to close position');
    }
  };

  /**
   * Fetch all DAMM v2 positions for the connected wallet
   * Note: This requires iterating through known pools since there's no global user positions query
   */
  const fetchUserPositions = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DAMM v2] Fetching user positions...');

    try {
      // Note: CP-AMM SDK doesn't have a global getPositionsByUser method
      // We need to either:
      // 1. Query known pool addresses and check each one
      // 2. Use on-chain program queries to find all position accounts
      // For now, return empty array and implement pool-specific position fetching
      console.warn('[DAMM v2] Global position fetching not implemented - use pool-specific queries');
      const positions: any[] = [];

      console.log(`[DAMM v2] Found ${positions.length} positions`);

      // Transform to common position format
      const userPositions = positions.map((pos: any) => {
        // Extract position data from SDK response
        const poolAddress = pos.poolState?.publicKey?.toString() || '';
        const positionAddress = pos.publicKey?.toString() || '';
        const nftMint = pos.nftMint?.toString() || '';

        return {
          positionKey: positionAddress,
          poolAddress,
          nftMint,
          baseMint: pos.poolState?.tokenMintA?.toString() || '',
          quoteMint: pos.poolState?.tokenMintB?.toString() || '',
          baseSymbol: 'Token A', // Would need token metadata lookup
          quoteSymbol: 'Token B',
          liquidityAmount: Number(pos.liquidity || 0),
          unclaimedFeesA: Number(pos.feeOwedA || 0) / 1e9,
          unclaimedFeesB: Number(pos.feeOwedB || 0) / 1e9,
          lastUpdated: new Date(),
        };
      });

      console.log(`[DAMM v2] Successfully parsed ${userPositions.length} positions`);
      return userPositions;
    } catch (error: any) {
      console.error('[DAMM v2] Error fetching positions:', error);

      // Return empty array if method not available (SDK version issue)
      if (error.message?.includes('getPositionsByUser')) {
        console.warn('[DAMM v2] SDK method not available - returning empty positions');
        return [];
      }

      throw new Error(error.message || 'Failed to fetch DAMM v2 positions');
    }
  };

  return {
    createBalancedPool,
    createOneSidedPool,
    addLiquidity,
    removeLiquidity,
    claimFees,
    splitPosition,
    closePosition,
    fetchUserPositions,
  };
}
