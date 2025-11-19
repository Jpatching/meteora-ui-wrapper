'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  getMint,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import DLMM, { deriveCustomizablePermissionlessLbPair, StrategyType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import { DLMMCreatePoolParams, TokenCreateConfig } from '@/types/meteora';
import { useNetwork } from '@/contexts/NetworkContext';
import { useTransactionHistory } from '@/contexts/TransactionHistoryContext';
import { useReferral } from '@/contexts/ReferralContext';
import { getFeeDistributionInstructions, getFeeBreakdown } from '@/lib/feeDistribution';
import { recordReferralEarning } from '@/lib/referrals';
import { confirmTransactionWithRetry } from '@/lib/transactionUtils';
import { DLMM_PROGRAM_IDS, type NetworkType } from './programIds';

/**
 * Validation helper: Validate and parse PublicKey
 */
function validatePublicKey(address: string, fieldName: string): PublicKey {
  if (!address || address.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  try {
    return new PublicKey(address);
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${address} is not a valid Solana address`);
  }
}

/**
 * Validation helper: Validate and parse BN amount
 * Handles both UI amounts (like "50" tokens) and raw lamports (like "50000000000")
 */
function validateBN(value: string | number, fieldName: string): BN {
  try {
    if (typeof value === 'string') {
      // Try to parse as BigNumber string first (for large numbers like "50000000000")
      // If the string is purely numeric with no decimals and very large, treat as lamports
      if (/^\d+$/.test(value)) {
        const bn = new BN(value);
        if (bn.gt(new BN(1000000))) {
          // Large number, likely already in lamports
          return bn;
        }
        // Small whole number, convert to lamports
        return new BN(Math.floor(parseFloat(value) * 1e9));
      }

      // Has decimal point, treat as UI amount
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error(`${fieldName} must be a positive number`);
      }
      return new BN(Math.floor(numValue * 1e9));
    }

    // Number type
    if (isNaN(value) || value < 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }

    // Convert to lamports
    return new BN(Math.floor(value * 1e9));
  } catch (error: any) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

/**
 * Validation helper: Validate price
 */
function validatePrice(value: string, fieldName: string): number {
  const price = parseFloat(value);
  if (isNaN(price) || price <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return price;
}

/**
 * Simulate transaction before sending to catch errors early
 * This helps identify issues before the wallet prompts the user
 */
async function simulateAndValidateTransaction(
  connection: any,
  transaction: Transaction,
  publicKey: PublicKey,
  signers: Keypair[] = []
): Promise<{ success: boolean; error?: string; logs?: string[] }> {
  try {
    console.log('[TX-SIM] Starting transaction simulation...');

    // Check SOL balance first
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / 1e9;
    console.log('[TX-SIM] Wallet SOL balance:', balanceSOL.toFixed(4), 'SOL');

    if (balanceSOL < 0.05) {
      return {
        success: false,
        error: `Insufficient SOL balance: ${balanceSOL.toFixed(4)} SOL. Need at least 0.05 SOL for fees and rent.`,
      };
    }

    // Create a copy of the transaction for simulation to avoid modifying the original
    const simTx = new Transaction();
    // Deep copy instructions to avoid shared references
    simTx.instructions = [...transaction.instructions];

    // Copy other properties if they exist
    if (transaction.recentBlockhash) {
      simTx.recentBlockhash = transaction.recentBlockhash;
    }
    if (transaction.feePayer) {
      simTx.feePayer = transaction.feePayer;
    }

    // Set recent blockhash if not already set
    if (!simTx.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash('processed');
      simTx.recentBlockhash = blockhash;
    }

    // Set fee payer if not already set
    if (!simTx.feePayer) {
      simTx.feePayer = publicKey;
    }

    // Partially sign with signers if provided (must happen before simulation)
    if (signers.length > 0) {
      simTx.partialSign(...signers);
    }

    console.log('[TX-SIM] Simulating transaction with', simTx.instructions.length, 'instructions');
    // For Transaction type (not VersionedTransaction), simulateTransaction takes signers as second param
    // We don't pass signers since the transaction is already partially signed
    const simulation = await connection.simulateTransaction(simTx);

    if (simulation.value.err) {
      console.error('[TX-SIM] Simulation failed:', simulation.value.err);
      console.error('[TX-SIM] Logs:', simulation.value.logs);

      // Parse error message
      let errorMsg = 'Transaction simulation failed';
      if (simulation.value.logs) {
        const logs = simulation.value.logs;
        // Look for specific error patterns
        for (const log of logs) {
          if (log.includes('insufficient funds')) {
            errorMsg = 'Insufficient SOL for transaction fees and rent';
            break;
          } else if (log.includes('insufficient')) {
            errorMsg = 'Insufficient token balance';
            break;
          } else if (log.includes('InvalidRealloc')) {
            errorMsg = 'Transaction too large - reduce price range (max 20 bins recommended)';
            break;
          } else if (log.includes('InvalidAccountData')) {
            errorMsg = 'Invalid account data - check token accounts exist';
            break;
          }
        }
      }

      return {
        success: false,
        error: errorMsg,
        logs: simulation.value.logs || [],
      };
    }

    console.log('[TX-SIM] Simulation successful!');
    console.log('[TX-SIM] Compute units used:', simulation.value.unitsConsumed);

    return { success: true };
  } catch (error: any) {
    console.error('[TX-SIM] Simulation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to simulate transaction',
    };
  }
}

/**
 * Validation helper: Validate curvature (0 to 1)
 */
function validateCurvature(value: string): number {
  const curvature = parseFloat(value);
  if (isNaN(curvature) || curvature < 0 || curvature > 1) {
    throw new Error('Curvature must be between 0 and 1');
  }
  return curvature;
}

/**
 * Helper function to derive metadata PDA
 */
function findMetadataPda(mint: PublicKey): PublicKey {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
  return publicKey;
}

/**
 * Build token creation instructions (without sending transaction)
 * Returns instructions and the mint keypair
 */
async function buildTokenCreationInstructions(
  config: TokenCreateConfig,
  connection: any,
  publicKey: PublicKey
): Promise<{ instructions: any[]; mintKeypair: Keypair; mintPubkey: PublicKey }> {
  const decimals = config.decimals ?? 9;
  const supply = config.supply ? parseFloat(config.supply) : 0;

  // Generate new mint keypair
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  // Get associated token account for minting
  const ata = getAssociatedTokenAddressSync(mintPubkey, publicKey);

  // Get rent-exempt balance for mint
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const instructions = [];

  // Create mint account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mintPubkey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // Initialize mint
  instructions.push(
    createInitializeMint2Instruction(
      mintPubkey,
      decimals,
      publicKey, // mint authority
      publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    )
  );

  // Create associated token account
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      ata, // associated token account
      publicKey, // owner
      mintPubkey // mint
    )
  );

  // Mint initial supply if specified
  if (supply > 0) {
    const amount = new BN(supply).mul(new BN(10).pow(new BN(decimals)));
    instructions.push(
      createMintToInstruction(
        mintPubkey,
        ata,
        publicKey, // mint authority
        BigInt(amount.toString())
      )
    );
  }

  // Create metadata account
  const metadataPda = findMetadataPda(mintPubkey);
  instructions.push(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPda,
        mint: mintPubkey,
        mintAuthority: publicKey,
        payer: publicKey,
        updateAuthority: publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: config.name,
            symbol: config.symbol,
            uri: config.uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  return { instructions, mintKeypair, mintPubkey };
}

/**
 * Create a new SPL token with Metaplex metadata
 * Exported separately so it can be used by other hooks (DBC, etc.)
 * Uses the buildTokenCreationInstructions helper
 */
export async function createTokenWithMetadata(
  config: TokenCreateConfig,
  connection: any,
  publicKey: PublicKey,
  sendTransaction: any
): Promise<PublicKey> {
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }

  const { instructions, mintKeypair, mintPubkey } = await buildTokenCreationInstructions(
    config,
    connection,
    publicKey
  );

  // Build transaction
  const transaction = new Transaction();

  // Add compute budget for better priority
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 })
  );

  // Add all token creation instructions
  instructions.forEach(ix => transaction.add(ix));

  // Send transaction with improved retry logic
  const signature = await sendTransaction(transaction, connection, {
    signers: [mintKeypair],
    skipPreflight: true,
    maxRetries: 5,
  });

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 500));
  await confirmTransactionWithRetry(connection, signature, { maxRetries: 10 });

  return mintPubkey;
}

/**
 * Hook for DLMM pool operations using Meteora SDK
 * Based on /studio/src/lib/dlmm/index.ts
 */
export function useDLMM() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { network } = useNetwork();
  const { referrerWallet, recordEarning } = useReferral();
  const { addTransaction } = useTransactionHistory();

  /**
   * Create a customizable permissionless DLMM pool
   * Handles both scenarios: creating new token or using existing token
   * TWO-TRANSACTION FLOW for new tokens (safer, more reliable)
   */
  const createPool = async (params: DLMMCreatePoolParams) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Validate that we have either baseMint OR createBaseToken
      if (!params.baseMint && !params.createBaseToken) {
        throw new Error('Either baseMint or createBaseToken must be provided');
      }

      if (params.baseMint && params.createBaseToken) {
        throw new Error('Provide only baseMint OR createBaseToken, not both');
      }

      let baseMint: PublicKey;
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');

      // Get fee breakdown for tracking
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const platformFeePaid = feeBreakdown.total.lamports;

      // ===== TWO-TRANSACTION FLOW: Create token FIRST if needed =====
      if (params.createBaseToken) {
        console.log('[STEP 1/2] Creating new token...');

        // Build token creation instructions
        const { instructions: tokenInstructions, mintKeypair, mintPubkey } = await buildTokenCreationInstructions(
          params.createBaseToken,
          connection,
          publicKey
        );
        baseMint = mintPubkey;

        // Get fee instructions for token creation
        const feeInstructions = await getFeeDistributionInstructions(
          publicKey,
          referrerWallet || undefined
        );

        // Build token creation transaction with fees
        const tokenTx = new Transaction();

        // Add compute budget
        tokenTx.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })
        );
        tokenTx.add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 })
        );

        // Add fee instructions atomically
        if (feeInstructions.length > 0) {
          feeInstructions.forEach(ix => tokenTx.add(ix));
        }

        // Add token creation instructions
        tokenInstructions.forEach(ix => tokenTx.add(ix));

        console.log(`[TOKEN TX] Sending transaction with ${tokenTx.instructions.length} instructions (fees + token creation)`);

        // Send token creation transaction
        const tokenSignature = await sendTransaction(tokenTx, connection, {
          signers: [mintKeypair],
          skipPreflight: true,
          maxRetries: 5,
        });
        console.log('[STEP 1/2] Token creation transaction sent:', tokenSignature);

        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 500));
        await confirmTransactionWithRetry(connection, tokenSignature, { maxRetries: 10 });
        console.log('[STEP 1/2] Token created successfully:', baseMint.toString());

        // Record referral earning for token creation
        if (referrerWallet && feeBreakdown.referral.lamports > 0) {
          recordEarning(
            feeBreakdown.referral.lamports,
            publicKey.toBase58(),
            tokenSignature
          );
        }

        // Track token creation transaction
        addTransaction({
          signature: tokenSignature,
          walletAddress: publicKey.toBase58(),
          network,
          protocol: 'dlmm',
          action: 'dlmm-create-token',
          status: 'success',
          params: { tokenConfig: params.createBaseToken },
          tokenAddress: baseMint.toString(),
          platformFee: platformFeePaid,
        });
      } else {
        // Using existing token
        baseMint = validatePublicKey(params.baseMint!, 'Base mint');
        console.log('[SINGLE TX] Using existing token:', baseMint.toString());
      }

      // ===== STEP 2: Create Pool (always happens, with or without token creation) =====
      console.log('[STEP 2/2] Creating DLMM pool...');

      // Fetch token decimals (token now exists on-chain)
      const baseMintAccount = await getMint(connection, baseMint);
      const quoteMintAccount = await getMint(connection, quoteMint);
      const baseDecimals = baseMintAccount.decimals;
      const quoteDecimals = quoteMintAccount.decimals;

      // Calculate price per lamport
      const initPrice = DLMM.getPricePerLamport(
        baseDecimals,
        quoteDecimals,
        Number(params.initialPrice || 1)
      );

      // Get bin ID from price
      const activateBinId = DLMM.getBinIdFromPrice(
        initPrice,
        Number(params.binStep || 25),
        true // round up
      );

      const dlmmProgramId = new PublicKey(
        DLMM_PROGRAM_IDS[network as keyof typeof DLMM_PROGRAM_IDS]
      );

      // Create pool transaction using Meteora SDK (token exists now, so this works)
      const initPoolTx = await DLMM.createCustomizablePermissionlessLbPair2(
        connection,
        new BN(params.binStep || 25),
        baseMint,
        quoteMint,
        new BN(activateBinId.toString()),
        new BN(params.feeBps || 1),
        params.activationType || 1,
        params.hasAlphaVault || false,
        publicKey,
        params.activationPoint ? new BN(params.activationPoint) : undefined,
        params.creatorPoolOnOffControl || false,
        {
          cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
          programId: dlmmProgramId,
        }
      );

      // Create ATA instructions (idempotent - safe to call even if ATAs exist)
      const baseTokenATA = getAssociatedTokenAddressSync(baseMint, publicKey);
      const quoteTokenATA = getAssociatedTokenAddressSync(quoteMint, publicKey);

      const ataInstructions = [
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,      // payer
          baseTokenATA,   // associated token account address
          publicKey,      // owner
          baseMint        // mint
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,      // payer
          quoteTokenATA,  // associated token account address
          publicKey,      // owner
          quoteMint       // mint
        ),
      ];

      // Get fee instructions (only if we didn't create token - fees already paid in step 1)
      const shouldPayFees = !params.createBaseToken;
      const feeInstructions = shouldPayFees
        ? await getFeeDistributionInstructions(publicKey, referrerWallet || undefined)
        : [];

      // Build pool creation transaction in correct order: Fees → Compute Budget → ATAs → Pool Creation
      // Note: unshift() adds to the FRONT, so we add in REVERSE order

      // 1. Unshift ATAs (will end up after compute budget, before pool)
      ataInstructions.reverse().forEach((instruction) => {
        initPoolTx.instructions.unshift(instruction);
      });

      // 2. Unshift compute budget (will end up after fees, before ATAs)
      initPoolTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 })
      );
      initPoolTx.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 })
      );

      // 3. Unshift fee instructions if needed (will end up first)
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((instruction) => {
          initPoolTx.instructions.unshift(instruction);
        });
      }

      const txDescription = shouldPayFees
        ? 'Fees + Compute + ATAs + Pool Creation'
        : 'Compute + ATAs + Pool Creation (fees already paid)';
      console.log(`[POOL TX] Transaction with ${initPoolTx.instructions.length} instructions: ${txDescription}`);

      // Send and confirm pool creation transaction
      const poolSignature = await sendTransaction(initPoolTx, connection, {
        skipPreflight: true,
        maxRetries: 5,
      });
      console.log('[STEP 2/2] Pool creation transaction sent:', poolSignature);

      // Wait for transaction propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      await confirmTransactionWithRetry(connection, poolSignature, { maxRetries: 10 });
      console.log('[STEP 2/2] Pool created successfully!');

      // Derive pool address
      const [poolAddress] = deriveCustomizablePermissionlessLbPair(
        baseMint,
        quoteMint,
        dlmmProgramId
      );

      // Record referral earning if applicable (and fees were paid in this transaction)
      if (shouldPayFees && referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          poolSignature
        );
      }

      // Track pool creation transaction
      addTransaction({
        signature: poolSignature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-create-pool',
        status: 'success',
        params,
        poolAddress: poolAddress.toString(),
        tokenAddress: baseMint.toString(),
        platformFee: shouldPayFees ? platformFeePaid : 0,
      });

      return {
        success: true,
        signature: poolSignature,
        poolAddress: poolAddress.toString(),
        baseMint: baseMint.toString(),
        tokenCreated: !!params.createBaseToken,
      };
    } catch (error: any) {
      console.error('Error creating DLMM pool:', error);

      // Provide more specific error messages
      if (error.message?.includes('owner')) {
        throw new Error('Token account error. If creating a new token, the token may not have been confirmed yet. Please try again.');
      }

      throw new Error(error.message || 'Failed to create DLMM pool');
    }
  };

  /**
   * Seed liquidity using LFG (Launch Fair Guarantee) strategy
   * Multi-phase transaction execution
   */
  const seedLiquidityLFG = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Seeding liquidity (LFG) with params:', params);

    try {
      // Validate parameters
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');
      const minPrice = validatePrice(params.minPrice, 'Min price');
      const maxPrice = validatePrice(params.maxPrice, 'Max price');
      const curvature = validateCurvature(params.curvature);
      const seedAmount = validateBN(params.seedAmount, 'Seed amount');

      // Default positionOwner and feeOwner to connected wallet if not provided
      const positionOwner = params.positionOwner
        ? validatePublicKey(params.positionOwner, 'Position owner')
        : publicKey;
      const feeOwner = params.feeOwner
        ? validatePublicKey(params.feeOwner, 'Fee owner')
        : positionOwner;

      const lockReleasePoint = new BN(params.lockReleasePoint || 0);

      if (maxPrice <= minPrice) {
        throw new Error('Max price must be greater than min price');
      }

      // PRE-FLIGHT CHECK: Verify wallet has sufficient SOL balance
      console.log('Checking wallet balance...');
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / 1e9;
      console.log(`Wallet SOL balance: ${solBalanceInSol.toFixed(4)} SOL`);

      // Estimate minimum required SOL:
      // - Bin arrays rent: ~0.2-0.3 SOL (depends on price range)
      // - Position rent: ~0.02 SOL
      // - Transaction fees: ~0.01 SOL
      // - Platform fees: 0.0007 SOL
      // - Buffer: 0.1 SOL
      const MINIMUM_REQUIRED_SOL = 0.5;

      if (solBalanceInSol < MINIMUM_REQUIRED_SOL) {
        throw new Error(
          `Insufficient SOL balance. You have ${solBalanceInSol.toFixed(4)} SOL but need at least ${MINIMUM_REQUIRED_SOL} SOL for:\n` +
          `  • Bin array rent (~0.2-0.3 SOL)\n` +
          `  • Position rent (~0.02 SOL)\n` +
          `  • Transaction fees (~0.01 SOL)\n` +
          `  • Platform fees (0.0007 SOL)\n` +
          `  • Buffer (0.1 SOL)\n` +
          `Please fund your wallet with more SOL and try again.`
        );
      }

      // PRE-FLIGHT CHECK: Verify wallet has sufficient base token balance
      console.log('Checking base token balance...');
      try {
        const baseTokenAccount = await getAssociatedTokenAddress(baseMint, publicKey);
        const baseTokenAccountInfo = await connection.getAccountInfo(baseTokenAccount);

        if (!baseTokenAccountInfo) {
          throw new Error(
            `No token account found for base token ${baseMint.toString()}.\n` +
            `You need to hold the base token before seeding liquidity.`
          );
        }

        const baseTokenBalance = await connection.getTokenAccountBalance(baseTokenAccount);
        const baseTokenAmount = new BN(baseTokenBalance.value.amount);

        console.log(`Base token balance: ${baseTokenBalance.value.uiAmountString} tokens`);

        if (baseTokenAmount.lt(seedAmount)) {
          throw new Error(
            `Insufficient base token balance. You have ${baseTokenBalance.value.uiAmountString} tokens ` +
            `but need ${(seedAmount.toNumber() / 1e9).toFixed(4)} tokens to seed liquidity.\n` +
            `Please acquire more base tokens and try again.`
          );
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Insufficient')) {
          throw error; // Re-throw our custom errors
        }
        console.warn('Could not verify base token balance:', error);
        // Continue anyway - the transaction will fail if balance is insufficient
      }

      // Generate required keypairs for transaction signing
      const baseKeypair = Keypair.generate();
      const operatorKeypair = Keypair.generate();

      // Derive pool address
      const dlmmProgramId = new PublicKey(
        DLMM_PROGRAM_IDS[network as keyof typeof DLMM_PROGRAM_IDS]
      );
      const [poolAddress] = deriveCustomizablePermissionlessLbPair(
        baseMint,
        quoteMint,
        dlmmProgramId
      );

      console.log('Pool address:', poolAddress.toString());

      // PRE-FLIGHT: Calculate rent for base account initialization
      // Position accounts in DLMM need ~1000 bytes (conservative estimate)
      const POSITION_ACCOUNT_SIZE = 1000;
      const baseAccountRent = await connection.getMinimumBalanceForRentExemption(POSITION_ACCOUNT_SIZE);
      console.log(`Base account rent: ${(baseAccountRent / 1e9).toFixed(6)} SOL for ${POSITION_ACCOUNT_SIZE} bytes`);

      // PRE-FLIGHT CHECK: Verify pool exists on-chain
      console.log('Checking if pool exists...');
      const poolAccountInfo = await connection.getAccountInfo(poolAddress);

      if (!poolAccountInfo) {
        throw new Error(
          `Pool does not exist at address ${poolAddress.toString()}\n\n` +
          `This usually means:\n` +
          `  • The pool was not created yet\n` +
          `  • You're using the wrong base/quote token pair\n` +
          `  • The pool address is incorrect\n\n` +
          `Solutions:\n` +
          `  1. Create the pool first using "Create Pool" page\n` +
          `  2. Verify the base and quote token addresses are correct\n` +
          `  3. Check that the pool exists on Solana Explorer:\n` +
          `     https://explorer.solana.com/address/${poolAddress.toString()}?cluster=${network}\n\n` +
          `Base Token: ${baseMint.toString()}\n` +
          `Quote Token: ${quoteMint.toString()}`
        );
      }
      console.log('Pool exists ✓');

      // Create DLMM instance
      const dlmmInstance = await DLMM.create(connection, poolAddress, {
        cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
      });

      // PRE-FLIGHT CHECK: Verify pool is not activated
      console.log('Checking pool activation status...');

      // Access pool state directly from lbPair account data
      const poolState = dlmmInstance.lbPair;
      const activationPoint = poolState.activationPoint;
      const currentSlot = await connection.getSlot();

      // Pool is activated if activationPoint is set and we're past that slot
      const isActivated = activationPoint && activationPoint.toNumber() > 0 && currentSlot >= activationPoint.toNumber();

      if (isActivated) {
        throw new Error(
          `Cannot seed LFG liquidity: Pool is already activated\n\n` +
          `The seedLiquidityLFG command only works on pools that are NOT yet activated.\n\n` +
          `Pool Address: ${poolAddress.toString()}\n` +
          `Activation Point: ${activationPoint.toString()} (current slot: ${currentSlot})\n\n` +
          `Solutions:\n` +
          `  1. Use "Seed Liquidity (Single Bin)" instead for activated pools\n` +
          `  2. Use "Add Liquidity" to add to existing positions\n` +
          `  3. Create a new pool if you need LFG seeding\n\n` +
          `Learn more: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions`
        );
      }
      console.log('Pool is not activated ✓ (activation point:', activationPoint ? activationPoint.toString() : 'not set', ')');

      // Call seedLiquidity SDK method with generated keypairs
      const {
        sendPositionOwnerTokenProveIxs,
        initializeBinArraysAndPositionIxs,
        addLiquidityIxs,
      } = await dlmmInstance.seedLiquidity(
        positionOwner,
        seedAmount,
        curvature,
        minPrice,
        maxPrice,
        baseKeypair.publicKey, // base (ephemeral keypair)
        publicKey, // payer
        feeOwner,
        operatorKeypair.publicKey, // operator (ephemeral keypair)
        lockReleasePoint,
        true // shouldSeedPositionOwner
      );

      const signatures: string[] = [];

      // Get fee breakdown for tracking
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const platformFeePaid = feeBreakdown.total.lamports;

      // Get fee instructions to prepend atomically
      console.log('Preparing platform fee instructions...');
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Phase 1: Send position owner token prove WITH ATOMIC FEES (if needed)
      if (sendPositionOwnerTokenProveIxs.length > 0) {
        console.log('Phase 1: Sending position owner token prove with atomic fees...');
        const tx1 = new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
          .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 }))
          .add(...sendPositionOwnerTokenProveIxs);

        // ATOMIC: Prepend fee instructions to first transaction
        if (feeInstructions.length > 0) {
          feeInstructions.reverse().forEach((ix) => {
            tx1.instructions.unshift(ix);
          });
        }

        const sig1 = await sendTransaction(tx1, connection, {
          signers: [baseKeypair, operatorKeypair],
          skipPreflight: true,
          maxRetries: 5,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        await confirmTransactionWithRetry(connection, sig1, { maxRetries: 10 });
        signatures.push(sig1);
        console.log('Phase 1 complete with atomic fees:', sig1);

        // Record referral earning if applicable
        if (referrerWallet && feeBreakdown.referral.lamports > 0) {
          recordEarning(
            feeBreakdown.referral.lamports,
            publicKey.toBase58(),
            sig1
          );
        }
      }

      // Phase 2: Initialize bin arrays and position (sequential to prevent wallet conflicts)
      console.log('Phase 2: Initializing bin arrays and position...');
      let feesAlreadyPaid = sendPositionOwnerTokenProveIxs.length > 0;

      for (let i = 0; i < initializeBinArraysAndPositionIxs.length; i++) {
        const groupIx = initializeBinArraysAndPositionIxs[i];
        const tx = new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }))
          .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 }))
          .add(...groupIx);

        // CRITICAL: Add base account creation to FIRST Phase 2 transaction
        // This fixes error 3012 (account not initialized) at instruction #6
        if (i === 0) {
          const createBaseAccountIx = SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: baseKeypair.publicKey,
            lamports: baseAccountRent,
            space: POSITION_ACCOUNT_SIZE,
            programId: dlmmProgramId,
          });
          tx.instructions.unshift(createBaseAccountIx);
          console.log('Added base account creation instruction (rent:', (baseAccountRent / 1e9).toFixed(6), 'SOL)');
        }

        // ATOMIC: If fees not yet paid (Phase 1 was skipped), add to FIRST Phase 2 transaction
        const addingFeesHere = !feesAlreadyPaid && i === 0 && feeInstructions.length > 0;
        if (addingFeesHere) {
          feeInstructions.reverse().forEach((ix) => {
            tx.instructions.unshift(ix);
          });
          console.log('Adding atomic fees to first Phase 2 transaction');
        }

        const sig = await sendTransaction(tx, connection, {
          signers: [baseKeypair, operatorKeypair],
          skipPreflight: true,
          maxRetries: 5,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        await confirmTransactionWithRetry(connection, sig, { maxRetries: 10 });
        signatures.push(sig);
        console.log(`Bin array/position initialized (${i + 1}/${initializeBinArraysAndPositionIxs.length}):`, sig);

        // Record referral earning on first Phase 2 transaction if fees added here
        if (addingFeesHere && referrerWallet && feeBreakdown.referral.lamports > 0) {
          recordEarning(
            feeBreakdown.referral.lamports,
            publicKey.toBase58(),
            sig
          );
          feesAlreadyPaid = true;
        }

        // Add 200ms delay between transactions to allow state settlement
        if (i < initializeBinArraysAndPositionIxs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      console.log(`Phase 2 complete: ${initializeBinArraysAndPositionIxs.length} transactions`);

      // Phase 3: Add liquidity (sequential)
      console.log('Phase 3: Adding liquidity...');
      for (let i = 0; i < addLiquidityIxs.length; i++) {
        const groupIx = addLiquidityIxs[i];
        const tx = new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }))
          .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 }))
          .add(...groupIx);

        const sig = await sendTransaction(tx, connection, {
          signers: [baseKeypair, operatorKeypair],
          skipPreflight: true,
          maxRetries: 5,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        await confirmTransactionWithRetry(connection, sig, { maxRetries: 10 });
        signatures.push(sig);
        console.log(`Liquidity added (${i + 1}/${addLiquidityIxs.length}):`, sig);

        // Add 200ms delay between transactions
        if (i < addLiquidityIxs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('LFG seeding complete!');

      // Track transaction in history
      addTransaction({
        signature: signatures[signatures.length - 1],
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-seed-lfg',
        status: 'success',
        params,
        poolAddress: poolAddress.toString(),
        platformFee: platformFeePaid,
      });

      return {
        success: true,
        signatures,
        poolAddress: poolAddress.toString(),
      };
    } catch (error: any) {
      console.error('Error seeding LFG liquidity:', error);

      // Parse transaction error to provide helpful messages
      const errorString = JSON.stringify(error);
      const errorMessage = error.message || errorString;

      // Extract transaction signature if available for debugging
      const signature = error.signature || error.txid || null;
      const solscanUrl = signature
        ? `https://solscan.io/tx/${signature}?cluster=${network}`
        : null;

      // Build debugging footer
      const debugInfo = signature
        ? `\n\n🔍 Debug Transaction:\n` +
          `  • Solscan: ${solscanUrl}\n` +
          `  • CLI: solana confirm -v ${signature} --url ${network}\n` +
          `  • Signature: ${signature}`
        : '';


      // Check for specific DLMM program errors
      if (errorString.includes('Custom":3012') || errorMessage.includes('3012')) {
        // Error 3012: Insufficient funds for bin array initialization
        const solBalance = await connection.getBalance(publicKey);
        const solBalanceInSol = (solBalance / 1e9).toFixed(4);

        throw new Error(
          `Insufficient funds for transaction (Error 3012).\n\n` +
          `Current SOL balance: ${solBalanceInSol} SOL\n\n` +
          `Common causes:\n` +
          `  • Bin array initialization: Each bin array costs ~0.075 SOL rent (non-refundable if you're first to seed those bins)\n` +
          `  • Wide price range: Wider ranges require more bin arrays, multiplying costs\n` +
          `  • Pool activation timing: Verify pool is not already activated\n` +
          `  • Insufficient base token: Check you have enough base tokens to seed\n` +
          `  • Transaction fees: ~0.01-0.02 SOL for transaction execution\n\n` +
          `Recommended fixes:\n` +
          `  1. Reduce price range: Try a narrower range (e.g., 50% instead of 500% spread)\n` +
          `  2. Check pool status: Ensure pool is not activated yet (use "Set Pool Status" page)\n` +
          `  3. Verify base tokens: Confirm you have sufficient base token balance\n` +
          `  4. Increase SOL: Add more SOL if balance < 0.5 SOL\n` +
          `  5. On devnet: 'solana airdrop 1 ${publicKey.toString()} --url devnet'\n\n` +
          `Learn more: https://docs.meteora.ag/developer-guide/quick-launch/dlmm-launch-pool${debugInfo}`
        );
      } else if (errorString.includes('Custom":3001') || errorMessage.includes('3001')) {
        throw new Error(
          `Invalid bin array access (Error 3001).\n\n` +
          `This usually means:\n` +
          `  • The pool was not created properly\n` +
          `  • The bin step doesn't align with your price range\n` +
          `  • The price range is too wide\n\n` +
          `Solutions:\n` +
          `  1. Verify the pool exists: ${errorMessage.includes('poolAddress') ? 'Check pool address' : 'Pool may not be created'}\n` +
          `  2. Try a narrower price range (e.g., 0.001-0.01 instead of 1-2)\n` +
          `  3. Check the pool's bin step configuration${debugInfo}`
        );
      } else if (errorMessage.includes('Simulation failed') || errorMessage.includes('Transaction failed')) {
        throw new Error(
          `Transaction simulation/execution failed.\n\n` +
          `Error details: ${errorMessage}\n\n` +
          `Common causes:\n` +
          `  • Insufficient SOL or token balance\n` +
          `  • Invalid price range for the pool's bin step\n` +
          `  • Network congestion or RPC issues\n` +
          `  • Pool configuration mismatch\n\n` +
          `Solutions:\n` +
          `  1. Check your SOL balance (need ~0.5 SOL minimum)\n` +
          `  2. Verify you have enough base tokens to seed\n` +
          `  3. Try reducing the price range\n` +
          `  4. Wait a moment and retry${debugInfo}`
        );
      }

      // Default error message with debug info
      throw new Error((errorMessage || 'Failed to seed LFG liquidity') + debugInfo);
    }
  };

  /**
   * Seed liquidity in a single bin at a specific price
   */
  const seedLiquiditySingleBin = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Seeding liquidity (single bin) with params:', params);

    try {
      // Validate parameters
      const baseMint = validatePublicKey(params.baseMint, 'Base mint');
      const quoteMint = validatePublicKey(params.quoteMint, 'Quote mint');
      const price = validatePrice(params.price, 'Price');
      const roundingUp = params.priceRounding === 'up';
      const seedAmount = validateBN(params.seedAmount, 'Seed amount');

      // Default positionOwner and feeOwner to connected wallet if not provided
      const positionOwner = params.positionOwner
        ? validatePublicKey(params.positionOwner, 'Position owner')
        : publicKey;
      const feeOwner = params.feeOwner
        ? validatePublicKey(params.feeOwner, 'Fee owner')
        : positionOwner;

      const lockReleasePoint = new BN(params.lockReleasePoint || 0);

      // PRE-FLIGHT CHECK: Verify wallet has sufficient SOL balance
      console.log('Checking wallet balance...');
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / 1e9;
      console.log(`Wallet SOL balance: ${solBalanceInSol.toFixed(4)} SOL`);

      const MINIMUM_REQUIRED_SOL = 0.3; // Single bin requires less than LFG

      if (solBalanceInSol < MINIMUM_REQUIRED_SOL) {
        throw new Error(
          `Insufficient SOL balance. You have ${solBalanceInSol.toFixed(4)} SOL but need at least ${MINIMUM_REQUIRED_SOL} SOL for:\n` +
          `  • Position rent (~0.02 SOL)\n` +
          `  • Transaction fees (~0.01 SOL)\n` +
          `  • Platform fees (0.0007 SOL)\n` +
          `  • Buffer (0.1 SOL)\n` +
          `Please fund your wallet with more SOL and try again.`
        );
      }

      // PRE-FLIGHT CHECK: Verify wallet has sufficient base token balance
      console.log('Checking base token balance...');
      try {
        const baseTokenAccount = await getAssociatedTokenAddress(baseMint, publicKey);
        const baseTokenAccountInfo = await connection.getAccountInfo(baseTokenAccount);

        if (!baseTokenAccountInfo) {
          throw new Error(
            `No token account found for base token ${baseMint.toString()}.\n` +
            `You need to hold the base token before seeding liquidity.`
          );
        }

        const baseTokenBalance = await connection.getTokenAccountBalance(baseTokenAccount);
        const baseTokenAmount = new BN(baseTokenBalance.value.amount);

        console.log(`Base token balance: ${baseTokenBalance.value.uiAmountString} tokens`);

        if (baseTokenAmount.lt(seedAmount)) {
          throw new Error(
            `Insufficient base token balance. You have ${baseTokenBalance.value.uiAmountString} tokens ` +
            `but need ${(seedAmount.toNumber() / 1e9).toFixed(4)} tokens to seed liquidity.\n` +
            `Please acquire more base tokens and try again.`
          );
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Insufficient')) {
          throw error;
        }
        console.warn('Could not verify base token balance:', error);
      }

      // Generate required keypairs for transaction signing
      const baseKeypair = Keypair.generate();
      const operatorKeypair = Keypair.generate();

      // Derive pool address
      const dlmmProgramId = new PublicKey(
        DLMM_PROGRAM_IDS[network as keyof typeof DLMM_PROGRAM_IDS]
      );
      const [poolAddress] = deriveCustomizablePermissionlessLbPair(
        baseMint,
        quoteMint,
        dlmmProgramId
      );

      console.log('Pool address:', poolAddress.toString());

      // PRE-FLIGHT: Calculate rent for base account initialization
      // Position accounts in DLMM need ~1000 bytes (conservative estimate)
      const POSITION_ACCOUNT_SIZE = 1000;
      const baseAccountRent = await connection.getMinimumBalanceForRentExemption(POSITION_ACCOUNT_SIZE);
      console.log(`Base account rent: ${(baseAccountRent / 1e9).toFixed(6)} SOL for ${POSITION_ACCOUNT_SIZE} bytes`);

      // PRE-FLIGHT CHECK: Verify pool exists on-chain
      console.log('Checking if pool exists...');
      const poolAccountInfo = await connection.getAccountInfo(poolAddress);

      if (!poolAccountInfo) {
        throw new Error(
          `Pool does not exist at address ${poolAddress.toString()}\n\n` +
          `This usually means:\n` +
          `  • The pool was not created yet\n` +
          `  • You're using the wrong base/quote token pair\n` +
          `  • The pool address is incorrect\n\n` +
          `Solutions:\n` +
          `  1. Create the pool first using "Create Pool" page\n` +
          `  2. Verify the base and quote token addresses are correct\n` +
          `  3. Check that the pool exists on Solana Explorer:\n` +
          `     https://explorer.solana.com/address/${poolAddress.toString()}?cluster=${network}\n\n` +
          `Base Token: ${baseMint.toString()}\n` +
          `Quote Token: ${quoteMint.toString()}`
        );
      }
      console.log('Pool exists ✓');

      // Create DLMM instance
      const dlmmInstance = await DLMM.create(connection, poolAddress, {
        cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
      });

      // Call seedLiquiditySingleBin SDK method with generated keypairs
      const { instructions } = await dlmmInstance.seedLiquiditySingleBin(
        publicKey, // payer
        baseKeypair.publicKey, // base (ephemeral keypair)
        seedAmount,
        price,
        roundingUp,
        positionOwner,
        feeOwner,
        operatorKeypair.publicKey, // operator (ephemeral keypair)
        lockReleasePoint,
        true // shouldSeedPositionOwner
      );

      const signatures: string[] = [];

      // Get fee breakdown for tracking
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const platformFeePaid = feeBreakdown.total.lamports;

      // Get fee instructions to prepend atomically
      console.log('Preparing platform fee instructions...');
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Build main transaction with additional signers
      const transaction = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000_000 }))
        .add(...instructions);

      // CRITICAL: Prepend base account creation instruction
      // This fixes error 3012 (account not initialized)
      const createBaseAccountIx = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: baseKeypair.publicKey,
        lamports: baseAccountRent,
        space: POSITION_ACCOUNT_SIZE,
        programId: dlmmProgramId,
      });
      transaction.instructions.unshift(createBaseAccountIx);
      console.log('Added base account creation instruction (rent:', (baseAccountRent / 1e9).toFixed(6), 'SOL)');

      // ATOMIC: Prepend fee instructions to main transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          transaction.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to transaction');
      }

      // Send single atomic transaction with additional signers
      const signature = await sendTransaction(transaction, connection, {
        signers: [baseKeypair, operatorKeypair],
        skipPreflight: true,
        maxRetries: 5,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      await confirmTransactionWithRetry(connection, signature, { maxRetries: 10 });
      signatures.push(signature);

      // Record referral earning if applicable
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      console.log('Single bin seeding complete:', signature);

      // Track transaction in history
      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-seed-single',
        status: 'success',
        params,
        poolAddress: poolAddress.toString(),
        platformFee: platformFeePaid,
      });

      return {
        success: true,
        signature,
        signatures,
        poolAddress: poolAddress.toString(),
      };
    } catch (error: any) {
      console.error('Error seeding single bin liquidity:', error);

      // Parse transaction error to provide helpful messages
      const errorString = JSON.stringify(error);
      const errorMessage = error.message || errorString;

      // Check for specific DLMM program errors
      if (errorString.includes('Custom":3012') || errorMessage.includes('3012')) {
        const solBalance = await connection.getBalance(publicKey);
        const solBalanceInSol = (solBalance / 1e9).toFixed(4);

        throw new Error(
          `Insufficient funds to complete transaction (Error 3012).\n\n` +
          `Current SOL balance: ${solBalanceInSol} SOL\n\n` +
          `Required SOL for single bin seeding:\n` +
          `  • Position account rent: ~0.02 SOL (refundable when closed)\n` +
          `  • Transaction fees: ~0.01 SOL (non-refundable)\n` +
          `  • Platform fees: 0.0007 SOL (non-refundable)\n` +
          `  • Recommended minimum: 0.3 SOL\n\n` +
          `Solutions:\n` +
          `  1. Fund your wallet with at least 0.3 SOL\n` +
          `  2. On devnet: Use 'solana airdrop 1 ${publicKey.toString()} --url devnet'\n` +
          `  3. Check you have sufficient base token balance as well`
        );
      } else if (errorString.includes('Custom":3001') || errorMessage.includes('3001')) {
        throw new Error(
          `Invalid bin array access (Error 3001).\n\n` +
          `This usually means:\n` +
          `  • The pool was not created properly\n` +
          `  • The bin doesn't exist for the specified price\n` +
          `  • The bin step doesn't align with your price\n\n` +
          `Solutions:\n` +
          `  1. Verify the pool exists and is properly configured\n` +
          `  2. Try a different price that aligns with the bin step\n` +
          `  3. Check the pool's bin step configuration`
        );
      } else if (errorMessage.includes('Simulation failed') || errorMessage.includes('Transaction failed')) {
        throw new Error(
          `Transaction simulation/execution failed.\n\n` +
          `Error details: ${errorMessage}\n\n` +
          `Common causes:\n` +
          `  • Insufficient SOL or token balance\n` +
          `  • Invalid price for the pool's bin step\n` +
          `  • Network congestion or RPC issues\n\n` +
          `Solutions:\n` +
          `  1. Check your SOL balance (need ~0.3 SOL minimum)\n` +
          `  2. Verify you have enough base tokens to seed\n` +
          `  3. Wait a moment and retry`
        );
      }

      throw new Error(errorMessage || 'Failed to seed single bin liquidity');
    }
  };

  /**
   * Set pool status (enabled/disabled)
   * Only pool creator can change status
   */
  const setPoolStatus = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log('Setting pool status with params:', params);

    try {
      // Validate parameters
      const poolAddress = validatePublicKey(params.poolAddress, 'Pool address');
      const enabled = params.status === 'enabled';

      console.log(`Setting pool status to: ${enabled ? 'enabled' : 'disabled'}`);

      // PRE-FLIGHT CHECK: Verify wallet has sufficient SOL for transaction
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / 1e9;
      console.log(`Wallet SOL balance: ${solBalanceInSol.toFixed(4)} SOL`);

      if (solBalanceInSol < 0.01) {
        throw new Error(
          `Insufficient SOL balance. You have ${solBalanceInSol.toFixed(4)} SOL but need at least 0.01 SOL for transaction fees.`
        );
      }

      // Create DLMM instance
      const dlmmInstance = await DLMM.create(connection, poolAddress, {
        cluster: network as 'mainnet-beta' | 'devnet' | 'localhost',
      });

      // PRE-FLIGHT CHECK: Verify pool activation point has passed
      console.log('Checking pool activation status...');
      await dlmmInstance.refetchStates();
      const poolState = dlmmInstance.lbPair;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Check if pool has an activation point and if it has passed
      if (poolState.activationPoint && poolState.activationPoint.toNumber() > 0) {
        const activationTime = poolState.activationPoint.toNumber();
        if (currentTimestamp < activationTime) {
          const timeUntilActivation = activationTime - currentTimestamp;
          const hoursUntil = Math.floor(timeUntilActivation / 3600);
          const minutesUntil = Math.floor((timeUntilActivation % 3600) / 60);

          throw new Error(
            `Pool not yet activated. Cannot change status until activation point has passed.\n\n` +
            `Current time: ${new Date(currentTimestamp * 1000).toISOString()}\n` +
            `Activation time: ${new Date(activationTime * 1000).toISOString()}\n` +
            `Time remaining: ${hoursUntil}h ${minutesUntil}m\n\n` +
            `Please wait until the activation point before changing pool status.`
          );
        }
        console.log('Pool activation point has passed ✓');
      } else {
        console.log('Pool has no activation point (can be toggled immediately) ✓');
      }

      // PRE-FLIGHT CHECK: Verify wallet is the pool creator (if creator control enabled)
      const lbPair = dlmmInstance.lbPair;
      console.log('Pool creator:', lbPair.creator.toString());
      console.log('Connected wallet:', publicKey.toString());
      console.log('Creator control enabled:', lbPair.creatorPoolOnOffControl);

      if (lbPair.creatorPoolOnOffControl && !lbPair.creator.equals(publicKey)) {
        throw new Error(
          `Only the pool creator can change pool status.\n\n` +
          `Pool creator: ${lbPair.creator.toString()}\n` +
          `Your wallet: ${publicKey.toString()}\n\n` +
          `You must connect with the wallet that created this pool.`
        );
      }
      console.log('Creator authorization verified ✓');

      // Call setPairStatusPermissionless SDK method
      const transaction = await dlmmInstance.setPairStatusPermissionless(
        enabled,
        publicKey // creator (must be pool creator)
      );

      const signatures: string[] = [];

      // Get fee breakdown for tracking
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const platformFeePaid = feeBreakdown.total.lamports;

      // Get fee instructions to prepend atomically
      console.log('Preparing platform fee instructions...');
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Add compute budget
      transaction.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 3_000_000 })
      );

      // ATOMIC: Prepend fee instructions to status change transaction
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          transaction.instructions.unshift(ix);
        });
        console.log('Fee instructions prepended atomically to transaction');
      }

      // Send single atomic transaction
      const signature = await sendTransaction(transaction, connection);
      await confirmTransactionWithRetry(connection, signature);
      signatures.push(signature);

      // Record referral earning if applicable
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      console.log('Pool status updated:', signature);

      // Track transaction in history
      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-set-status',
        status: 'success',
        params,
        poolAddress: poolAddress.toString(),
        platformFee: platformFeePaid,
      });

      return {
        success: true,
        signature,
        signatures,
        status: enabled ? 'enabled' : 'disabled',
      };
    } catch (error: any) {
      console.error('Error setting pool status:', error);

      const errorString = JSON.stringify(error);
      const errorMessage = error.message || errorString;
      const errorName = error.name || '';

      // WalletSendTransactionError - wallet failed to send transaction
      if (errorName.includes('WalletSendTransactionError') || errorMessage.includes('WalletSendTransactionError')) {
        throw new Error(
          `Failed to send transaction to the network.\n\n` +
          `Common causes:\n` +
          `  • Pool not yet activated (activation point hasn't passed)\n` +
          `  • Wrong wallet connected (must be pool creator)\n` +
          `  • Insufficient SOL for transaction fees\n` +
          `  • Network or RPC issues\n\n` +
          `Solutions:\n` +
          `  1. Check if the pool's activation point has passed\n` +
          `  2. Verify you're using the wallet that created the pool\n` +
          `  3. Ensure you have at least 0.01 SOL for fees\n` +
          `  4. Try again in a moment (network congestion)\n\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Creator/authority permission errors
      if (errorMessage.includes('creator') || errorMessage.includes('authority') || errorMessage.includes('permission')) {
        throw new Error(
          `Permission denied: Only the pool creator can change pool status.\n\n` +
          `Solutions:\n` +
          `  1. Connect with the wallet that created this pool\n` +
          `  2. Verify the pool was created with creatorPoolOnOffControl enabled\n` +
          `  3. Check the pool creator address matches your connected wallet\n\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Activation point errors
      if (errorMessage.includes('activation') || errorMessage.includes('ActivationPointNotReached')) {
        throw new Error(
          `Pool activation point has not been reached yet.\n\n` +
          `You can only enable/disable trading after the pool's activation point.\n` +
          `Check the pool details to see when it will be activated.\n\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Transaction size errors
      if (errorMessage.includes('Transaction too large') || errorMessage.includes('oversized')) {
        throw new Error(
          `Transaction is too large to send.\n\n` +
          `This is unusual for a status change. Please contact support.\n\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Simulation failed
      if (errorMessage.includes('Simulation failed') || errorMessage.includes('Transaction failed')) {
        throw new Error(
          `Transaction simulation failed.\n\n` +
          `Possible causes:\n` +
          `  • Pool state has changed since you loaded the page\n` +
          `  • Invalid pool address\n` +
          `  • Pool was closed or deleted\n\n` +
          `Solutions:\n` +
          `  1. Refresh the page and try again\n` +
          `  2. Verify the pool address is correct\n` +
          `  3. Check the pool still exists on-chain\n\n` +
          `Error details: ${errorMessage}`
        );
      }

      // Default error
      throw new Error(errorMessage || 'Failed to set pool status');
    }
  };

  /**
   * Fetch all DLMM positions for the connected wallet
   */
  const fetchUserPositions = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Fetching user positions...');

    try {
      // Use DLMM SDK method to get all positions for user
      const positions = await DLMM.getAllLbPairPositionsByUser(
        connection,
        publicKey,
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      console.log(`[DLMM] Found ${positions.size} positions`);

      // Convert Map to array of positions
      const userPositions = [];
      for (const [positionKey, positionInfo] of positions.entries()) {
        try {
          const { lbPair, tokenX, tokenY, lbPairPositionsData } = positionInfo;

          // Calculate total amounts from all bins
          let totalBaseAmount = 0;
          let totalQuoteAmount = 0;
          let totalUnclaimedFeesBase = 0;
          let totalUnclaimedFeesQuote = 0;

          // TokenReserve might have different property names depending on SDK version
          const tokenXDecimals = (tokenX as any).decimals ?? (tokenX as any).decimal ?? 9;
          const tokenYDecimals = (tokenY as any).decimals ?? (tokenY as any).decimal ?? 9;

          for (const position of lbPairPositionsData) {
            // Sum up amounts across all bins
            totalBaseAmount += Number(position.positionData.totalXAmount) / Math.pow(10, tokenXDecimals);
            totalQuoteAmount += Number(position.positionData.totalYAmount) / Math.pow(10, tokenYDecimals);

            // Sum up unclaimed fees
            totalUnclaimedFeesBase += Number(position.positionData.feeX) / Math.pow(10, tokenXDecimals);
            totalUnclaimedFeesQuote += Number(position.positionData.feeY) / Math.pow(10, tokenYDecimals);
          }

          // Handle different property names from SDK
          const poolAddress = (lbPair as any).publicKey?.toString() || (lbPair as any).address?.toString() || '';
          const baseMint = (tokenX as any).publicKey?.toString() || (tokenX as any).address?.toString() || (tokenX as any).mint?.toString() || '';
          const quoteMint = (tokenY as any).publicKey?.toString() || (tokenY as any).address?.toString() || (tokenY as any).mint?.toString() || '';
          const baseSymbol = (tokenX as any).symbol || (tokenX as any).name || 'Token X';
          const quoteSymbol = (tokenY as any).symbol || (tokenY as any).name || 'Token Y';

          userPositions.push({
            positionKey,
            poolAddress,
            baseMint,
            quoteMint,
            baseSymbol,
            quoteSymbol,
            baseAmount: totalBaseAmount,
            quoteAmount: totalQuoteAmount,
            unclaimedFeesBase: totalUnclaimedFeesBase,
            unclaimedFeesQuote: totalUnclaimedFeesQuote,
            binPositions: lbPairPositionsData.map((p) => ({
              binId: (p as any).binId ?? 0,
              baseAmount: Number(p.positionData.totalXAmount) / Math.pow(10, tokenXDecimals),
              quoteAmount: Number(p.positionData.totalYAmount) / Math.pow(10, tokenYDecimals),
            })),
          });
        } catch (error) {
          console.warn('[DLMM] Failed to parse position:', error);
          // Continue with other positions
        }
      }

      console.log(`[DLMM] Successfully parsed ${userPositions.length} positions`);
      return userPositions;
    } catch (error: any) {
      console.error('[DLMM] Error fetching positions:', error);

      // Handle known SDK issue with undefined feeAmountXPerTokenStored
      if (error.message?.includes('feeAmountXPerTokenStored')) {
        console.warn('[DLMM] Known SDK issue detected - returning empty positions');
        return [];
      }

      throw new Error(error.message || 'Failed to fetch DLMM positions');
    }
  };

  /**
   * Initialize new position and add liquidity using strategy
   * For users adding liquidity to an existing DLMM pool
   * Supports both single-sided and dual-sided deposits
   */
  const initializePositionAndAddLiquidityByStrategy = async (params: {
    poolAddress: string;
    strategy: 'spot' | 'curve' | 'bid-ask';
    minPrice: number;
    maxPrice: number;
    amount?: number; // Amount in UI units (for single-sided, DEPRECATED)
    slippage?: number; // Slippage tolerance (0.01 = 1%, default 0.01)
    tokenMint?: string; // Which token to deposit (for single-sided, DEPRECATED)
    // NEW: Support for dual-sided deposits
    baseAmount?: number; // Amount of base token (Token X) in UI units
    quoteAmount?: number; // Amount of quote token (Token Y) in UI units
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Initializing position and adding liquidity...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Refresh pool state to access lbPair properties
      await dlmmPool.refetchStates();

      // Get token decimals from the mint accounts
      const tokenXMintInfo = await getMint(connection, dlmmPool.lbPair.tokenXMint);
      const tokenYMintInfo = await getMint(connection, dlmmPool.lbPair.tokenYMint);
      const tokenXDecimals = tokenXMintInfo.decimals;
      const tokenYDecimals = tokenYMintInfo.decimals;

      console.log('[DLMM] Token decimals:', {
        tokenX: tokenXDecimals,
        tokenY: tokenYDecimals,
      });

      // Determine if this is dual-sided or single-sided deposit
      const isDualSided = !!(params.baseAmount && params.quoteAmount && params.baseAmount > 0 && params.quoteAmount > 0);
      const isSingleSided = !isDualSided && ((params.amount && params.amount > 0) || (params.baseAmount && params.baseAmount > 0) || (params.quoteAmount && params.quoteAmount > 0));

      console.log('[DLMM] Deposit type:', isDualSided ? 'DUAL-SIDED (both tokens)' : 'SINGLE-SIDED (one token)');

      let baseAmountBN: BN;
      let quoteAmountBN: BN;

      if (isDualSided) {
        // TWO-SIDED: Both base and quote amounts provided
        // Use correct decimals for each token
        baseAmountBN = new BN(Math.floor(params.baseAmount! * Math.pow(10, tokenXDecimals)));
        quoteAmountBN = new BN(Math.floor(params.quoteAmount! * Math.pow(10, tokenYDecimals)));
        console.log('[DLMM] Base Amount:', params.baseAmount, '→', baseAmountBN.toString(), 'lamports');
        console.log('[DLMM] Quote Amount:', params.quoteAmount, '→', quoteAmountBN.toString(), 'lamports');
      } else if (isSingleSided) {
        // SINGLE-SIDED: Determine which token and amount
        // Support both old API (amount + tokenMint) and new API (baseAmount OR quoteAmount)
        const tokenMintPubkey = params.tokenMint ? validatePublicKey(params.tokenMint, 'Token mint') : null;
        const amount = params.amount || params.baseAmount || params.quoteAmount || 0;

        // Determine which token is being deposited
        let isDepositingTokenX = false;
        let isDepositingTokenY = false;

        if (tokenMintPubkey) {
          // Old API: tokenMint specified
          isDepositingTokenX = tokenMintPubkey.equals(dlmmPool.lbPair.tokenXMint);
          isDepositingTokenY = tokenMintPubkey.equals(dlmmPool.lbPair.tokenYMint);
        } else if (params.baseAmount && params.baseAmount > 0) {
          // New API: baseAmount specified
          isDepositingTokenX = true;
        } else if (params.quoteAmount && params.quoteAmount > 0) {
          // New API: quoteAmount specified
          isDepositingTokenY = true;
        }

        // Use correct decimals based on which token is being deposited
        const decimals = isDepositingTokenX ? tokenXDecimals : tokenYDecimals;
        const amountBN = new BN(Math.floor(amount * Math.pow(10, decimals)));

        baseAmountBN = isDepositingTokenX ? amountBN : new BN(0);
        quoteAmountBN = isDepositingTokenY ? amountBN : new BN(0);

        console.log('[DLMM] Single-sided deposit:');
        console.log('[DLMM]   Token X?', isDepositingTokenX, '→', baseAmountBN.toString(), 'lamports');
        console.log('[DLMM]   Token Y?', isDepositingTokenY, '→', quoteAmountBN.toString(), 'lamports');
      } else {
        throw new Error('No liquidity amounts provided. Specify either baseAmount+quoteAmount (dual-sided) or amount+tokenMint (single-sided)');
      }

      // Determine strategy type for SDK
      // Strategy types: 0 = Spot, 1 = Curve, 2 = BidAsk
      let strategyType: number;
      if (params.strategy === 'spot') {
        strategyType = 0; // Spot
      } else if (params.strategy === 'curve') {
        strategyType = 1; // Curve
      } else {
        strategyType = 2; // BidAsk
      }

      // Get pool metadata for diagnostics
      const activeBinId = dlmmPool.lbPair.activeId;
      const binStep = dlmmPool.lbPair.binStep;
      const activePrice = Math.pow(1 + binStep / 10000, activeBinId);

      console.log('[DLMM] Pool metadata:');
      console.log(`  - Token X: ${dlmmPool.lbPair.tokenXMint.toBase58()}`);
      console.log(`  - Token Y: ${dlmmPool.lbPair.tokenYMint.toBase58()}`);
      console.log(`  - Active Bin ID: ${activeBinId}`);
      console.log(`  - Bin Step: ${binStep}`);
      console.log(`  - Active Price: ${activePrice}`);

      // Calculate bin IDs from price range
      const maxBinId = dlmmPool.getBinIdFromPrice(params.maxPrice, true);
      const minBinId = dlmmPool.getBinIdFromPrice(params.minPrice, false);

      // Calculate bin range size
      const binRangeSize = maxBinId - minBinId + 1;
      const MAX_POSITION_BINS = 1400; // DLMM protocol limit

      console.log('[DLMM] Price range to bin IDs:');
      console.log(`  - Min Price: ${params.minPrice} -> Bin ID: ${minBinId}`);
      console.log(`  - Max Price: ${params.maxPrice} -> Bin ID: ${maxBinId}`);
      console.log(`  - Active Bin ID: ${activeBinId}`);
      console.log(`  - Bin Range Size: ${binRangeSize} bins (max: ${MAX_POSITION_BINS})`);
      console.log(`  - Bin range includes active? ${minBinId <= activeBinId && activeBinId <= maxBinId}`);

      // Validate bin range configuration
      if (minBinId > maxBinId) {
        throw new Error(
          `Invalid bin range: minBinId (${minBinId}) > maxBinId (${maxBinId}). ` +
          `This means minPrice (${params.minPrice}) is higher than maxPrice (${params.maxPrice}).`
        );
      }

      // Validate bin range size (DLMM protocol limit)
      if (binRangeSize > MAX_POSITION_BINS) {
        throw new Error(
          `Bin range too large: ${binRangeSize} bins exceeds protocol limit of ${MAX_POSITION_BINS} bins. ` +
          `Please narrow your price range.`
        );
      }

      // Warn about wide ranges (recommended limit is 50 bins for most pools)
      const RECOMMENDED_MAX_BINS = 50;
      if (binRangeSize > RECOMMENDED_MAX_BINS) {
        console.warn(
          `[DLMM] ⚠️ Wide bin range detected: ${binRangeSize} bins (recommended: ${RECOMMENDED_MAX_BINS}). ` +
          `Some pools may have stricter position width limits and may reject this transaction.`
        );
      }

      // Validate that bin IDs are reasonable (within int32 range)
      if (minBinId < -2147483648 || maxBinId > 2147483647) {
        throw new Error(
          `Bin IDs out of range: [${minBinId}, ${maxBinId}]. ` +
          `Please check your price range values.`
        );
      }

      // Generate position keypair (needed for signing)
      const positionKeypair = Keypair.generate();

      // Create liquidity parameters
      const liquidityParams = {
        positionPubKey: positionKeypair.publicKey,
        user: publicKey,
        totalXAmount: baseAmountBN,
        totalYAmount: quoteAmountBN,
        strategy: {
          maxBinId,
          minBinId,
          strategyType,
        },
        slippage: params.slippage ?? 0.01, // Default 1% slippage protection
      };

      console.log('[DLMM] Liquidity params:', {
        positionPubKey: liquidityParams.positionPubKey.toBase58(),
        user: liquidityParams.user.toBase58(),
        totalXAmount: liquidityParams.totalXAmount.toString(),
        totalYAmount: liquidityParams.totalYAmount.toString(),
        strategy: liquidityParams.strategy,
      });

      // Fetch bins around active bin for diagnostics (helps understand liquidity distribution)
      try {
        const binsAroundActive = await dlmmPool.getBinsAroundActiveBin(5, 5);
        console.log('[DLMM] Bins around active bin:', {
          activeBinId: binsAroundActive.activeBin, // activeBin is just the bin ID (number)
          surroundingBins: binsAroundActive.bins.length,
          firstBin: binsAroundActive.bins[0]?.binId || 'N/A',
          lastBin: binsAroundActive.bins[binsAroundActive.bins.length - 1]?.binId || 'N/A',
        });
      } catch (error) {
        console.warn('[DLMM] Could not fetch bins around active bin:', error);
      }

      // Check if the bin range includes the active bin
      const includesActiveBin = minBinId <= activeBinId && activeBinId <= maxBinId;

      // Validate price range for single-sided deposits
      // NOTE: For empty pools using seedLiquidity, the range MUST include the active bin
      const isDepositingOnlyTokenX = baseAmountBN.gt(new BN(0)) && quoteAmountBN.eq(new BN(0));
      const isDepositingOnlyTokenY = quoteAmountBN.gt(new BN(0)) && baseAmountBN.eq(new BN(0));

      if (isDepositingOnlyTokenX) {
        console.log('[DLMM] Single-sided Token X deposit detected');

        // Token X is placed in bins ABOVE the current price
        // The position must start at or very near the active bin
        const MAX_GAP_FROM_ACTIVE = 1; // Allow maximum 1 bin gap from active

        if (maxBinId < activeBinId) {
          throw new Error(
            `Invalid range for Token X deposit: Your price range (${params.minPrice}-${params.maxPrice}, bins ${minBinId}-${maxBinId}) ` +
            `is entirely below the active price (${activePrice.toFixed(6)}, bin ${activeBinId}). ` +
            `Token X requires the range to include or exceed the active bin.`
          );
        }

        // CRITICAL: For single-sided Token X, position must start at or near active bin
        if (minBinId > activeBinId + MAX_GAP_FROM_ACTIVE) {
          throw new Error(
            `Invalid range for single-sided Token X deposit: Your range starts at bin ${minBinId}, ` +
            `but the active bin is ${activeBinId}. For single-sided deposits, your minimum price must ` +
            `include or be very close to the active bin. Please adjust your Min Price to ${activePrice.toFixed(6)} or lower.`
          );
        }
      } else if (isDepositingOnlyTokenY) {
        console.log('[DLMM] Single-sided Token Y deposit detected');

        // Token Y is placed in bins BELOW the current price
        // The position must end at or very near the active bin
        const MAX_GAP_FROM_ACTIVE = 1; // Allow maximum 1 bin gap from active

        if (minBinId > activeBinId) {
          throw new Error(
            `Invalid range for Token Y deposit: Your price range (${params.minPrice}-${params.maxPrice}, bins ${minBinId}-${maxBinId}) ` +
            `is entirely above the active price (${activePrice.toFixed(6)}, bin ${activeBinId}). ` +
            `Token Y requires the range to include or be below the active bin.`
          );
        }

        // CRITICAL: For single-sided Token Y, position must end at or near active bin
        if (maxBinId < activeBinId - MAX_GAP_FROM_ACTIVE) {
          throw new Error(
            `Invalid range for single-sided Token Y deposit: Your range ends at bin ${maxBinId}, ` +
            `but the active bin is ${activeBinId}. For single-sided deposits, your maximum price must ` +
            `include or be very close to the active bin. Please adjust your Max Price to ${activePrice.toFixed(6)} or higher.`
          );
        }
      } else if (isDualSided) {
        console.log('[DLMM] Dual-sided deposit detected - both Token X and Token Y');
        // For dual-sided deposits, range should generally include active bin for best results
        if (minBinId > activeBinId || maxBinId < activeBinId) {
          console.warn('[DLMM] ⚠️  WARNING: Dual-sided deposit range does not include active bin.');
          console.warn('[DLMM]    This may result in unbalanced deposits or errors.');
        }
      }

      if (!includesActiveBin) {
        console.warn(
          `[DLMM] Warning: Price range [${params.minPrice}, ${params.maxPrice}] (bins ${minBinId}-${maxBinId}) ` +
          `does not include active bin ${activeBinId}. This may result in single-sided deposits.`
        );
      }

      // Use initializePositionAndAddLiquidityByStrategy for ALL pools
      // This SDK function handles:
      // - Empty pools ✅
      // - Pools with liquidity ✅
      // - Bin array initialization ✅
      // - Single-sided deposits ✅
      // - Dual-sided deposits ✅
      console.log('[DLMM] Using initializePositionAndAddLiquidityByStrategy');
      const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);

      // Check if SDK already added compute budget instructions
      const hasComputeUnitPrice = addLiquidityTx.instructions.some(ix =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ix.data[0] === 3 // SetComputeUnitPrice discriminator
      );
      const hasComputeUnitLimit = addLiquidityTx.instructions.some(ix =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ix.data[0] === 2 // SetComputeUnitLimit discriminator
      );

      console.log('[DLMM] Transaction instructions before compute budget:', {
        total: addLiquidityTx.instructions.length,
        hasComputeUnitPrice,
        hasComputeUnitLimit,
      });

      // Only add compute budget instructions if SDK didn't include them
      if (!hasComputeUnitPrice) {
        console.log('[DLMM] Adding SetComputeUnitPrice instruction');
        addLiquidityTx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
        );
      }
      if (!hasComputeUnitLimit) {
        console.log('[DLMM] Adding SetComputeUnitLimit instruction');
        addLiquidityTx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
        );
      }

      // Get recent blockhash with finalized commitment for stability
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      addLiquidityTx.recentBlockhash = blockhash;
      addLiquidityTx.lastValidBlockHeight = lastValidBlockHeight;
      addLiquidityTx.feePayer = publicKey;

      console.log('[DLMM] Transaction built with blockhash:', blockhash);
      console.log('[DLMM] Transaction size:', addLiquidityTx.serialize({ requireAllSignatures: false }).length, 'bytes');
      console.log('[DLMM] RPC endpoint:', connection.rpcEndpoint);

      // **SIMULATE TRANSACTION FIRST** to catch errors before wallet prompt
      const simResult = await simulateAndValidateTransaction(connection, addLiquidityTx, publicKey, [positionKeypair]);
      if (!simResult.success) {
        console.error('[DLMM] Add liquidity transaction simulation failed:', simResult.error);
        console.error('[DLMM] Simulation logs:', simResult.logs);
        throw new Error(simResult.error || 'Add liquidity transaction simulation failed');
      }

      console.log('[DLMM] Simulation passed! Sending add liquidity transaction...');

      // Send transaction with position keypair as signer (wallet adapter handles partial signing)
      // Now we can skip preflight since we simulated
      const signature = await sendTransaction(addLiquidityTx, connection, {
        signers: [positionKeypair],
        skipPreflight: true, // Skip preflight since we simulated
        maxRetries: 5,
      });

      // Confirm transaction
      await confirmTransactionWithRetry(connection, signature);

      // Determine deposit type for accurate messaging
      const depositType = isDualSided
        ? 'dual-sided'
        : isDepositingOnlyTokenX
          ? 'single-sided (Token X)'
          : 'single-sided (Token Y)';

      console.log(`[DLMM] Position created and liquidity added! Type: ${depositType}, Signature: ${signature}`);

      return {
        success: true,
        signature,
        positionAddress: positionKeypair.publicKey.toString(),
        depositType, // Return this so UI can show accurate message
        amounts: {
          tokenX: baseAmountBN.toNumber() / Math.pow(10, tokenXDecimals),
          tokenY: quoteAmountBN.toNumber() / Math.pow(10, tokenYDecimals),
        },
      };
    } catch (error: any) {
      console.error('[DLMM] Error adding liquidity:', error);
      console.error('[DLMM] Error details:', {
        message: error.message,
        code: error.code,
        logs: error.logs,
        stack: error.stack?.slice(0, 500),
      });

      // Provide more helpful error messages
      let errorMessage = 'Failed to add liquidity';
      if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL for transaction fees';
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient token balance';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * Remove liquidity from a position
   * Uses removeLiquidity() SDK function with bps parameter
   */
  const removeLiquidityFromPosition = async (params: {
    poolAddress: string;
    positionAddress: string;
    bps: number; // 0-10000 (10000 = 100%)
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Removing liquidity...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');
      const positionPubkey = validatePublicKey(params.positionAddress, 'Position address');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Get position to determine bin range
      const position = await dlmmPool.getPosition(positionPubkey);

      // Determine bin range from position data
      const positionData = position.positionData as any;
      const binIds = Array.isArray(positionData) ? positionData.map((p: any) => p.binId) : [];
      const fromBinId = binIds.length > 0 ? Math.min(...binIds) : 0;
      const toBinId = binIds.length > 0 ? Math.max(...binIds) : 0;

      // Create remove liquidity transaction
      const bpsBN = new BN(params.bps);
      const removeLiquidityTx = await dlmmPool.removeLiquidity({
        position: positionPubkey,
        user: publicKey,
        fromBinId,
        toBinId,
        bps: bpsBN,
        shouldClaimAndClose: params.bps === 10000, // Close position if removing 100%
      });

      // Get fee breakdown
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Add fees atomically to first transaction
      const txs = Array.isArray(removeLiquidityTx) ? removeLiquidityTx : [removeLiquidityTx];
      if (feeInstructions.length > 0 && txs.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          txs[0].instructions.unshift(ix);
        });
      }

      // Send transaction(s)
      console.log('[DLMM] Sending remove liquidity transaction...');
      const signature = await sendTransaction(txs[0], connection);
      await confirmTransactionWithRetry(connection, signature);

      // Record referral earning
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      // Track transaction
      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-remove-liquidity',
        status: 'success',
        params,
        poolAddress: poolPubkey.toString(),
        platformFee: feeBreakdown.total.lamports,
      });

      console.log('[DLMM] Liquidity removed! Signature:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('[DLMM] Error removing liquidity:', error);
      throw new Error(error.message || 'Failed to remove liquidity');
    }
  };

  /**
   * Claim all rewards (swap fees + LM rewards) for a position
   * Uses claimAllRewardsByPosition() SDK function
   */
  const claimAllRewards = async (params: {
    poolAddress: string;
    positionAddress: string;
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Claiming all rewards...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');
      const positionPubkey = validatePublicKey(params.positionAddress, 'Position address');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Get position first for claim rewards
      const position = await dlmmPool.getPosition(positionPubkey);

      // Create claim rewards transaction
      const claimTx = await dlmmPool.claimAllRewardsByPosition({
        owner: publicKey,
        position
      });

      // Get fee breakdown
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Add fees atomically to first transaction
      const txs = Array.isArray(claimTx) ? claimTx : [claimTx];
      if (feeInstructions.length > 0 && txs.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          txs[0].instructions.unshift(ix);
        });
      }

      // Send transaction(s)
      console.log('[DLMM] Sending claim rewards transaction...');
      const signature = await sendTransaction(txs[0], connection);
      await confirmTransactionWithRetry(connection, signature);

      // Record referral earning
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      // Track transaction
      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-claim-rewards',
        status: 'success',
        params,
        poolAddress: poolPubkey.toString(),
        platformFee: feeBreakdown.total.lamports,
      });

      console.log('[DLMM] Rewards claimed! Signature:', signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('[DLMM] Error claiming rewards:', error);
      throw new Error(error.message || 'Failed to claim rewards');
    }
  };

  /**
   * Swap tokens using DLMM pool
   */
  const swapTokens = async (params: {
    poolAddress: string;
    amountIn: number; // Amount in UI units
    tokenMintIn: string;
    tokenMintOut: string;
    slippageBps: number; // Slippage in basis points (100 = 1%)
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Swapping tokens...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');
      const inTokenPubkey = validatePublicKey(params.tokenMintIn, 'Input token');
      const outTokenPubkey = validatePublicKey(params.tokenMintOut, 'Output token');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Convert amount to lamports (assume 9 decimals)
      const amountInBN = new BN(Math.floor(params.amountIn * 1e9));

      // Get quote for the swap - SDK signature may vary
      const quote = await (dlmmPool as any).swapQuote(
        amountInBN,
        inTokenPubkey.equals(dlmmPool.tokenX.publicKey), // swapForY
        new BN(params.slippageBps),
        publicKey
      );

      // Create swap transaction
      const swapTx = await dlmmPool.swap({
        inToken: inTokenPubkey,
        binArraysPubkey: (quote as any).binArraysPubkey || [],
        inAmount: amountInBN,
        lbPair: poolPubkey,
        user: publicKey,
        minOutAmount: (quote as any).minOutAmount || new BN(0),
        outToken: outTokenPubkey,
      });

      // Get fee breakdown
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Add fees atomically
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          swapTx.instructions.unshift(ix);
        });
      }

      // Send transaction
      console.log('[DLMM] Sending swap transaction...');
      const signature = await sendTransaction(swapTx, connection);
      await confirmTransactionWithRetry(connection, signature);

      // Record referral earning
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      // Track transaction
      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-swap',
        status: 'success',
        params,
        poolAddress: poolPubkey.toString(),
        platformFee: feeBreakdown.total.lamports,
      });

      console.log('[DLMM] Swap complete! Signature:', signature);

      return {
        success: true,
        signature,
        outAmount: quote.minOutAmount.toNumber() / 1e9, // Convert to UI units
      };
    } catch (error: any) {
      console.error('[DLMM] Error swapping:', error);
      throw new Error(error.message || 'Failed to swap tokens');
    }
  };

  /**
   * Create a DLMM pool and optionally add initial liquidity in one flow
   * This combines createPool + initializePositionAndAddLiquidityByStrategy for easier testing
   */
  const createPoolWithLiquidity = async (params: DLMMCreatePoolParams & {
    addLiquidity?: boolean;
    liquidityStrategy?: 'spot' | 'curve' | 'bid-ask';
    minPrice?: number;
    maxPrice?: number;
  }) => {
    // Wallet validation
    if (!publicKey || !connected) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      console.log('═'.repeat(80));
      console.log('[DLMM] 🚀 Starting createPoolWithLiquidity flow');
      console.log('[DLMM] Wallet:', publicKey.toBase58());
      console.log('[DLMM] Network:', network);
      console.log('[DLMM] Params:', JSON.stringify(params, null, 2));
      console.log('═'.repeat(80));

      // ============= STEP 1: CREATE POOL =============
      console.log('\n[DLMM] 📦 STEP 1: Creating pool...');
      const poolResult = await createPool(params);

      if (!poolResult.success || !poolResult.poolAddress) {
        throw new Error('Pool creation failed - no pool address returned');
      }

      console.log('[DLMM] ✅ Pool created successfully!');
      console.log('[DLMM]    Pool Address:', poolResult.poolAddress);
      console.log('[DLMM]    Base Mint:', poolResult.baseMint);
      console.log('[DLMM]    Signature:', poolResult.signature);

      // Parse and validate liquidity amounts (handle string | undefined safely)
      const baseAmountRaw = params.baseAmount;
      const quoteAmountRaw = params.quoteAmount;

      const baseAmountNum = baseAmountRaw ? parseFloat(baseAmountRaw) : 0;
      const quoteAmountNum = quoteAmountRaw ? parseFloat(quoteAmountRaw) : 0;

      const hasValidBaseAmount = !isNaN(baseAmountNum) && baseAmountNum > 0;
      const hasValidQuoteAmount = !isNaN(quoteAmountNum) && quoteAmountNum > 0;

      console.log('[DLMM] Liquidity check:');
      console.log('[DLMM]    addLiquidity flag:', params.addLiquidity);
      console.log('[DLMM]    baseAmount:', baseAmountRaw, '→', baseAmountNum, '(valid:', hasValidBaseAmount, ')');
      console.log('[DLMM]    quoteAmount:', quoteAmountRaw, '→', quoteAmountNum, '(valid:', hasValidQuoteAmount, ')');

      // If liquidity not requested or no valid amounts, return pool creation result
      if (!params.addLiquidity || (!hasValidBaseAmount && !hasValidQuoteAmount)) {
        console.log('[DLMM] ⏭️  Skipping liquidity addition');
        console.log('[DLMM] Reason:', !params.addLiquidity ? 'Not requested by user' : 'No valid amounts provided');
        return poolResult;
      }

      // ============= STEP 2: WAIT FOR POOL CONFIRMATION =============
      console.log('\n[DLMM] ⏳ STEP 2: Waiting for pool confirmation (3 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify pool exists on-chain before adding liquidity
      console.log('[DLMM] 🔍 Verifying pool exists on-chain...');
      let dlmmPool;
      try {
        const poolPubkey = new PublicKey(poolResult.poolAddress);
        dlmmPool = await DLMM.create(connection, poolPubkey, {
          cluster: network as 'mainnet-beta' | 'devnet',
        });
        console.log('[DLMM] ✅ Pool verified on-chain!');
        console.log('[DLMM]    Active Bin ID:', dlmmPool.lbPair.activeId);
        console.log('[DLMM]    Bin Step:', dlmmPool.lbPair.binStep);
      } catch (verifyError: any) {
        console.error('[DLMM] ❌ Failed to verify pool:', verifyError.message);
        throw new Error(
          'Pool was created but is not yet available on-chain. ' +
          'This can happen during network congestion. ' +
          'Please wait 30 seconds and manually add liquidity from the pool page.'
        );
      }

      // ============= STEP 3: ADD INITIAL LIQUIDITY =============
      console.log('\n[DLMM] 💧 STEP 3: Adding initial liquidity...');

      // Determine deposit type: dual-sided or single-sided
      const isDualSidedDeposit = hasValidBaseAmount && hasValidQuoteAmount;

      if (isDualSidedDeposit) {
        console.log('[DLMM] 📊 DUAL-SIDED deposit: Both BASE and QUOTE tokens');
        console.log('[DLMM]    Base Amount:', baseAmountNum);
        console.log('[DLMM]    Quote Amount:', quoteAmountNum);
      } else if (hasValidBaseAmount) {
        console.log('[DLMM] 📊 SINGLE-SIDED deposit: BASE token only');
        console.log('[DLMM]    Amount:', baseAmountNum);
      } else {
        console.log('[DLMM] 📊 SINGLE-SIDED deposit: QUOTE token only');
        console.log('[DLMM]    Amount:', quoteAmountNum);
      }

      // Parse and validate initial price (handle string | number | undefined)
      const initialPriceRaw = params.initialPrice;
      const initialPrice = initialPriceRaw ? parseFloat(initialPriceRaw.toString()) : 1;

      if (isNaN(initialPrice) || initialPrice <= 0) {
        throw new Error('Invalid initial price. Must be a positive number.');
      }

      console.log('[DLMM]    Initial Price:', initialPrice);

      // Calculate SAFE price range that includes the active price
      // CRITICAL: For empty pools with deposits:
      //   - Dual-sided: range must INCLUDE active price
      //   - Base token only (X): range must be AT or ABOVE active price
      //   - Quote token only (Y): range must be AT or BELOW active price
      let minPrice: number;
      let maxPrice: number;

      if (params.minPrice !== undefined && params.maxPrice !== undefined) {
        // User provided explicit range
        minPrice = params.minPrice;
        maxPrice = params.maxPrice;
        console.log('[DLMM]    Using user-provided range:', minPrice, '-', maxPrice);
      } else {
        // Auto-calculate safe range based on deposit type
        if (isDualSidedDeposit) {
          // Dual-sided: range centered around initial price
          minPrice = initialPrice * 0.9; // 10% below
          maxPrice = initialPrice * 1.1; // 10% above
          console.log('[DLMM]    Auto range for DUAL-SIDED (centered):', minPrice, '-', maxPrice);
        } else if (hasValidBaseAmount) {
          // Base token: range at or above initial price
          minPrice = initialPrice;
          maxPrice = initialPrice * 1.2; // 20% above
          console.log('[DLMM]    Auto range for BASE (at/above):', minPrice, '-', maxPrice);
        } else {
          // Quote token: range at or below initial price
          minPrice = initialPrice * 0.8; // 20% below
          maxPrice = initialPrice;
          console.log('[DLMM]    Auto range for QUOTE (at/below):', minPrice, '-', maxPrice);
        }
      }

      // Validate range
      if (minPrice >= maxPrice) {
        throw new Error(`Invalid price range: minPrice (${minPrice}) must be less than maxPrice (${maxPrice})`);
      }

      // Verify range includes active price (critical for empty pools)
      if (minPrice > initialPrice || maxPrice < initialPrice) {
        console.warn('[DLMM] ⚠️  WARNING: Price range does not include initial price!');
        console.warn('[DLMM]    This will likely FAIL for empty pools.');
        console.warn('[DLMM]    Adjusting range to include initial price...');
        minPrice = Math.min(minPrice, initialPrice);
        maxPrice = Math.max(maxPrice, initialPrice);
        console.log('[DLMM]    Adjusted range:', minPrice, '-', maxPrice);
      }

      const strategy = params.liquidityStrategy || 'curve';
      console.log('[DLMM]    Strategy:', strategy);

      console.log('\n[DLMM] 🎯 Final liquidity parameters:');
      console.log('[DLMM]    Pool:', poolResult.poolAddress);
      console.log('[DLMM]    Strategy:', strategy);
      console.log('[DLMM]    Price Range:', minPrice, '-', maxPrice);

      if (isDualSidedDeposit) {
        console.log('[DLMM]    Base Amount:', baseAmountNum);
        console.log('[DLMM]    Quote Amount:', quoteAmountNum);
      } else if (hasValidBaseAmount) {
        console.log('[DLMM]    Base Amount:', baseAmountNum);
      } else {
        console.log('[DLMM]    Quote Amount:', quoteAmountNum);
      }

      // Call SDK to add liquidity with NEW dual-sided API
      const liquidityResult = await initializePositionAndAddLiquidityByStrategy({
        poolAddress: poolResult.poolAddress,
        strategy,
        minPrice,
        maxPrice,
        // NEW: Pass both amounts for dual-sided, or just one for single-sided
        baseAmount: hasValidBaseAmount ? baseAmountNum : undefined,
        quoteAmount: hasValidQuoteAmount ? quoteAmountNum : undefined,
      });

      console.log('\n[DLMM] ✅ LIQUIDITY ADDED SUCCESSFULLY!');
      console.log('[DLMM]    Signature:', liquidityResult.signature);
      console.log('═'.repeat(80));

      return {
        ...poolResult,
        liquidityAdded: true,
        liquiditySignature: liquidityResult.signature,
      };
    } catch (error: any) {
      console.error('\n[DLMM] ❌ ERROR in createPoolWithLiquidity:');
      console.error('[DLMM]    Message:', error.message);
      console.error('[DLMM]    Name:', error.name);
      if (error.stack) {
        console.error('[DLMM]    Stack:', error.stack.slice(0, 500));
      }
      console.error('═'.repeat(80));

      // Provide specific error messages
      if (error.message?.includes('Wallet not connected')) {
        throw error; // Re-throw as-is
      }

      if (error.message?.includes('Pool is empty') || error.message?.includes('active')) {
        throw new Error(
          'Pool created but liquidity failed. For empty pools, the price range must include the initial price. ' +
          'You can manually add liquidity from the pool page.'
        );
      }

      if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient balance. Check your token and SOL balances. You need ~0.5 SOL for fees.');
      }

      if (error.message?.includes('not yet available')) {
        throw error; // Re-throw pool verification error as-is
      }

      throw new Error(error.message || 'Failed to create pool with liquidity. Check console for details.');
    }
  };

  /**
   * Add liquidity to an EXISTING position using strategy
   * This method is separate from initializePositionAndAddLiquidityByStrategy
   * Use this when you already have a position and want to add more liquidity
   */
  const addLiquidityByStrategy = async (params: {
    poolAddress: string;
    positionAddress: string;
    strategy: 'spot' | 'curve' | 'bid-ask';
    minPrice: number;
    maxPrice: number;
    baseAmount?: number; // Amount of base token (Token X) in UI units
    quoteAmount?: number; // Amount of quote token (Token Y) in UI units
    slippage?: number; // Slippage tolerance (0.01 = 1%, default 0.01)
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Adding liquidity to existing position...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');
      const positionPubkey = validatePublicKey(params.positionAddress, 'Position address');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Refresh pool state
      await dlmmPool.refetchStates();

      // Get token decimals
      const tokenXMintInfo = await getMint(connection, dlmmPool.lbPair.tokenXMint);
      const tokenYMintInfo = await getMint(connection, dlmmPool.lbPair.tokenYMint);
      const tokenXDecimals = tokenXMintInfo.decimals;
      const tokenYDecimals = tokenYMintInfo.decimals;

      // Determine if dual-sided or single-sided
      const hasValidBaseAmount = params.baseAmount !== undefined && params.baseAmount > 0;
      const hasValidQuoteAmount = params.quoteAmount !== undefined && params.quoteAmount > 0;
      const isDualSided = hasValidBaseAmount && hasValidQuoteAmount;

      // Convert amounts to lamports
      const baseAmountBN = hasValidBaseAmount
        ? new BN(params.baseAmount! * 10 ** tokenXDecimals)
        : new BN(0);
      const quoteAmountBN = hasValidQuoteAmount
        ? new BN(params.quoteAmount! * 10 ** tokenYDecimals)
        : new BN(0);

      console.log('[DLMM] Deposit type:', {
        isDualSided,
        baseAmount: baseAmountBN.toString(),
        quoteAmount: quoteAmountBN.toString(),
      });

      // Get active bin
      const activeBin = await dlmmPool.getActiveBin();
      const activeBinId = activeBin.binId;
      const activePrice = dlmmPool.fromPricePerLamport(Number(activeBin.price));

      // Calculate bin IDs from prices
      const binStep = dlmmPool.lbPair.binStep;
      const basisPointsDecimal = binStep / 10000;
      const minBinId = Math.floor(Math.log(params.minPrice) / Math.log(1 + basisPointsDecimal));
      const maxBinId = Math.ceil(Math.log(params.maxPrice) / Math.log(1 + basisPointsDecimal));

      // Map strategy to SDK StrategyType
      const strategyTypeMap = {
        'spot': StrategyType.Spot,
        'curve': StrategyType.Curve,
        'bid-ask': StrategyType.BidAsk,
      };
      const strategyType = strategyTypeMap[params.strategy];

      // Create add liquidity transaction
      const addLiquidityTx = await dlmmPool.addLiquidityByStrategy({
        positionPubKey: positionPubkey,
        user: publicKey,
        totalXAmount: baseAmountBN,
        totalYAmount: quoteAmountBN,
        strategy: {
          maxBinId,
          minBinId,
          strategyType,
        },
        slippage: params.slippage ?? 0.01, // Default 1% slippage protection
      });

      // Get fee breakdown
      const feeBreakdown = getFeeBreakdown(referrerWallet || undefined);
      const feeInstructions = await getFeeDistributionInstructions(
        publicKey,
        referrerWallet || undefined
      );

      // Add fees atomically
      if (feeInstructions.length > 0) {
        feeInstructions.reverse().forEach((ix) => {
          addLiquidityTx.instructions.unshift(ix);
        });
      }

      // Add compute budget
      const hasComputeUnitPrice = addLiquidityTx.instructions.some(
        (ix) =>
          ix.programId.equals(ComputeBudgetProgram.programId) &&
          ix.data[0] === 3 // SetComputeUnitPrice discriminator
      );
      const hasComputeUnitLimit = addLiquidityTx.instructions.some(
        (ix) =>
          ix.programId.equals(ComputeBudgetProgram.programId) &&
          ix.data[0] === 2 // SetComputeUnitLimit discriminator
      );

      if (!hasComputeUnitPrice) {
        addLiquidityTx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
        );
      }
      if (!hasComputeUnitLimit) {
        addLiquidityTx.instructions.unshift(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
        );
      }

      // Send transaction
      console.log('[DLMM] Sending add liquidity transaction...');
      const signature = await sendTransaction(addLiquidityTx, connection);
      await confirmTransactionWithRetry(connection, signature);

      // Record referral earning
      if (referrerWallet && feeBreakdown.referral.lamports > 0) {
        recordEarning(
          feeBreakdown.referral.lamports,
          publicKey.toBase58(),
          signature
        );
      }

      // Track transaction with accurate deposit type
      const depositType = isDualSided
        ? 'dual-sided'
        : hasValidBaseAmount
          ? 'single-sided (Token X)'
          : 'single-sided (Token Y)';

      addTransaction({
        signature,
        walletAddress: publicKey.toBase58(),
        network,
        protocol: 'dlmm',
        action: 'dlmm-add-liquidity',
        status: 'success',
        params: {
          ...params,
          depositType,
        },
        poolAddress: poolPubkey.toString(),
        platformFee: feeBreakdown.total.lamports,
      });

      console.log(`[DLMM] Liquidity added successfully! Type: ${depositType}`);

      return {
        success: true,
        signature,
        positionAddress: positionPubkey.toString(),
        depositType, // Return this so UI can show accurate message
        amounts: {
          tokenX: hasValidBaseAmount ? params.baseAmount : 0,
          tokenY: hasValidQuoteAmount ? params.quoteAmount : 0,
        },
      };
    } catch (error: any) {
      console.error('[DLMM] Error adding liquidity:', error);
      throw new Error(error.message || 'Failed to add liquidity to position');
    }
  };

  return {
    createPool,
    createPoolWithLiquidity,
    seedLiquidityLFG,
    seedLiquiditySingleBin,
    setPoolStatus,
    fetchUserPositions,
    initializePositionAndAddLiquidityByStrategy,
    addLiquidityByStrategy, // NEW: Separate method for adding to existing positions
    removeLiquidityFromPosition,
    claimAllRewards,
    swapTokens,
  };
}
