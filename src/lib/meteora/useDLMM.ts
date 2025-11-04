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
import DLMM, { deriveCustomizablePermissionlessLbPair } from '@meteora-ag/dlmm';
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
  const { publicKey, sendTransaction } = useWallet();
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
   */
  const initializePositionAndAddLiquidityByStrategy = async (params: {
    poolAddress: string;
    strategy: 'spot' | 'curve' | 'bid-ask';
    minPrice: number;
    maxPrice: number;
    amount: number; // Amount in UI units
    tokenMint: string; // Which token to deposit
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[DLMM] Initializing position and adding liquidity...', params);

    try {
      const poolPubkey = validatePublicKey(params.poolAddress, 'Pool address');
      const tokenMintPubkey = validatePublicKey(params.tokenMint, 'Token mint');

      // Create DLMM pool instance
      const dlmmPool = await DLMM.create(connection, poolPubkey, {
        cluster: network as 'mainnet-beta' | 'devnet',
      });

      // Convert amount to lamports (assume 9 decimals)
      const amountBN = new BN(Math.floor(params.amount * 1e9));

      // Determine strategy type for SDK
      // Strategy types: 0 = SpotBalanced, 1 = Curve, 2 = BidAsk
      let strategyType: number;
      if (params.strategy === 'spot') {
        strategyType = 0; // SpotBalanced
      } else if (params.strategy === 'curve') {
        strategyType = 1; // Curve
      } else {
        strategyType = 2; // BidAsk
      }

      // Create liquidity parameters
      const liquidityParams = {
        positionPubKey: Keypair.generate().publicKey,
        user: publicKey,
        totalXAmount: tokenMintPubkey.equals(dlmmPool.tokenX.publicKey) ? amountBN : new BN(0),
        totalYAmount: tokenMintPubkey.equals(dlmmPool.tokenY.publicKey) ? amountBN : new BN(0),
        strategy: {
          maxBinId: dlmmPool.getBinIdFromPrice(params.maxPrice, true),
          minBinId: dlmmPool.getBinIdFromPrice(params.minPrice, false),
          strategyType,
        },
      };

      console.log('[DLMM] Liquidity params:', liquidityParams);

      // Create add liquidity transaction
      const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);

      // Send transaction
      console.log('[DLMM] Sending add liquidity transaction...');
      const signature = await sendTransaction(addLiquidityTx, connection);

      // Confirm transaction
      await confirmTransactionWithRetry(connection, signature);

      console.log('[DLMM] Position created and liquidity added! Signature:', signature);

      return {
        success: true,
        signature,
        positionAddress: liquidityParams.positionPubKey.toString(),
      };
    } catch (error: any) {
      console.error('[DLMM] Error adding liquidity:', error);
      throw new Error(error.message || 'Failed to add liquidity');
    }
  };

  /**
   * Add liquidity to existing position
   * TODO: Implement this function using proper DLMM SDK method
   */
  // const addLiquidityByStrategy = async (params: {
  //   poolAddress: string;
  //   positionAddress: string;
  //   amount: number;
  //   tokenMint: string;
  // }) => {
  //   throw new Error('Not yet implemented - use initializePositionAndAddLiquidityByStrategy to create new position');
  // };

  return {
    createPool,
    seedLiquidityLFG,
    seedLiquiditySingleBin,
    setPoolStatus,
    fetchUserPositions,
    initializePositionAndAddLiquidityByStrategy,
    // addLiquidityByStrategy, // TODO: Implement this
  };
}
