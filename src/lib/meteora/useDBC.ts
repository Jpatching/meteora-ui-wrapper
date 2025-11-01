'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import { useNetwork } from '@/contexts/NetworkContext';
import { useReferral } from '@/contexts/ReferralContext';
import { getFeeDistributionInstructions } from '@/lib/feeDistribution';
import {
  validatePublicKey,
  validateAndConvertAmount,
  getAmountInLamports,
} from './helpers';
import { createTokenWithMetadata } from './useDLMM';
import { DBC_PROGRAM_IDS, type NetworkType } from './programIds';

/**
 * Hook for DBC (Dynamic Bonding Curve) operations
 * SDK: @meteora-ag/dynamic-bonding-curve-sdk
 * Based on /studio/src/lib/dbc/index.ts
 *
 * Program IDs:
 * - Mainnet: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
 * - Devnet: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
 *
 * Note: DynamicBondingCurveClient handles program IDs internally based on network
 */
export function useDBC() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { referrerWallet } = useReferral();

  // Get the appropriate program ID for current network
  const dbcProgramId = new PublicKey(DBC_PROGRAM_IDS[network as NetworkType]);

  /**
   * Create DBC configuration
   */
  const createConfig = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating DBC config:', params);

    try {
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');
      const feeClaimer = validatePublicKey(params.feeClaimer || publicKey.toString(), 'Fee claimer');
      const leftoverReceiver = validatePublicKey(params.leftoverReceiver || publicKey.toString(), 'Leftover receiver');

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      // Build curve based on mode
      const curveConfig = buildCurve(params);

      // Generate config keypair
      const configKeypair = Keypair.generate();

      // Create config transaction
      const tx = await dbcClient.partner.createConfig({
        config: configKeypair,
        quoteMint,
        feeClaimer,
        leftoverReceiver,
        ...curveConfig,
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
        console.log('Fee instructions prepended atomically to create config');
      }

      const signature = await sendTransaction(tx, connection, {
        signers: [configKeypair],
      });
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Config created:', configKeypair.publicKey.toString());

      return {
        success: true,
        signature,
        configAddress: configKeypair.publicKey.toString(),
      };
    } catch (error: any) {
      console.error('Error creating config:', error);
      throw new Error(error.message || 'Failed to create config');
    }
  };

  /**
   * Create DBC pool with token
   */
  const createPool = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Creating DBC pool:', params);

    try {
      let baseMint: PublicKey;
      let configAddress: PublicKey;

      // Create token if needed
      if (params.createBaseToken) {
        console.log('Creating new base token...');
        // Reuse token creation from DLMM
        baseMint = await createTokenWithMetadata(params.createBaseToken, connection, publicKey, sendTransaction);
      } else {
        baseMint = validatePublicKey(params.baseMint!, 'Base mint');
      }

      // Create config if needed
      if (!params.configAddress && params.createConfig) {
        console.log('Creating new config...');
        const configResult = await createConfig(params.createConfig);
        configAddress = new PublicKey(configResult.configAddress);
      } else {
        configAddress = validatePublicKey(params.configAddress!, 'Config address');
      }

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      // Create pool transaction
      const tx = await dbcClient.pool.createPool({
        baseMint: baseMint,
        config: configAddress,
        name: params.name,
        symbol: params.symbol,
        uri: params.uri || params.metadata?.uri || '',
        payer: publicKey,
        poolCreator: publicKey,
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
        console.log('Fee instructions prepended atomically to create pool');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('DBC pool created:', signature);

      return {
        success: true,
        signature,
        baseMint: baseMint.toString(),
        configAddress: configAddress.toString(),
      };
    } catch (error: any) {
      console.error('Error creating DBC pool:', error);
      throw new Error(error.message || 'Failed to create DBC pool');
    }
  };

  /**
   * Swap tokens on bonding curve
   */
  const swap = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Swapping on DBC:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const amountIn = validateAndConvertAmount(params.amountIn, 'Amount in', 9);
      const swapBaseForQuote = params.side === 'sell';

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      // Fetch pool state and config (required for swapQuote)
      const poolAccount = await dbcClient.state.getPoolByBaseMint(baseMint);
      if (!poolAccount) {
        throw new Error(`No DBC pool found for base mint ${baseMint.toBase58()}`);
      }

      // ProgramAccount contains the account data directly, and publicKey property
      const poolPublicKey = (poolAccount as any).publicKey || (poolAccount as any).pubkey;
      if (!poolPublicKey) {
        console.error('Pool account structure:', poolAccount);
        throw new Error(`Unable to extract public key from pool account`);
      }

      const virtualPoolState = await dbcClient.state.getPool(poolPublicKey);
      if (!virtualPoolState) {
        throw new Error(`Failed to fetch pool state for address ${poolPublicKey.toBase58()}`);
      }

      const poolConfigState = await dbcClient.state.getPoolConfig(virtualPoolState.config);
      if (!poolConfigState) {
        throw new Error(`Failed to fetch pool config for ${virtualPoolState.config.toBase58()}`);
      }

      // Calculate slippage
      const slippageBps = params.slippageBps || params.slippage || 100;

      // Get swap quote with proper parameters
      const quote = await dbcClient.pool.swapQuote({
        virtualPool: virtualPoolState,
        config: poolConfigState,
        swapBaseForQuote,
        amountIn,
        slippageBps,
        hasReferral: !!params.referralTokenAccount,
        currentPoint: new BN(Math.floor(Date.now() / 1000)),
      });

      console.log('Swap quote:', quote);

      // Calculate minimum output with slippage
      // The quote result might have different property names depending on SDK version
      const quoteAmountOut = (quote as any).amountOut || (quote as any).outAmount || (quote as any).expectedAmountOut;
      if (!quoteAmountOut) {
        throw new Error('Unable to determine output amount from swap quote');
      }
      const minimumAmountOut = quoteAmountOut.mul(new BN(10000 - slippageBps)).div(new BN(10000));

      // Swap transaction
      const tx = await dbcClient.pool.swap({
        amountIn,
        minimumAmountOut,
        owner: publicKey,
        pool: poolPublicKey,
        swapBaseForQuote,
        referralTokenAccount: params.referralTokenAccount ? new PublicKey(params.referralTokenAccount) : undefined,
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
        console.log('Fee instructions prepended atomically to swap');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Swap completed:', signature);

      return {
        success: true,
        signature,
        amountOut: quoteAmountOut.toString(),
      };
    } catch (error: any) {
      console.error('Error swapping:', error);
      throw new Error(error.message || 'Failed to swap');
    }
  };

  /**
   * Claim trading fees
   */
  const claimFees = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Claiming DBC fees:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      const signatures: string[] = [];

      // Get fee instructions to prepend atomically
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Claim creator fees
      const creatorTx = await dbcClient.creator.claimCreatorTradingFee({
        creator: publicKey,
        baseMint,
      } as any);

      creatorTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      // ATOMIC: Prepend fee instructions to transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          creatorTx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to claim creator fees');
      }

      const creatorSig = await sendTransaction(creatorTx, connection);
      await connection.confirmTransaction(creatorSig, 'confirmed');
      signatures.push(creatorSig);

      console.log('Creator fees claimed:', creatorSig);

      // Claim partner fees
      try {
        const partnerTx = await dbcClient.partner.claimPartnerTradingFee({
          feeClaimer: publicKey,
          baseMint,
        } as any);

        partnerTx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
        );

        const partnerSig = await sendTransaction(partnerTx, connection);
        await connection.confirmTransaction(partnerSig, 'confirmed');
        signatures.push(partnerSig);

        console.log('Partner fees claimed:', partnerSig);
      } catch (error) {
        console.log('No partner fees to claim');
      }

      return {
        success: true,
        signatures,
      };
    } catch (error: any) {
      console.error('Error claiming fees:', error);
      throw new Error(error.message || 'Failed to claim fees');
    }
  };

  /**
   * Migrate to DAMM v1 (Constant Product AMM)
   * COMPLEX: Multi-step process
   */
  const migrateToDAMMv1 = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Migrating to DAMM v1:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      const signatures: string[] = [];

      // Get fee instructions to prepend atomically
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Step 1: Create migration metadata
      console.log('Step 1: Creating migration metadata...');
      const metadataTx = await (dbcClient.pool as any).createDammV1MigrationMetadata({
        baseMint,
        creator: publicKey,
      });

      metadataTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      // ATOMIC: Prepend fee instructions to transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          metadataTx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to migrate to DAMM v1');
      }

      const metadataSig = await sendTransaction(metadataTx, connection);
      await connection.confirmTransaction(metadataSig, 'confirmed');
      signatures.push(metadataSig);

      // Step 2: Migrate pool
      console.log('Step 2: Migrating pool...');
      const migrateTx = await (dbcClient.pool as any).migrateToDammV1({
        baseMint,
        creator: publicKey,
      });

      migrateTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      const migrateSig = await sendTransaction(migrateTx, connection);
      await connection.confirmTransaction(migrateSig, 'confirmed');
      signatures.push(migrateSig);

      console.log('Migration to DAMM v1 complete');

      return {
        success: true,
        signatures,
      };
    } catch (error: any) {
      console.error('Error migrating to DAMM v1:', error);
      throw new Error(error.message || 'Failed to migrate to DAMM v1');
    }
  };

  /**
   * Migrate to DAMM v2 (Dynamic AMM)
   * COMPLEX: Multi-step process
   */
  const migrateToDAMMv2 = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Migrating to DAMM v2:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      const signatures: string[] = [];

      // Get fee instructions to prepend atomically
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Step 1: Create migration metadata
      console.log('Step 1: Creating migration metadata...');
      const metadataTx = await (dbcClient.pool as any).createDammV2MigrationMetadata({
        baseMint,
        creator: publicKey,
      });

      metadataTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      // ATOMIC: Prepend fee instructions to transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          metadataTx.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to migrate to DAMM v2');
      }

      const metadataSig = await sendTransaction(metadataTx, connection);
      await connection.confirmTransaction(metadataSig, 'confirmed');
      signatures.push(metadataSig);

      // Step 2: Migrate pool
      console.log('Step 2: Migrating pool...');
      const migrateTx = await (dbcClient.pool as any).migrateToDammV2({
        baseMint,
        creator: publicKey,
      });

      migrateTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })
      );

      const migrateSig = await sendTransaction(migrateTx, connection);
      await connection.confirmTransaction(migrateSig, 'confirmed');
      signatures.push(migrateSig);

      console.log('Migration to DAMM v2 complete');

      return {
        success: true,
        signatures,
      };
    } catch (error: any) {
      console.error('Error migrating to DAMM v2:', error);
      throw new Error(error.message || 'Failed to migrate to DAMM v2');
    }
  };

  /**
   * Transfer pool creator ownership
   */
  const transferCreator = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Transferring pool creator:', params);

    try {
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const newCreator = validatePublicKey(params.newCreator, 'New creator');

      // Initialize DBC client
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

      // Transfer creator transaction
      const tx = await dbcClient.creator.transferPoolCreator({
        baseMint,
        creator: publicKey,
        newCreator,
      } as any);

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
        console.log('Fee instructions prepended atomically to transfer creator');
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Creator transferred:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('Error transferring creator:', error);
      throw new Error(error.message || 'Failed to transfer creator');
    }
  };

  /**
   * Fetch all DBC positions for the connected wallet
   */
  const fetchUserPositions = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DBC] Fetching user positions...');

    try {
      // DBC positions are simpler - user holds shares of pools
      // This is a placeholder implementation
      const positions: any[] = [];

      console.log('[DBC] Position fetching not yet fully implemented');
      console.log('[DBC] Returning empty positions array');

      return positions;
    } catch (error: any) {
      console.error('[DBC] Error fetching positions:', error);
      throw new Error(error.message || 'Failed to fetch DBC positions');
    }
  };

  return {
    createConfig,
    createPool,
    swap,
    claimFees,
    migrateToDAMMv1,
    migrateToDAMMv2,
    transferCreator,
    fetchUserPositions,
  };
}

/**
 * Helper: Build curve configuration based on mode
 */
function buildCurve(params: any): any {
  const mode = params.buildCurveMode || params.curveMode || 0;

  // Mode 0: Linear curve (simplest)
  if (mode === 0) {
    return {
      initialPrice: new BN(params.initialPrice || 0),
      finalPrice: new BN(params.finalPrice || 0),
      migrationFee: new BN(params.migrationFee || 0),
    };
  }

  // Other modes: Return placeholder for now
  // TODO: Implement market cap, two-segment, and liquidity weight curves
  return {
    initialPrice: new BN(params.initialPrice || 0),
    finalPrice: new BN(params.finalPrice || 0),
    migrationFee: new BN(params.migrationFee || 0),
  };
}
