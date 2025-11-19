#!/usr/bin/env tsx
/**
 * Seed Liquidity to Existing DLMM Pool
 *
 * For permissionless pools, uses initializePositionAndAddLiquidityByStrategy
 * which is the standard method for adding liquidity (no operator required)
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
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

async function seedLiquidity() {
  console.log('🌱 Seeding Liquidity to DLMM Pool');
  console.log('═'.repeat(60));

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = loadWallet();

  console.log('\n👛 Wallet:', wallet.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 SOL Balance:', (balance / 1e9).toFixed(4), 'SOL');

  if (balance < 0.5e9) {
    console.error('\n❌ Need at least 0.5 SOL');
    console.error('Run: solana airdrop 1 --url devnet');
    process.exit(1);
  }

  // Load pool
  console.log('\n📊 Loading pool...');
  const dlmmPool = await DLMM.create(
    connection,
    new PublicKey(POOL_ADDRESS),
    { cluster: 'devnet' }
  );

  // Refresh pool state to access lbPair properties
  await dlmmPool.refetchStates();
  const poolState = dlmmPool.lbPair;
  console.log('Pool Info:');
  console.log('  - Token X:', poolState.tokenXMint.toBase58());
  console.log('  - Token Y:', poolState.tokenYMint.toBase58());
  console.log('  - Active Bin:', poolState.activeId);
  console.log('  - Bin Step:', poolState.binStep);

  // Check if pool already has liquidity
  const binArrays = await dlmmPool.getBinArrays();
  if (binArrays.length > 0) {
    console.log('\n✅ Pool already has liquidity!');
    console.log('   Bin Arrays:', binArrays.length);
    console.log('\n💡 You can now test add/remove liquidity via the UI');
    return;
  }

  console.log('\n💧 Adding initial liquidity...');
  console.log('   Amount: 10 tokens of each');
  console.log('   Strategy: Spot');
  console.log('   Bin Range: Active bin + 15 bins');

  // Create position keypair
  const positionKeypair = Keypair.generate();
  console.log('   Position:', positionKeypair.publicKey.toBase58());

  // Define strategy (safe range)
  const activeBinId = poolState.activeId;
  const strategy = {
    strategyType: StrategyType.Spot,
    minBinId: Math.max(0, activeBinId - 5), // 5 below (don't go negative)
    maxBinId: activeBinId + 15,              // 15 above
  };

  console.log('   Min Bin ID:', strategy.minBinId);
  console.log('   Max Bin ID:', strategy.maxBinId);
  console.log('   Total Bins:', strategy.maxBinId - strategy.minBinId + 1);

  // Prepare amounts (10 tokens each, 9 decimals)
  const amount = new BN(10_000_000_000); // 10 tokens

  console.log('\n🔨 Building transaction...');

  try {
    // Call SDK method (returns Transaction directly)
    const tx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      totalXAmount: amount,
      totalYAmount: amount,
      strategy,
      user: wallet.publicKey,
      slippage: 1, // 1% slippage
    });

    console.log('✅ Transaction built successfully');
    console.log('   Instructions:', tx.instructions.length);

    // Sign and send
    console.log('\n📤 Sending transaction...');
    const sig = await connection.sendTransaction(tx, [wallet, positionKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    console.log('⏳ Transaction sent:', sig);
    console.log('   Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

    // Confirm
    console.log('   Confirming...');
    await connection.confirmTransaction(sig, 'confirmed');

    console.log('\n🎉 SUCCESS! Liquidity added!');
    console.log('═'.repeat(60));
    console.log('✅ Pool now has liquidity');
    console.log('📍 Position:', positionKeypair.publicKey.toBase58());
    console.log('🔗 Transaction: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start UI: npm run dev');
    console.log('   2. Navigate to pool:', POOL_ADDRESS);
    console.log('   3. Test adding more liquidity');
    console.log('   4. Test removing liquidity');
    console.log('   5. Watch chart update in real-time!');

  } catch (error: any) {
    console.error('\n❌ Failed to add liquidity');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\n📋 Transaction Logs:');
      error.logs.slice(-20).forEach((log: string) => console.error('   ', log));
    }

    throw error;
  }
}

seedLiquidity().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
