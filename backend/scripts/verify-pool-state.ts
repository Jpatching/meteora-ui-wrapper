#!/usr/bin/env tsx
/**
 * Pool State Verification Script
 *
 * Verifies the state of a DLMM pool on devnet:
 * - Connects to the pool
 * - Fetches pool metadata (tokens, active bin, bin step)
 * - Checks bin arrays (liquidity status)
 * - Displays current price and pool readiness
 *
 * Usage:
 *   npx tsx scripts/verify-pool-state.ts [POOL_ADDRESS]
 *
 * Docker:
 *   docker-compose run --rm scripts npm run verify-pool [POOL_ADDRESS]
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com';
const DEFAULT_POOL = 'BaRNjhKRRyKe4pfoenvNZfjtFfba7DG8ezQUDKPyJHsf'; // From transaction

async function verifyPoolState(poolAddress: string) {
  console.log('\n🔍 Pool State Verification\n');
  console.log('━'.repeat(60));
  console.log(`📍 Pool Address: ${poolAddress}`);
  console.log(`🌐 Network: Devnet`);
  console.log(`🔗 RPC: ${DEVNET_RPC.split('?')[0]}...`);
  console.log('━'.repeat(60));

  try {
    // Initialize connection
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    console.log('\n✅ Connection established');

    // Check if pool account exists
    const poolPubkey = new PublicKey(poolAddress);
    const accountInfo = await connection.getAccountInfo(poolPubkey);

    if (!accountInfo) {
      console.error('\n❌ Pool account does not exist!');
      console.log('   The pool address may be incorrect or the pool was not created.');
      process.exit(1);
    }

    console.log('✅ Pool account exists');

    // Create DLMM instance
    console.log('\n📦 Loading pool data...');
    const dlmmPool = await DLMM.create(connection, poolPubkey, {
      cluster: 'devnet',
    });

    console.log('✅ Pool data loaded');

    // Refresh pool state to access lbPair properties
    await dlmmPool.refetchStates();

    // Get pool state
    const poolState = dlmmPool.lbPair;
    const activeBinId = poolState.activeId;
    const binStep = poolState.binStep;

    console.log('\n📊 Pool Configuration:');
    console.log('━'.repeat(60));
    console.log(`   Bin Step: ${binStep} (${(binStep / 100).toFixed(2)}%)`);
    console.log(`   Active Bin ID: ${activeBinId}`);
    console.log(`   Base Fee BPS: ${poolState.parameters.baseFactor}`);

    // Get token information
    const tokenXMint = poolState.tokenXMint;
    const tokenYMint = poolState.tokenYMint;

    console.log('\n💰 Token Pair:');
    console.log('━'.repeat(60));
    console.log(`   Token X (Base):`);
    console.log(`      Mint: ${tokenXMint.toBase58()}`);
    console.log(`   Token Y (Quote):`);
    console.log(`      Mint: ${tokenYMint.toBase58()}`);

    // Check if Token Y is WSOL
    const isWSOL = tokenYMint.toBase58() === 'So11111111111111111111111111111111111111112';
    if (isWSOL) {
      console.log(`      (Native SOL/WSOL)`);
    }

    // Calculate current price
    try {
      const priceDecimal = getPriceOfBinByBinId(activeBinId, binStep);
      const priceString = dlmmPool.fromPricePerLamport(priceDecimal.toNumber());
      const price = parseFloat(priceString);

      console.log('\n💵 Current Price:');
      console.log('━'.repeat(60));
      console.log(`   1 Token X = ${price.toFixed(9)} Token Y`);
      console.log(`   1 Token Y = ${(1 / price).toFixed(9)} Token X`);
    } catch (error) {
      console.log('\n⚠️  Could not calculate price (this is normal for new pools)');
    }

    // Get bin arrays (liquidity data)
    console.log('\n🗂️  Liquidity Status:');
    console.log('━'.repeat(60));
    const binArrays = await dlmmPool.getBinArrays();

    if (binArrays.length === 0) {
      console.log('   Status: EMPTY');
      console.log('   Bin Arrays: 0');
      console.log('   Ready for liquidity: ✅ YES');
      console.log('   Note: First liquidity deposit will initialize bin arrays (~0.075 SOL cost)');
    } else {
      console.log(`   Status: HAS LIQUIDITY`);
      console.log(`   Bin Arrays: ${binArrays.length}`);
      console.log('   Ready for more liquidity: ✅ YES');

      // Show bin array details
      console.log('\n   Bin Array Details:');
      binArrays.forEach((binArray, index) => {
        console.log(`      Array ${index + 1}: Index ${binArray.account.index}`);
      });
    }

    // Activation status
    console.log('\n⚡ Activation:');
    console.log('━'.repeat(60));
    const activationType = poolState.activationType;
    const activationPoint = poolState.activationPoint;

    console.log(`   Activation Type: ${activationType}`);
    console.log(`   Activation Point: ${activationPoint ? activationPoint.toString() : 'N/A'}`);

    if (activationType === 0) {
      console.log('   Note: Pool activated at creation');
    }

    // Explorer links
    console.log('\n🔗 Explorer Links:');
    console.log('━'.repeat(60));
    console.log(`   Pool: https://solscan.io/account/${poolAddress}?cluster=devnet`);
    console.log(`   Token X: https://solscan.io/token/${tokenXMint.toBase58()}?cluster=devnet`);
    console.log(`   Token Y: https://solscan.io/token/${tokenYMint.toBase58()}?cluster=devnet`);

    console.log('\n✅ Pool verification complete!\n');

    return {
      success: true,
      poolAddress,
      tokenX: tokenXMint.toBase58(),
      tokenY: tokenYMint.toBase58(),
      activeBinId,
      binStep,
      hasLiquidity: binArrays.length > 0,
      binArrayCount: binArrays.length,
    };

  } catch (error) {
    console.error('\n❌ Error verifying pool:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const poolAddress = process.argv[2] || DEFAULT_POOL;

  if (!poolAddress) {
    console.error('Usage: npx tsx scripts/verify-pool-state.ts [POOL_ADDRESS]');
    process.exit(1);
  }

  verifyPoolState(poolAddress)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { verifyPoolState };
