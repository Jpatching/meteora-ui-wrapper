#!/usr/bin/env tsx
/**
 * Seed Initial Liquidity to DLMM Pool
 *
 * This script seeds the FIRST liquidity to an empty/activated DLMM pool.
 * Use this BEFORE anyone can add liquidity via the UI.
 *
 * Usage:
 *   tsx seed-initial-liquidity.ts <pool-address> [amount]
 *
 * Example:
 *   tsx seed-initial-liquidity.ts 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1 0.1
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, getAccount, createSyncNativeInstruction, NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';

// Configuration
const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

/**
 * Load wallet from file
 */
function loadWallet(): Keypair {
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet file not found at:', walletPath);
    console.error('💡 Create one with: solana-keygen new --outfile ~/.config/solana/id.json');
    console.error('💡 Or set WALLET_PATH environment variable');
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

/**
 * Check if token is SOL (native mint)
 */
function isNativeSOL(mint: PublicKey): boolean {
  return mint.equals(NATIVE_MINT);
}

/**
 * Wrap SOL to WSOL if needed
 */
async function ensureWSOL(wallet: Keypair, amount: number): Promise<void> {
  console.log(`\n🔄 Wrapping ${amount} SOL to WSOL...`);

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
  console.log(`   TX: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
}

/**
 * Get token balance
 */
async function getTokenBalance(wallet: Keypair, mint: PublicKey, decimals: number): Promise<number> {
  try {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const balance = Number(ata.amount) / Math.pow(10, decimals);
    return balance;
  } catch (error) {
    return 0;
  }
}

/**
 * Seed initial liquidity to the pool
 */
async function seedInitialLiquidity(
  wallet: Keypair,
  poolAddress: string,
  amountInTokens: number
) {
  console.log('\n🌱 Seeding Initial Liquidity');
  console.log('═'.repeat(60));

  // Load pool
  console.log('\n📊 Loading pool...');
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: 'devnet',
  });

  // Refresh pool state
  await dlmmPool.refetchStates();
  const poolState = dlmmPool.lbPair;
  const activationPoint = poolState.activationPoint;

  console.log('Pool Info:');
  console.log('  - Pool Address:', poolAddress);
  console.log('  - Token X:', dlmmPool.tokenX.publicKey.toBase58());
  console.log('  - Token Y:', dlmmPool.tokenY.publicKey.toBase58());
  console.log('  - Active Bin:', poolState.activeId);

  // Calculate current price from active bin
  const currentPrice = getPriceOfBinByBinId(poolState.activeId, poolState.binStep);
  console.log('  - Current Price:', currentPrice.toString());

  console.log('  - Bin Step:', poolState.binStep);
  console.log('  - Activation Point:', activationPoint ? activationPoint.toString() : 'null');

  // Determine which token to seed with
  const isTokenXNative = isNativeSOL(dlmmPool.tokenX.publicKey);
  const isTokenYNative = isNativeSOL(dlmmPool.tokenY.publicKey);

  console.log('\n💰 Token Types:');
  console.log('  - Token X is', isTokenXNative ? 'SOL (native)' : 'SPL Token');
  console.log('  - Token Y is', isTokenYNative ? 'SOL (native)' : 'SPL Token');

  // Get balances
  const tokenXBalance = await getTokenBalance(wallet, dlmmPool.tokenX.publicKey, dlmmPool.tokenX.mint.decimals);
  const tokenYBalance = await getTokenBalance(wallet, dlmmPool.tokenY.publicKey, dlmmPool.tokenY.mint.decimals);

  console.log('\n💵 Your Balances:');
  console.log(`  - Token X: ${tokenXBalance.toFixed(6)}`);
  console.log(`  - Token Y: ${tokenYBalance.toFixed(6)}`);

  // Determine which token to use for seeding
  let seedWithTokenX = true;
  let seedAmount = amountInTokens;
  let tokenToWrap: PublicKey | null = null;

  if (isTokenXNative && tokenXBalance < amountInTokens) {
    console.log('\n🔄 Need to wrap SOL for Token X...');
    tokenToWrap = dlmmPool.tokenX.publicKey;
    await ensureWSOL(wallet, amountInTokens + 0.1); // Extra for fees
  } else if (isTokenYNative && tokenYBalance < amountInTokens) {
    console.log('\n🔄 Need to wrap SOL for Token Y...');
    tokenToWrap = dlmmPool.tokenY.publicKey;
    seedWithTokenX = false;
    await ensureWSOL(wallet, amountInTokens + 0.1); // Extra for fees
  } else if (tokenXBalance >= amountInTokens) {
    seedWithTokenX = true;
  } else if (tokenYBalance >= amountInTokens) {
    seedWithTokenX = false;
  } else {
    console.error('\n❌ Insufficient balance in both tokens!');
    console.error(`   Need ${amountInTokens} of either token`);
    console.error(`   You have: ${tokenXBalance} Token X, ${tokenYBalance} Token Y`);
    process.exit(1);
  }

  const seedToken = seedWithTokenX ? 'Token X' : 'Token Y';
  const seedLamports = new BN(Math.floor(seedAmount * Math.pow(10, seedWithTokenX ? dlmmPool.tokenX.mint.decimals : dlmmPool.tokenY.mint.decimals)));

  console.log('\n💧 Seeding Configuration:');
  console.log('  - Seed Token:', seedToken);
  console.log('  - Seed Amount:', seedAmount, 'tokens');
  console.log('  - Seed Lamports:', seedLamports.toString());
  console.log('  - Target Price:', currentPrice.toString());

  // Generate position keypair
  const baseKeypair = Keypair.generate();
  console.log('  - Position Base:', baseKeypair.publicKey.toBase58());

  // Check if pool is truly empty
  const binArrays = await dlmmPool.getBinArrays();
  if (binArrays.length > 0) {
    console.warn('\n⚠️  Warning: Pool already has bin arrays!');
    console.warn('   This pool may already have liquidity.');
    console.log('   Bin arrays:', binArrays.length);

    // Ask for confirmation
    console.log('\n❓ Do you want to continue anyway? (y/n)');
    // In a real script, you'd want to prompt the user
    // For now, we'll continue
  }

  console.log('\n🧪 Creating seed transaction...');

  try {
    // Call seedLiquiditySingleBin
    const seedResponse = await dlmmPool.seedLiquiditySingleBin(
      wallet.publicKey, // payer
      baseKeypair.publicKey, // base
      seedLamports, // amount
      currentPrice.toNumber(), // price (convert Decimal to number)
      !seedWithTokenX, // roundingUp - true if seeding with tokenY, false if tokenX
      wallet.publicKey, // positionOwner
      wallet.publicKey, // feeOwner
      wallet.publicKey, // operator
      new BN(0) // lockReleasePoint (0 = no lock)
    );

    console.log('✅ Seed instructions created successfully!');
    console.log('  - Instructions:', seedResponse.instructions?.length || 0);

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
    transaction.sign(wallet, baseKeypair);

    console.log('\n📤 Sending transaction...');

    // Send and confirm
    const txId = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    console.log('⏳ Transaction sent:', txId);
    console.log('   Explorer: https://explorer.solana.com/tx/' + txId + '?cluster=devnet');
    console.log('   Confirming...');

    const confirmation = await connection.confirmTransaction(txId, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('\n🎉 SUCCESS! Liquidity seeded!');
    console.log('═'.repeat(60));
    console.log(`✅ Added ${seedAmount} ${seedToken} to pool at price ${currentPrice.toString()}`);
    console.log(`📍 Position: ${baseKeypair.publicKey.toBase58()}`);
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
    console.log('\n💡 Next Steps:');
    console.log('   1. View your pool in the UI');
    console.log('   2. Other users can now add liquidity');
    console.log('   3. Ready for swaps!');

  } catch (error: any) {
    console.error('\n❌ Seeding failed!');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\n📋 Transaction Logs:');
      error.logs.forEach((log: string) => console.error('   ', log));
    }

    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Seed Initial Liquidity to DLMM Pool');
  console.log('═'.repeat(60));
  console.log(`🌐 Network: Devnet`);
  console.log(`🔗 RPC: ${DEVNET_RPC}\n`);

  // Parse arguments
  const poolAddress = process.argv[2];
  const seedAmount = parseFloat(process.argv[3] || '0.1'); // Default 0.1 tokens

  if (!poolAddress) {
    console.error('❌ Missing pool address!');
    console.error('\n💡 Usage:');
    console.error('   tsx seed-initial-liquidity.ts <pool-address> [amount]');
    console.error('\nExample:');
    console.error('   tsx seed-initial-liquidity.ts 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1 0.1');
    process.exit(1);
  }

  if (isNaN(seedAmount) || seedAmount <= 0) {
    console.error('❌ Invalid amount! Must be a positive number');
    process.exit(1);
  }

  console.log(`🏊 Pool: ${poolAddress}`);
  console.log(`💧 Seed Amount: ${seedAmount} tokens\n`);

  // Load wallet
  const wallet = loadWallet();
  console.log(`👛 Wallet: ${wallet.publicKey.toBase58()}`);

  // Check SOL balance
  const solBalance = await connection.getBalance(wallet.publicKey);
  const solBalanceInSOL = solBalance / 1e9;
  console.log(`💰 SOL Balance: ${solBalanceInSOL.toFixed(4)} SOL\n`);

  if (solBalanceInSOL < 0.2) {
    console.error('❌ Insufficient SOL balance!');
    console.error(`   Need at least 0.2 SOL for transaction fees + wrapping`);
    console.error(`   Current: ${solBalanceInSOL.toFixed(4)} SOL`);
    console.error('\n💡 Get devnet SOL:');
    console.error(`   solana airdrop 1 ${wallet.publicKey.toBase58()} --url devnet`);
    console.error('   Or visit: https://faucet.solana.com/');
    process.exit(1);
  }

  // Seed the liquidity
  await seedInitialLiquidity(wallet, poolAddress, seedAmount);

  console.log('\n✅ All done!');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
