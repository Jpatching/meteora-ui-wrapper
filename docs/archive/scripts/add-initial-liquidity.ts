#!/usr/bin/env tsx
/**
 * Add Initial Liquidity to Permissionless DLMM Pool
 *
 * This uses the regular initializePositionAndAddLiquidityByStrategy method
 * which works for permissionless pools (no operator required).
 */

import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const POOL_ADDRESS = '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1';

function loadWallet(): Keypair {
  const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

async function addInitialLiquidity() {
  console.log('🌱 Adding Initial Liquidity to Permissionless Pool');
  console.log('═'.repeat(60));

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = loadWallet();

  console.log('\n👛 Wallet:', wallet.publicKey.toBase58());

  // Check SOL balance
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log('💰 SOL Balance:', (solBalance / 1e9).toFixed(4), 'SOL\n');

  if (solBalance < 0.2e9) {
    console.error('❌ Need at least 0.2 SOL for transaction fees');
    process.exit(1);
  }

  // Load pool
  console.log('📊 Loading pool...');
  const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), { cluster: 'devnet' });
  const poolState = dlmmPool.lbPair;

  console.log('Pool Info:');
  console.log('  - Token X:', dlmmPool.tokenX.publicKey.toBase58());
  console.log('  - Token Y:', dlmmPool.tokenY.publicKey.toBase58());
  console.log('  - Active Bin:', poolState.activeId);
  console.log('  - Bin Step:', poolState.binStep);

  // Calculate safe price range (narrow, safe for testing)
  const activeBinId = poolState.activeId;
  const minBinId = activeBinId; // Start at active bin
  const maxBinId = activeBinId + 10; // 10 bins above

  console.log('\n📐 Liquidity Configuration:');
  console.log('  - Strategy: Spot Balanced');
  console.log('  - Bin Range:', minBinId, 'to', maxBinId, '(11 bins total)');
  console.log('  - Token X Amount: 1 token');
  console.log('  - Token Y Amount: 1 token');

  // Generate position keypair
  const positionKeypair = Keypair.generate();
  console.log('  - Position:', positionKeypair.publicKey.toBase58());

  // Prepare amounts (1 of each token, assuming 9 decimals)
  const tokenXAmount = new BN(1_000_000_000); // 1 with 9 decimals
  const tokenYAmount = new BN(1_000_000_000); // 1 with 9 decimals

  console.log('\n🧪 Creating add liquidity transaction...');

  try {
    const liquidityParams = {
      positionPubKey: positionKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount: tokenXAmount,
      totalYAmount: tokenYAmount,
      strategy: {
        minBinId,
        maxBinId,
        strategyType: StrategyType.Spot,
      },
    };

    const { instructions } = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);

    console.log('✅ Instructions created:', instructions.length);

    // Build transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = wallet.publicKey;

    // Add liquidity instructions (SDK already includes compute budget)
    transaction.add(...instructions);

    // Sign transaction
    transaction.sign(wallet, positionKeypair);

    console.log('\n📤 Sending transaction...');

    // Send transaction
    const txId = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    console.log('⏳ Transaction sent:', txId);
    console.log('   Explorer: https://explorer.solana.com/tx/' + txId + '?cluster=devnet');
    console.log('   Confirming...');

    // Confirm transaction
    const confirmation = await connection.confirmTransaction(
      {
        signature: txId,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('\n🎉 SUCCESS! Liquidity added!');
    console.log('═'.repeat(60));
    console.log(`✅ Added 0.1 Token X + 0.1 Token Y to pool`);
    console.log(`📍 Position: ${positionKeypair.publicKey.toBase58()}`);
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
    console.log('\n💡 Next Steps:');
    console.log('   1. View your pool in the UI');
    console.log('   2. Check the liquidity distribution chart');
    console.log('   3. Try adding more liquidity');
    console.log('   4. Test swaps!');

  } catch (error: any) {
    console.error('\n❌ Failed to add liquidity!');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\n📋 Transaction Logs:');
      error.logs.forEach((log: string) => console.error('   ', log));
    }

    throw error;
  }
}

// Run
addInitialLiquidity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
