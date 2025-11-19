#!/usr/bin/env tsx
/**
 * Complete Devnet Pool Setup Script
 *
 * This script performs the complete workflow:
 * 1. Verifies pool exists on-chain
 * 2. Adds pool to backend database for UI visibility
 * 3. Adds initial liquidity to the pool
 * 4. Verifies everything is working
 *
 * Usage:
 *   npx tsx scripts/setup-devnet-pool.ts
 *
 * Environment Requirements:
 *   - NEXT_PUBLIC_DEVNET_RPC: Devnet RPC endpoint
 *   - NEXT_PUBLIC_BACKEND_URL: Backend API URL (default: http://localhost:4000)
 *   - Wallet keypair with devnet SOL and tokens
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import BN from 'bn.js';
import dotenv from 'dotenv';
import fetch from 'cross-fetch';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const POOL_ADDRESS = 'BaRNjhKRRyKe4pfoenvNZfjtFfba7DG8ezQUDKPyJHsf';
const TOKEN_X = 'GRuDxMiWYixDppWMDKhBTSUKwczjhywQxURfwuQ88qhm';
const TOKEN_Y_WSOL = 'So11111111111111111111111111111111111111112';

const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Amount to add (in smallest units - lamports/smallest decimal)
// For testing: 0.1 tokens each (adjust based on decimals)
const LIQUIDITY_AMOUNT_X = '100000000'; // 0.1 tokens (9 decimals)
const LIQUIDITY_AMOUNT_Y = '100000000'; // 0.1 SOL (9 decimals)

interface PoolVerification {
  exists: boolean;
  tokenX: string;
  tokenY: string;
  activeBinId: number;
  binStep: number;
  hasLiquidity: boolean;
}

/**
 * Step 1: Verify pool exists on-chain
 */
async function verifyPool(): Promise<PoolVerification> {
  console.log('\n🔍 STEP 1: Verifying Pool On-Chain');
  console.log('━'.repeat(60));

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const poolPubkey = new PublicKey(POOL_ADDRESS);

  // Check account exists
  const accountInfo = await connection.getAccountInfo(poolPubkey);
  if (!accountInfo) {
    throw new Error('Pool account does not exist on devnet!');
  }

  console.log('✅ Pool account exists');

  // Load pool data
  const dlmmPool = await DLMM.create(connection, poolPubkey, { cluster: 'devnet' });

  // Refresh pool state to access lbPair properties
  await dlmmPool.refetchStates();
  const poolState = dlmmPool.lbPair;
  const binArrays = await dlmmPool.getBinArrays();

  const result: PoolVerification = {
    exists: true,
    tokenX: poolState.tokenXMint.toBase58(),
    tokenY: poolState.tokenYMint.toBase58(),
    activeBinId: poolState.activeId,
    binStep: poolState.binStep,
    hasLiquidity: binArrays.length > 0,
  };

  console.log('✅ Pool data loaded:');
  console.log(`   Token X: ${result.tokenX}`);
  console.log(`   Token Y: ${result.tokenY}`);
  console.log(`   Active Bin: ${result.activeBinId}`);
  console.log(`   Bin Step: ${result.binStep}`);
  console.log(`   Has Liquidity: ${result.hasLiquidity ? 'YES' : 'NO'}`);

  return result;
}

/**
 * Step 2: Add pool to backend database
 */
async function addPoolToDatabase(): Promise<boolean> {
  console.log('\n📊 STEP 2: Adding Pool to Backend Database');
  console.log('━'.repeat(60));

  try {
    const response = await fetch(`${BACKEND_URL}/api/pools/devnet/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: POOL_ADDRESS,
        protocol: 'dlmm',
        name: 'Custom Token / SOL', // Optional: will be auto-generated if not provided
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Pool added to database successfully');
      console.log(`   Address: ${result.address}`);
      console.log(`   Protocol: ${result.protocol}`);
      return true;
    } else {
      console.error('❌ Failed to add pool to database:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error connecting to backend:', error);
    console.log('⚠️  Make sure backend is running: docker-compose up -d');
    return false;
  }
}

/**
 * Step 3: Load wallet keypair
 */
function loadWalletKeypair(): Keypair {
  console.log('\n🔑 STEP 3: Loading Wallet Keypair');
  console.log('━'.repeat(60));

  // Try common wallet locations
  const possiblePaths = [
    path.join(os.homedir(), '.config', 'solana', 'id.json'),
    path.join(os.homedir(), '.config', 'solana', 'devnet.json'),
    './wallet.json',
    './keypair.json',
  ];

  for (const walletPath of possiblePaths) {
    if (fs.existsSync(walletPath)) {
      console.log(`✅ Found wallet at: ${walletPath}`);
      const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
      return keypair;
    }
  }

  throw new Error(
    'No wallet keypair found! Please create one:\n' +
    '  solana-keygen new --outfile ~/.config/solana/devnet.json\n' +
    '  solana airdrop 2 --url devnet'
  );
}

/**
 * Step 4: Add liquidity to pool
 */
async function addLiquidity(wallet: Keypair, poolVerification: PoolVerification): Promise<boolean> {
  console.log('\n💧 STEP 4: Adding Liquidity to Pool');
  console.log('━'.repeat(60));

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const poolPubkey = new PublicKey(POOL_ADDRESS);

  // Load pool
  const dlmmPool = await DLMM.create(connection, poolPubkey, { cluster: 'devnet' });

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Wallet Balance: ${balance / 1e9} SOL`);

  if (balance < 500_000_000) { // 0.5 SOL minimum
    throw new Error('Insufficient SOL balance! Need at least 0.5 SOL for liquidity + fees');
  }

  // Generate position keypair
  const positionKeypair = Keypair.generate();
  console.log(`📍 Position Address: ${positionKeypair.publicKey.toBase58()}`);

  // Calculate safe price range around active bin
  const activeBinId = poolVerification.activeBinId;
  const minBinId = activeBinId - 5; // 5 bins below
  const maxBinId = activeBinId + 15; // 15 bins above (total 20 bins - safe limit)

  console.log(`📊 Liquidity Parameters:`);
  console.log(`   Token X Amount: ${LIQUIDITY_AMOUNT_X} (smallest units)`);
  console.log(`   Token Y Amount: ${LIQUIDITY_AMOUNT_Y} (smallest units)`);
  console.log(`   Strategy: Spot Balanced (0)`);
  console.log(`   Price Range: Bin ${minBinId} to ${maxBinId} (${maxBinId - minBinId} bins)`);
  console.log(`   Active Bin: ${activeBinId}`);

  try {
    // Create add liquidity transaction
    console.log('\n🔨 Creating transaction...');
    const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount: new BN(LIQUIDITY_AMOUNT_X),
      totalYAmount: new BN(LIQUIDITY_AMOUNT_Y),
      strategy: {
        maxBinId,
        minBinId,
        strategyType: 0, // Spot Balanced
      },
    });

    console.log(`✅ Transaction created with ${addLiquidityTx.instructions.length} instructions`);

    // Sign with position keypair
    addLiquidityTx.partialSign(positionKeypair);
    console.log('✅ Position keypair signed');

    // Sign with wallet
    addLiquidityTx.sign(wallet);
    console.log('✅ Wallet signed');

    // Send transaction
    console.log('\n📤 Sending transaction...');
    const signature = await connection.sendRawTransaction(addLiquidityTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`📝 Transaction Signature: ${signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${signature}?cluster=devnet`);

    // Confirm transaction
    console.log('⏳ Confirming transaction...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Transaction confirmed!');
    console.log(`🎉 Liquidity added successfully!`);
    console.log(`📍 Position: ${positionKeypair.publicKey.toBase58()}`);

    return true;
  } catch (error: any) {
    console.error('❌ Error adding liquidity:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    return false;
  }
}

/**
 * Step 5: Verify pool is visible in backend
 */
async function verifyBackendVisibility(): Promise<boolean> {
  console.log('\n✅ STEP 5: Verifying Backend Visibility');
  console.log('━'.repeat(60));

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/pools/${POOL_ADDRESS}?network=devnet`
    );

    const result = await response.json();

    if (result.success && result.data) {
      console.log('✅ Pool is visible in backend!');
      console.log(`   Name: ${result.data.pool_name}`);
      console.log(`   Protocol: ${result.data.protocol}`);
      console.log(`   Token A: ${result.data.token_a_symbol || result.data.token_a_mint}`);
      console.log(`   Token B: ${result.data.token_b_symbol || result.data.token_b_mint}`);
      console.log(`\n🌐 You can now view the pool in the UI:`);
      console.log(`   http://localhost:3000/pool/${POOL_ADDRESS}`);
      return true;
    } else {
      console.log('⚠️  Pool not yet visible in backend');
      console.log('   It may take a few seconds to sync');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking backend:', error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Devnet Pool Setup Script');
  console.log('━'.repeat(60));
  console.log(`Pool: ${POOL_ADDRESS}`);
  console.log(`Network: Devnet`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('━'.repeat(60));

  try {
    // Step 1: Verify pool exists
    const poolVerification = await verifyPool();

    // Step 2: Add to database
    const dbSuccess = await addPoolToDatabase();
    if (!dbSuccess) {
      console.log('\n⚠️  Continuing anyway - you can add to database later');
    }

    // Step 3: Load wallet
    const wallet = loadWalletKeypair();

    // Step 4: Add liquidity
    const liquiditySuccess = await addLiquidity(wallet, poolVerification);

    if (!liquiditySuccess) {
      console.log('\n❌ Failed to add liquidity. Check errors above.');
      process.exit(1);
    }

    // Step 5: Verify backend visibility
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for sync
    await verifyBackendVisibility();

    console.log('\n🎉 Setup Complete!');
    console.log('━'.repeat(60));
    console.log('✅ Pool verified on-chain');
    console.log('✅ Pool added to database (if backend is running)');
    console.log('✅ Liquidity added successfully');
    console.log('\n📱 Next Steps:');
    console.log('   1. Start frontend: npm run dev');
    console.log('   2. Open: http://localhost:3000');
    console.log(`   3. Navigate to: /pool/${POOL_ADDRESS}`);
    console.log('   4. Try adding more liquidity via the UI!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Execute
if (require.main === module) {
  main();
}

export { verifyPool, addPoolToDatabase, addLiquidity, verifyBackendVisibility };
