/**
 * Direct SDK Test - Create DLMM Pool and Test Add Liquidity
 *
 * This uses the Meteora SDK directly without needing meteora-invent CLI
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import DLMM from '@meteora-ag/dlmm';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const USDC_DEVNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function loadKeypair(): Promise<Keypair> {
  const keypairPath = `${homedir()}/.config/solana/id.json`;
  const secretKey = JSON.parse(readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function createTestPool() {
  console.log('🧪 DLMM Pool Creation - Direct SDK Test\n');
  console.log('========================================\n');

  // 1. Setup
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const payer = await loadKeypair();

  console.log(`Wallet: ${payer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.5e9) {
    console.log('⚠️  Low SOL balance. Get airdrop:');
    console.log(`   solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet\n`);
    return;
  }

  // 2. Create pool using SDK
  console.log('📋 Pool Configuration:');
  console.log('  Base Token: [You need to specify]');
  console.log('  Quote Token: USDC (devnet)');
  console.log('  Bin Step: 25 (0.25%)');
  console.log('  Initial Price: 1.0');
  console.log('  Activation: Instant\n');

  console.log('⚠️  To create a pool, you need a base token mint.');
  console.log('   Option 1: Use UI at http://localhost:3000/dlmm/create-pool');
  console.log('   Option 2: Create token first, then update this script\n');

  // Example of how to interact with existing pool
  console.log('📖 To test with existing pool:');
  console.log('   1. Create pool via UI');
  console.log('   2. Copy pool address');
  console.log('   3. Test add liquidity via UI');
  console.log('   4. Verify safety features work\n');

  console.log('✅ Testing Plan:');
  console.log('   □ Create pool (use UI: /dlmm/create-pool)');
  console.log('   □ Navigate to pool page');
  console.log('   □ Test Spot strategy (10 bins) - should work');
  console.log('   □ Test Curve strategy (20 bins) - should work');
  console.log('   □ Test manual wide range (>20 bins) - should block');
  console.log('   □ Verify safety indicator works');
  console.log('   □ Submit safe range transaction');
  console.log('   □ Verify liquidity added successfully\n');
}

async function testExistingPool(poolAddress: string) {
  console.log(`\n🔍 Testing pool: ${poolAddress}\n`);

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const payer = await loadKeypair();

  try {
    // Load pool using SDK
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress));

    // Refresh pool state to access lbPair properties
    await dlmmPool.refetchStates();

    console.log('✅ Pool loaded successfully!');
    console.log(`   Active Bin: ${dlmmPool.lbPair.activeId}`);
    console.log(`   Bin Step: ${dlmmPool.lbPair.binStep}`);

    const activeBin = await dlmmPool.getActiveBin();
    console.log(`   Current Price: ${activeBin.price}\n`);

    console.log('📊 Pool Info:');
    console.log(`   Token X: ${dlmmPool.lbPair.tokenXMint.toBase58()}`);
    console.log(`   Token Y: ${dlmmPool.lbPair.tokenYMint.toBase58()}`);
    console.log(`   Pool Address: ${poolAddress}\n`);

    console.log('🔗 Quick Links:');
    console.log(`   UI: http://localhost:3000/pool/${poolAddress}`);
    console.log(`   Solscan: https://solscan.io/account/${poolAddress}?cluster=devnet\n`);

    console.log('✅ Pool is ready for testing add liquidity!');
    console.log('   Open the UI link above and test the safety features.');

  } catch (error) {
    console.error('❌ Error loading pool:', error);
    console.log('\nMake sure:');
    console.log('  1. Pool address is correct');
    console.log('  2. Pool exists on devnet');
    console.log('  3. RPC is responding');
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await createTestPool();
  } else if (args[0]) {
    await testExistingPool(args[0]);
  }
}

main().catch(console.error);
