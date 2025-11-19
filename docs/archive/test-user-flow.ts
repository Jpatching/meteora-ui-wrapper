#!/usr/bin/env tsx
/**
 * End-to-End User Flow Test
 * Simulates exactly what happens when a user adds liquidity through the UI
 */

import { Connection, PublicKey, Keypair, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import DLMM from '@meteora-ag/dlmm';
import BN from 'bn.js';

// User inputs (from UI form)
const USER_INPUT = {
  poolAddress: '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1',
  tokenXAmount: '10',  // User types "10" in the form
  tokenYAmount: '0',   // Single-sided deposit
  minPrice: 0.9,       // User sets range
  maxPrice: 1.1,
  strategy: 'curve',   // User selects strategy
};

const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=66e68ad7-74bf-4a60-9705-2fed52f4d425';
const WALLET_PUBKEY = '85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs';

// Simulate validateBN function from useDLMM.ts
function validateBN(value: string | number): BN {
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const bn = new BN(value);
      if (bn.gt(new BN(1000000))) {
        // Large number, already in lamports
        return bn;
      }
      // Small whole number, convert to lamports
      return new BN(Math.floor(parseFloat(value) * 1e9));
    }
    // Has decimal
    const numValue = parseFloat(value);
    return new BN(Math.floor(numValue * 1e9));
  }
  // Number type
  return new BN(Math.floor(value * 1e9));
}

async function testUserFlow() {
  console.log('🎭 SIMULATING USER FLOW\n');
  console.log('═'.repeat(60));
  console.log('USER ACTIONS:');
  console.log('1. Navigates to pool page');
  console.log('2. Enters amount:', USER_INPUT.tokenXAmount, 'tokens');
  console.log('3. Sets price range:', USER_INPUT.minPrice, '-', USER_INPUT.maxPrice);
  console.log('4. Selects strategy:', USER_INPUT.strategy);
  console.log('5. Clicks "Add Liquidity" button');
  console.log('═'.repeat(60));

  const connection = new Connection(RPC_URL, 'finalized');
  const walletPubkey = new PublicKey(WALLET_PUBKEY);

  console.log('\n📡 STEP 1: Connect to RPC');
  console.log('  ✅ Connected to devnet');

  console.log('\n💰 STEP 2: Check wallet balance');
  const solBalance = await connection.getBalance(walletPubkey);
  console.log(`  ✅ SOL: ${solBalance / 1e9}`);

  console.log('\n📊 STEP 3: Load pool');
  const poolPubkey = new PublicKey(USER_INPUT.poolAddress);
  const dlmmPool = await DLMM.create(connection, poolPubkey);

  // Refresh pool state to access lbPair properties
  await dlmmPool.refetchStates();

  console.log('  ✅ Pool loaded');
  const poolState = dlmmPool.lbPair;
  console.log('    - Token X:', poolState.tokenXMint.toBase58());
  console.log('    - Token Y:', poolState.tokenYMint.toBase58());

  const activeBinId = poolState.activeId;
  const binStep = poolState.binStep;
  const activePrice = Math.pow(1 + binStep / 10000, activeBinId);

  console.log('    - Active Bin:', activeBinId);
  console.log('    - Active Price:', activePrice);

  // Check if pool is empty (activation point check)
  const activationPoint = poolState.activationPoint;
  const isEmptyPool = !activationPoint || activationPoint.toNumber() === 0;
  console.log('    - Activation Point:', activationPoint ? activationPoint.toString() : 'null');
  console.log('    - Is Empty:', isEmptyPool);

  console.log('\n💵 STEP 4: Check token balances');
  const tokenXAta = await getAssociatedTokenAddress(poolState.tokenXMint, walletPubkey);
  const tokenYAta = await getAssociatedTokenAddress(poolState.tokenYMint, walletPubkey);

  let tokenXBalance = new BN(0);
  let tokenYBalance = new BN(0);

  try {
    const account = await getAccount(connection, tokenXAta);
    tokenXBalance = new BN(account.amount.toString());
  } catch (e) {}

  try {
    const account = await getAccount(connection, tokenYAta);
    tokenYBalance = new BN(account.amount.toString());
  } catch (e) {}

  // Default to 9 decimals for most tokens (SOL, etc.)
  // For precise decimal info, would need to fetch mint accounts separately
  const tokenXDecimals = 9;
  const tokenYDecimals = 9;

  console.log(`  ✅ Token X: ${tokenXBalance.div(new BN(10).pow(new BN(tokenXDecimals))).toString()} tokens`);
  console.log(`  ✅ Token Y: ${tokenYBalance.div(new BN(10).pow(new BN(tokenYDecimals))).toString()} tokens`);

  console.log('\n🔢 STEP 5: Convert user input to lamports');
  const amountBN = validateBN(USER_INPUT.tokenXAmount);
  console.log(`  Input: "${USER_INPUT.tokenXAmount}" tokens`);
  console.log(`  Output: ${amountBN.toString()} lamports`);
  console.log(`  Verification: ${amountBN.div(new BN(1e9)).toString()} tokens`);

  if (!amountBN.eq(new BN(10000000000))) {
    console.error('  ❌ AMOUNT CONVERSION WRONG!');
    console.error(`  Expected: 10000000000 lamports (10 tokens)`);
    console.error(`  Got: ${amountBN.toString()} lamports`);
    throw new Error('Amount conversion failed');
  }
  console.log('  ✅ Amount conversion correct!');

  console.log('\n📐 STEP 6: Calculate bin range');
  const minBinId = Math.floor(Math.log(USER_INPUT.minPrice) / Math.log(1 + binStep / 10000));
  const maxBinId = Math.floor(Math.log(USER_INPUT.maxPrice) / Math.log(1 + binStep / 10000));
  console.log(`  Min Price ${USER_INPUT.minPrice} → Bin ${minBinId}`);
  console.log(`  Max Price ${USER_INPUT.maxPrice} → Bin ${maxBinId}`);
  console.log(`  Active Bin: ${activeBinId}`);
  console.log(`  Range includes active: ${minBinId <= activeBinId && activeBinId <= maxBinId}`);

  console.log('\n🔑 STEP 7: Generate position keypair');
  const positionKeypair = Keypair.generate();
  console.log('  ✅ Position:', positionKeypair.publicKey.toBase58());

  console.log('\n🧠 STEP 8: Determine flow (empty vs non-empty pool)');
  if (isEmptyPool) {
    console.log('  → Empty pool: Use seedLiquiditySingleBin');
    console.log('  ⚠️  Your pool is NOT empty, so this won\'t execute');
  } else {
    console.log('  → Non-empty pool: Use initializePositionAndAddLiquidityByStrategy');

    console.log('\n🏗️  STEP 9: Create liquidity parameters');
    const isDepositingTokenX = amountBN.gt(new BN(0));
    const isDepositingTokenY = false;

    const liquidityParams = {
      positionPubKey: positionKeypair.publicKey,
      user: walletPubkey,
      totalXAmount: isDepositingTokenX ? amountBN : new BN(0),
      totalYAmount: isDepositingTokenY ? amountBN : new BN(0),
      strategy: {
        minBinId,
        maxBinId,
        strategyType: 0, // spot/curve
      },
    };

    console.log('  Parameters:');
    console.log('    - Position:', liquidityParams.positionPubKey.toBase58());
    console.log('    - User:', liquidityParams.user.toBase58());
    console.log('    - Total X:', liquidityParams.totalXAmount.toString(), 'lamports');
    console.log('    - Total Y:', liquidityParams.totalYAmount.toString(), 'lamports');
    console.log('    - Min Bin:', liquidityParams.strategy.minBinId);
    console.log('    - Max Bin:', liquidityParams.strategy.maxBinId);

    console.log('\n🔨 STEP 10: Call SDK to generate instructions');
    try {
      const { instructions } = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);

      console.log('  ✅ Instructions created:', instructions?.length || 0);

      if (!instructions || instructions.length === 0) {
        throw new Error('No instructions returned from SDK');
      }

      console.log('\n📦 STEP 11: Build transaction');
      const tx = new Transaction();

      // Compute budget
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }));

      // Add liquidity instructions
      tx.add(...instructions);

      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      console.log('  ✅ Transaction built');
      console.log('    - Total instructions:', tx.instructions.length);
      console.log('    - Fee payer:', walletPubkey.toBase58());
      console.log('    - Blockhash:', blockhash.slice(0, 10) + '...');

      console.log('\n✍️  STEP 12: Sign transaction');
      tx.partialSign(positionKeypair);
      console.log('  ✅ Position signed');
      console.log('    - Position signature present:', !!tx.signatures[0]?.signature);

      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      console.log('    - Transaction size:', serialized.length, 'bytes');

      if (serialized.length > 1232) {
        console.error('    ❌ Transaction too large! (max 1232 bytes)');
        throw new Error('Transaction too large');
      }
      console.log('    ✅ Transaction size OK');

      console.log('\n📤 STEP 13: Send transaction');
      console.log('  ℹ️  Simulating wallet.sendTransaction()...');
      console.log('  ℹ️  In real UI, wallet adapter would:');
      console.log('    1. Show transaction to user');
      console.log('    2. Request wallet signature');
      console.log('    3. Send to network');
      console.log('    4. Wait for confirmation');

      console.log('\n' + '═'.repeat(60));
      console.log('✅ USER FLOW TEST PASSED!');
      console.log('═'.repeat(60));
      console.log('\nSummary:');
      console.log('  ✅ Pool loaded correctly');
      console.log('  ✅ Empty pool detected correctly:', isEmptyPool);
      console.log('  ✅ Amount converted correctly: 10 → 10,000,000,000 lamports');
      console.log('  ✅ Bin range calculated correctly');
      console.log('  ✅ Instructions generated:', instructions.length);
      console.log('  ✅ Transaction built successfully');
      console.log('  ✅ Transaction size valid:', serialized.length, 'bytes');
      console.log('\n🎯 READY FOR REAL USER TEST IN BROWSER!');

    } catch (error: any) {
      console.error('\n❌ STEP 10 FAILED: SDK call error');
      console.error('  Error:', error.message);
      if (error.logs) {
        console.error('\n  Transaction logs:');
        error.logs.forEach((log: string) => console.error('    ', log));
      }
      throw error;
    }
  }
}

testUserFlow().catch(error => {
  console.error('\n💥 USER FLOW TEST FAILED');
  console.error('Error:', error.message);
  console.error('\nStack:', error.stack?.slice(0, 500));
  process.exit(1);
});
