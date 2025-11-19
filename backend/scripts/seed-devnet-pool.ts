#!/usr/bin/env tsx
/**
 * Seed Liquidity to Devnet DLMM Pool
 *
 * Seeds initial liquidity to a fresh DLMM pool using both:
 * 1. Single-sided seeding (seedLiquiditySingleBin) - establishes initial price
 * 2. Dual-sided seeding (seedLiquidity with strategy) - creates liquidity distribution
 *
 * Based on: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
 *
 * Prerequisites:
 * 1. Pool already created (use create-sol-usdc-devnet-pool.ts)
 * 2. Devnet SOL in wallet (~5 SOL recommended for wrapping + fees)
 * 3. Devnet USDC in wallet (airdrop or mint)
 * 4. Wallet keypair in ~/.config/solana/id.json
 *
 * Usage:
 *   tsx backend/scripts/seed-devnet-pool.ts <pool-address>
 *
 * Example:
 *   tsx backend/scripts/seed-devnet-pool.ts 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createSyncNativeInstruction, NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import DLMM, { StrategyType, getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Seeding configuration
const SEED_CONFIG = {
  // Phase 1: Single-sided seeding (establishes price)
  singleSided: {
    enabled: true,
    solAmount: 0.1, // 0.1 SOL to establish initial bin
  },
  // Phase 2: Dual-sided seeding (creates liquidity distribution)
  dualSided: {
    enabled: true,
    solAmount: 2.0, // 2 SOL
    usdcAmount: 360, // 360 USDC (assumes ~180 USDC/SOL)
    strategy: StrategyType.Spot,
    binRange: 20, // ±20 bins from active bin
  },
};

/**
 * Load wallet from file
 */
function loadWallet(): Keypair {
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet file not found!');
    console.error('💡 Create: solana-keygen new --outfile ~/.config/solana/id.json');
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

/**
 * Check SOL balance
 */
async function checkBalance(wallet: Keypair): Promise<number> {
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceSOL = balance / 1e9;

  console.log(`💰 SOL Balance: ${balanceSOL.toFixed(4)} SOL`);

  const requiredSOL = SEED_CONFIG.singleSided.solAmount + SEED_CONFIG.dualSided.solAmount + 0.5; // +0.5 for fees
  if (balanceSOL < requiredSOL) {
    console.warn(`⚠️  Need at least ${requiredSOL} SOL for seeding`);
    console.warn(`   Get devnet SOL: https://faucet.solana.com/`);
    console.warn(`   Address: ${wallet.publicKey.toBase58()}`);
    throw new Error('Insufficient SOL balance');
  }

  return balanceSOL;
}

/**
 * Wrap SOL to WSOL (SPL Token)
 */
async function wrapSOL(wallet: Keypair, amount: number): Promise<PublicKey> {
  console.log(`\n🔄 Wrapping ${amount} SOL...`);

  const lamports = Math.floor(amount * 1e9);

  // Get or create WSOL account
  const wsolAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    NATIVE_MINT,
    wallet.publicKey,
    false,
    'confirmed',
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );

  console.log(`   WSOL Account: ${wsolAccount.address.toBase58()}`);

  // Transfer SOL to WSOL account
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wsolAccount.address,
      lamports,
    }),
    createSyncNativeInstruction(wsolAccount.address, TOKEN_PROGRAM_ID)
  );

  const txId = await sendAndConfirmTransaction(connection, transaction, [wallet], {
    commitment: 'confirmed',
  });

  console.log(`✅ Wrapped ${amount} SOL`);
  console.log(`   Transaction: https://explorer.solana.com/tx/${txId}?cluster=devnet`);

  return wsolAccount.address;
}

/**
 * Check USDC balance
 */
async function checkUSDCBalance(wallet: Keypair, usdcMint: PublicKey): Promise<number> {
  try {
    const usdcAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      usdcMint,
      wallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const balance = Number(usdcAccount.amount) / 1e6; // USDC has 6 decimals
    console.log(`💵 USDC Balance: ${balance.toFixed(2)} USDC`);

    return balance;
  } catch (error) {
    console.log(`💵 USDC Balance: 0 USDC (no account)`);
    return 0;
  }
}

/**
 * Phase 1: Seed liquidity into a single bin (establishes initial price)
 */
async function seedSingleBin(
  wallet: Keypair,
  poolAddress: string,
  solAmount: number
): Promise<boolean> {
  console.log('\n🌱 Phase 1: Single-Sided Seeding (Establish Initial Price)');
  console.log('═'.repeat(60));

  try {
    // Load pool
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
      cluster: 'devnet',
    });

    // Refresh pool state
    await dlmmPool.refetchStates();
    const poolState = dlmmPool.lbPair;
    console.log(`📊 Pool State:`);
    console.log(`   Active Bin: ${poolState.activeId}`);

    // Calculate current price from active bin
    const currentPrice = getPriceOfBinByBinId(poolState.activeId, poolState.binStep);
    console.log(`   Current Price: ${currentPrice.toString()}`);

    // Check if pool already has liquidity
    const binArrays = await dlmmPool.getBinArrays();
    if (binArrays.length > 0) {
      console.log('⚠️  Pool already has liquidity - skipping single-sided seeding');
      return true;
    }

    console.log(`\n💧 Seeding ${solAmount} SOL into single bin...`);

    // Generate ephemeral base keypair for position
    const baseKeypair = Keypair.generate();
    const positionOwner = wallet.publicKey;

    // Seed parameters
    const seedAmountLamports = new BN(Math.floor(solAmount * 1e9));
    const price = currentPrice.toNumber(); // Use current pool price (convert Decimal to number)
    const roundingUp = true;

    // Create seed transaction
    const seedResponse = await dlmmPool.seedLiquiditySingleBin(
      wallet.publicKey, // payer
      baseKeypair.publicKey, // base
      seedAmountLamports,
      price,
      roundingUp,
      positionOwner,
      positionOwner, // feeOwner
      positionOwner, // operator
      new BN(0) // lockReleasePoint (0 = no lock)
    );

    console.log(`📝 Transaction Details:`);
    console.log(`   Position Base: ${baseKeypair.publicKey.toBase58()}`);
    console.log(`   Seed Amount: ${solAmount} SOL`);
    console.log(`   Target Price: ${price}`);

    // Build transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Add all instructions
    for (const ix of seedResponse.instructions) {
      transaction.add(ix);
    }

    // Sign with both wallet and base keypair
    transaction.partialSign(wallet, baseKeypair);

    // Send
    const txId = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`⏳ Transaction sent: ${txId}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);

    // Confirm
    const confirmation = await connection.confirmTransaction(txId, 'confirmed');
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Single-sided seeding successful!');
    console.log(`   Position created with ${solAmount} SOL at price ${price}`);

    return true;
  } catch (error: any) {
    console.error('❌ Single-sided seeding failed:', error.message);
    if (error.logs) {
      console.error('📋 Logs:', error.logs);
    }
    return false;
  }
}

/**
 * Phase 2: Seed dual-sided liquidity with strategy (creates liquidity distribution)
 */
async function seedDualSided(
  wallet: Keypair,
  poolAddress: string,
  solAmount: number,
  usdcAmount: number,
  strategy: StrategyType,
  binRange: number
): Promise<boolean> {
  console.log('\n🌱 Phase 2: Dual-Sided Seeding (Liquidity Distribution)');
  console.log('═'.repeat(60));

  try {
    // Load pool
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
      cluster: 'devnet',
    });

    // Refresh pool state
    await dlmmPool.refetchStates();
    const poolState = dlmmPool.lbPair;
    const activeBin = await dlmmPool.getActiveBin();

    console.log(`📊 Pool State:`);
    console.log(`   Active Bin: ${activeBin.binId}`);
    console.log(`   Current Price: ${activeBin.price}`);
    console.log(`   Strategy: ${StrategyType[strategy]}`);

    // Calculate bin range
    const minBinId = activeBin.binId - binRange;
    const maxBinId = activeBin.binId + binRange;

    console.log(`\n💧 Seeding liquidity:`);
    console.log(`   SOL Amount: ${solAmount} SOL`);
    console.log(`   USDC Amount: ${usdcAmount} USDC`);
    console.log(`   Bin Range: ${minBinId} to ${maxBinId} (±${binRange} bins)`);
    console.log(`   Total Bins: ${maxBinId - minBinId + 1}`);

    // Generate position base keypair
    const baseKeypair = Keypair.generate();

    // Create seed transaction
    const seedResponse = await dlmmPool.seedLiquidity(
      wallet.publicKey, // payer
      baseKeypair.publicKey, // base
      new BN(Math.floor(solAmount * 1e9)), // totalXAmount (SOL)
      new BN(Math.floor(usdcAmount * 1e6)), // totalYAmount (USDC)
      minBinId,
      maxBinId,
      strategy,
      wallet.publicKey, // positionOwner
      wallet.publicKey, // feeOwner
      wallet.publicKey, // operator
      new BN(0), // lockReleasePoint
      100 // slippage (1%)
    );

    console.log(`📝 Transaction Details:`);
    console.log(`   Position Base: ${baseKeypair.publicKey.toBase58()}`);
    console.log(`   Slippage: 1%`);

    // Build transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Add all instructions
    for (const ix of seedResponse.instructions) {
      transaction.add(ix);
    }

    // Sign with both keypairs
    transaction.partialSign(wallet, baseKeypair);

    // Send
    const txId = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`⏳ Transaction sent: ${txId}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);

    // Confirm
    const confirmation = await connection.confirmTransaction(txId, 'confirmed');
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Dual-sided seeding successful!');
    console.log(`   Created liquidity distribution across ${maxBinId - minBinId + 1} bins`);

    return true;
  } catch (error: any) {
    console.error('❌ Dual-sided seeding failed:', error.message);
    if (error.logs) {
      console.error('📋 Logs:', error.logs);
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Seed Devnet DLMM Pool');
  console.log('═'.repeat(60));
  console.log(`🌐 Network: Devnet`);
  console.log(`🔗 RPC: ${DEVNET_RPC}\n`);

  // Get pool address from command line
  const poolAddress = process.argv[2];
  if (!poolAddress) {
    console.error('❌ Missing pool address!');
    console.error('💡 Usage: tsx seed-devnet-pool.ts <pool-address>');
    process.exit(1);
  }

  console.log(`🏊 Pool: ${poolAddress}\n`);

  // Load wallet
  const wallet = loadWallet();
  console.log(`👛 Wallet: ${wallet.publicKey.toBase58()}\n`);

  // Check balance
  await checkBalance(wallet);

  // Load pool to get token mints
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: 'devnet',
  });

  // Refresh pool state
  await dlmmPool.refetchStates();
  const lbPair = dlmmPool.lbPair;

  console.log(`\n📋 Pool Info:`);
  console.log(`   Token X: ${lbPair.tokenXMint.toBase58()}`);
  console.log(`   Token Y: ${lbPair.tokenYMint.toBase58()}`);

  // Check USDC balance
  await checkUSDCBalance(wallet, lbPair.tokenYMint);

  let success = true;

  // Phase 1: Single-sided seeding
  if (SEED_CONFIG.singleSided.enabled) {
    const result = await seedSingleBin(
      wallet,
      poolAddress,
      SEED_CONFIG.singleSided.solAmount
    );
    success = success && result;

    // Wait a bit before next phase
    if (result && SEED_CONFIG.dualSided.enabled) {
      console.log('\n⏳ Waiting 5 seconds before dual-sided seeding...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Phase 2: Dual-sided seeding
  if (SEED_CONFIG.dualSided.enabled) {
    const result = await seedDualSided(
      wallet,
      poolAddress,
      SEED_CONFIG.dualSided.solAmount,
      SEED_CONFIG.dualSided.usdcAmount,
      SEED_CONFIG.dualSided.strategy,
      SEED_CONFIG.dualSided.binRange
    );
    success = success && result;
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('═'.repeat(60));
  if (success) {
    console.log('✅ Liquidity seeding completed successfully!');
    console.log('\n📈 Pool now has:');
    console.log('   - Initial price established');
    console.log('   - Liquidity distribution across multiple bins');
    console.log('   - Ready for swaps and additional positions');
    console.log('\n💡 Next Steps:');
    console.log('   1. Add pool to backend tracking');
    console.log('   2. View pool in UI (switch to devnet)');
    console.log('   3. Test adding/removing liquidity');
    console.log('   4. Test swaps');
  } else {
    console.log('⚠️  Liquidity seeding completed with errors');
    console.log('   Check logs above for details');
  }
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
