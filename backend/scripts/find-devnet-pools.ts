#!/usr/bin/env tsx
/**
 * Find Active DLMM Pools on Devnet
 *
 * Queries pools and checks for liquidity to find active test pools
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// Known devnet pool addresses from docs/testing
const KNOWN_POOLS = [
  '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1', // TESTA/custom (your pool - empty)
  // Add any other known devnet pools here
];

async function checkPoolLiquidity(connection: Connection, poolAddress: string) {
  try {
    const dlmmPool = await DLMM.create(
      connection,
      new PublicKey(poolAddress),
      { cluster: 'devnet' }
    );

    // Refresh pool state to access lbPair properties
    await dlmmPool.refetchStates();
    const poolState = dlmmPool.lbPair;
    const binArrays = await dlmmPool.getBinArrays();

    const hasLiquidity = binArrays.length > 0;
    const activeBinId = poolState.activeId;
    const binStep = poolState.binStep;

    return {
      address: poolAddress,
      hasLiquidity,
      binArrays: binArrays.length,
      tokenX: poolState.tokenXMint.toBase58(),
      tokenY: poolState.tokenYMint.toBase58(),
      activeBinId,
      binStep,
      activationPoint: poolState.activationPoint?.toString() || 'null',
    };
  } catch (error: any) {
    return {
      address: poolAddress,
      error: error.message,
    };
  }
}

async function findActivePools() {
  console.log('🔍 Searching for active DLMM pools on devnet...\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  const results = [];
  for (const poolAddress of KNOWN_POOLS) {
    console.log(`Checking pool: ${poolAddress}`);
    const info = await checkPoolLiquidity(connection, poolAddress);
    results.push(info);

    if ('error' in info) {
      console.log(`  ❌ Error: ${info.error}\n`);
    } else {
      console.log(`  Token X: ${info.tokenX}`);
      console.log(`  Token Y: ${info.tokenY}`);
      console.log(`  Has Liquidity: ${info.hasLiquidity ? '✅ YES' : '❌ NO'}`);
      console.log(`  Bin Arrays: ${info.binArrays}`);
      console.log(`  Active Bin: ${info.activeBinId}`);
      console.log(`  Bin Step: ${info.binStep}`);
      console.log();
    }
  }

  // Summary
  console.log('=' .repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const withLiquidity = results.filter(r => !('error' in r) && r.hasLiquidity);
  const empty = results.filter(r => !('error' in r) && !r.hasLiquidity);
  const errors = results.filter(r => 'error' in r);

  console.log(`\n✅ Pools with liquidity: ${withLiquidity.length}`);
  withLiquidity.forEach(p => {
    console.log(`   - ${p.address}`);
  });

  console.log(`\n❌ Empty pools: ${empty.length}`);
  empty.forEach(p => {
    console.log(`   - ${p.address}`);
  });

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors: ${errors.length}`);
    errors.forEach(p => {
      console.log(`   - ${p.address}: ${p.error}`);
    });
  }

  if (withLiquidity.length === 0) {
    console.log('\n💡 No active pools found. You can:');
    console.log('   1. Create a new test pool with backend script');
    console.log('   2. Use the existing pool after seeding liquidity');
    console.log('   3. Check Meteora Discord for devnet test pools');
  }
}

findActivePools().catch(console.error);
