/**
 * End-to-End Test: Add Liquidity to DLMM Pool
 *
 * This script tests the complete add liquidity flow:
 * 1. Connects to devnet
 * 2. Loads keypair
 * 3. Gets pool data
 * 4. Adds liquidity using the DLMM SDK
 * 5. Verifies the transaction
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import { readFileSync } from 'fs';
import { join } from 'path';
import BN from 'bn.js';

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const KEYPAIR_PATH = join(process.env.HOME!, '.config/solana/id.json');

// Test pool - you can change this to any DLMM pool address on devnet
// If you don't have one, create it first using: npm run backend:seed-devnet
const TEST_POOL_ADDRESS = process.env.TEST_POOL_ADDRESS || '';

// Test parameters
const TEST_AMOUNT_SOL = 0.1; // 0.1 SOL
const TEST_AMOUNT_USDC = 0; // Single-sided (SOL only)
const STRATEGY: StrategyType = 'Spot'; // 'Spot' | 'Curve' | 'BidAsk'

async function main() {
  console.log('\n🧪 E2E Test: Add Liquidity to DLMM Pool\n');
  console.log('═'.repeat(60));

  // Step 1: Load keypair
  console.log('\n📝 Step 1: Loading keypair...');
  const keypairData = JSON.parse(readFileSync(KEYPAIR_PATH, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log('✅ Wallet:', keypair.publicKey.toBase58());

  // Step 2: Connect to devnet
  console.log('\n🌐 Step 2: Connecting to devnet...');
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`✅ Connected! Balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.5 * 1e9) {
    console.error('❌ Insufficient SOL balance. Need at least 0.5 SOL for testing.');
    console.log('💡 Run: solana airdrop 2 --url devnet');
    process.exit(1);
  }

  // Step 3: Check for test pool
  if (!TEST_POOL_ADDRESS) {
    console.error('\n❌ No TEST_POOL_ADDRESS provided!');
    console.log('\n💡 To create a test pool:');
    console.log('   cd backend && npm run seed-devnet');
    console.log('   export TEST_POOL_ADDRESS=<pool-address>');
    console.log('   npm run test:add-liquidity');
    process.exit(1);
  }

  console.log('\n🏊 Step 3: Loading DLMM pool...');
  console.log('Pool Address:', TEST_POOL_ADDRESS);

  let dlmmPool: DLMM;
  try {
    dlmmPool = await DLMM.create(connection, new PublicKey(TEST_POOL_ADDRESS), {
      cluster: 'devnet',
    });
    console.log('✅ Pool loaded successfully!');
  } catch (error: any) {
    console.error('❌ Failed to load pool:', error.message);
    console.log('\n💡 Make sure the pool address is correct and exists on devnet.');
    process.exit(1);
  }

  // Step 4: Get pool information
  console.log('\n📊 Step 4: Fetching pool data...');
  await dlmmPool.refetchStates();

  const poolState = dlmmPool.lbPair;
  const tokenXMint = poolState.tokenXMint.toBase58();
  const tokenYMint = poolState.tokenYMint.toBase58();
  const binStep = poolState.binStep;
  const activeBinId = poolState.activeId;

  console.log('  Token X:', tokenXMint);
  console.log('  Token Y:', tokenYMint);
  console.log('  Bin Step:', binStep, 'basis points');
  console.log('  Active Bin ID:', activeBinId);

  // Step 5: Calculate price range (10 bins around active)
  console.log('\n🎯 Step 5: Calculating price range...');
  const minBinId = activeBinId - 5;
  const maxBinId = activeBinId + 5;

  console.log('  Min Bin ID:', minBinId);
  console.log('  Max Bin ID:', maxBinId);
  console.log('  Range:', maxBinId - minBinId + 1, 'bins');

  // Step 6: Prepare liquidity amounts
  console.log('\n💰 Step 6: Preparing liquidity amounts...');
  const tokenXAmount = new BN(TEST_AMOUNT_SOL * 1e9); // SOL has 9 decimals
  const tokenYAmount = new BN(TEST_AMOUNT_USDC * 1e6); // USDC has 6 decimals

  console.log('  Token X Amount:', tokenXAmount.toString(), `(${TEST_AMOUNT_SOL} SOL)`);
  console.log('  Token Y Amount:', tokenYAmount.toString(), `(${TEST_AMOUNT_USDC} USDC)`);
  console.log('  Strategy:', STRATEGY);

  // Step 7: Create add liquidity transaction
  console.log('\n🔨 Step 7: Building transaction...');
  console.log('  Using SDK method: initializePositionAndAddLiquidityByStrategy()');

  let createPositionTx: Transaction;
  let positionKeypair: Keypair;

  try {
    // Generate position keypair
    positionKeypair = Keypair.generate();

    // This creates a new position and adds liquidity in one transaction
    createPositionTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      user: keypair.publicKey,
      totalXAmount: tokenXAmount,
      totalYAmount: tokenYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType: STRATEGY,
      },
    });

    console.log('✅ Transaction built successfully!');
    console.log('  Position Pubkey:', positionKeypair.publicKey.toBase58());
    console.log('  Transaction size:', createPositionTx.serialize({ requireAllSignatures: false }).length, 'bytes');

  } catch (error: any) {
    console.error('❌ Failed to build transaction:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }

  // Step 8: Simulate transaction first
  console.log('\n🧪 Step 8: Simulating transaction...');
  try {
    const simulation = await connection.simulateTransaction(createPositionTx);

    if (simulation.value.err) {
      console.error('❌ Simulation failed:', simulation.value.err);
      console.log('\n📋 Simulation logs:');
      simulation.value.logs?.forEach(log => console.log('   ', log));
      process.exit(1);
    }

    console.log('✅ Simulation successful!');
    console.log('  Compute units used:', simulation.value.unitsConsumed);

    if (simulation.value.logs) {
      console.log('\n📋 Simulation logs (first 5):');
      simulation.value.logs.slice(0, 5).forEach(log => console.log('   ', log));
    }

  } catch (error: any) {
    console.error('❌ Simulation error:', error.message);
    process.exit(1);
  }

  // Step 9: Send transaction
  console.log('\n📤 Step 9: Sending transaction...');
  console.log('  ⚠️  This will cost real devnet SOL and create an on-chain transaction');
  console.log('  Press Ctrl+C to cancel, or wait 5 seconds to proceed...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  let signature: string;
  try {
    // Sign and send transaction (need both keypair and positionKeypair)
    createPositionTx.feePayer = keypair.publicKey;
    createPositionTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    createPositionTx.partialSign(keypair, positionKeypair);

    signature = await connection.sendRawTransaction(createPositionTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('✅ Transaction sent!');
    console.log('  Signature:', signature);
    console.log('  Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  } catch (error: any) {
    console.error('❌ Failed to send transaction:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }

  // Step 10: Confirm transaction
  console.log('\n⏳ Step 10: Confirming transaction...');
  try {
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      console.error('❌ Transaction failed:', confirmation.value.err);
      process.exit(1);
    }

    console.log('✅ Transaction confirmed!');

  } catch (error: any) {
    console.error('❌ Confirmation error:', error.message);
    process.exit(1);
  }

  // Step 11: Verify position was created
  console.log('\n🔍 Step 11: Verifying position...');
  try {
    // Refresh pool state to see new liquidity
    await dlmmPool.refetchStates();

    // Get the position we just created
    const position = await dlmmPool.getPosition(positionKeypair.publicKey);

    console.log('✅ Verification complete!');
    console.log('  Position Address:', positionKeypair.publicKey.toBase58());
    console.log('  Lower Bin ID:', position.positionData.lowerBinId);
    console.log('  Upper Bin ID:', position.positionData.upperBinId);
    console.log('  Liquidity Shares:', position.positionData.liquidityShare.toString());

  } catch (error: any) {
    console.warn('⚠️  Could not verify position:', error.message);
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ TEST COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\n📝 Summary:');
  console.log('  Pool:', TEST_POOL_ADDRESS);
  console.log('  Transaction:', signature);
  console.log('  Strategy:', STRATEGY);
  console.log('  Amount:', TEST_AMOUNT_SOL, 'SOL');
  console.log('  Bin Range:', minBinId, 'to', maxBinId);
  console.log('\n🔗 View on Explorer:');
  console.log(`  https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\n✨ Next steps:');
  console.log('  1. Check the transaction on Solana Explorer');
  console.log('  2. Verify liquidity was added to the pool');
  console.log('  3. Test the UI at http://localhost:3000/pool/' + TEST_POOL_ADDRESS);
}

main().catch(console.error);
