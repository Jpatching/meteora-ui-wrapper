#!/usr/bin/env ts-node
/**
 * Create Test Pools on Devnet
 * Creates DLMM and DAMM v2 pools on devnet for testing the UI
 *
 * Usage:
 *   npm run create-devnet-pools
 *   or
 *   ts-node backend/scripts/create-devnet-pools.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Test token mints on devnet (you'll need to create these first or use existing ones)
const TEST_TOKENS = {
  // Replace with actual devnet token mints or create your own
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Example devnet USDC
};

interface PoolResult {
  protocol: 'dlmm' | 'damm-v2';
  address: string;
  name: string;
  tokenA: string;
  tokenB: string;
  success: boolean;
  error?: string;
}

/**
 * Load wallet keypair from file or environment
 */
function loadWallet(): Keypair {
  // Try to load from file
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

  try {
    if (fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      return Keypair.fromSecretKey(new Uint8Array(walletData));
    }
  } catch (error) {
    console.error('⚠️  Could not load wallet from file:', error);
  }

  // Generate a new keypair for testing
  console.log('⚠️  Generating new keypair for testing...');
  const keypair = Keypair.generate();
  console.log('💰 Public key:', keypair.publicKey.toBase58());
  console.log('⚠️  Fund this wallet with devnet SOL: https://faucet.solana.com/');
  return keypair;
}

/**
 * Create a DLMM pool on devnet
 */
async function createDLMMPool(): Promise<PoolResult> {
  console.log('\n🌊 Creating DLMM pool on devnet...');

  try {
    const wallet = loadWallet();

    // DLMM pool creation parameters
    const tokenAMint = new PublicKey(TEST_TOKENS.SOL);
    const tokenBMint = new PublicKey(TEST_TOKENS.USDC);
    const binStep = 25; // 0.25% bin step
    const initialPrice = 100; // 1 SOL = 100 USDC

    console.log('📝 Pool parameters:');
    console.log(`   Token A: ${tokenAMint.toBase58()}`);
    console.log(`   Token B: ${tokenBMint.toBase58()}`);
    console.log(`   Bin Step: ${binStep}`);
    console.log(`   Initial Price: ${initialPrice}`);

    // TODO: Use DLMM SDK to create pool
    // This is a placeholder - actual implementation would use:
    // const poolAddress = await DLMM.createPool(...)

    console.log('⚠️  DLMM pool creation not implemented yet');
    console.log('💡 Use meteora-ag/dlmm CLI or SDK to create pool');
    console.log('📚 Docs: https://docs.meteora.ag/dlmm/integration');

    return {
      protocol: 'dlmm',
      address: 'PLACEHOLDER_DLMM_POOL_ADDRESS',
      name: 'SOL-USDC',
      tokenA: tokenAMint.toBase58(),
      tokenB: tokenBMint.toBase58(),
      success: false,
      error: 'Not implemented - create pool manually using Meteora SDK',
    };
  } catch (error: any) {
    console.error('❌ Error creating DLMM pool:', error.message);
    return {
      protocol: 'dlmm',
      address: '',
      name: 'SOL-USDC',
      tokenA: TEST_TOKENS.SOL,
      tokenB: TEST_TOKENS.USDC,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a DAMM v2 pool on devnet
 */
async function createDAMMv2Pool(): Promise<PoolResult> {
  console.log('\n🌊 Creating DAMM v2 pool on devnet...');

  try {
    const wallet = loadWallet();

    // DAMM v2 pool creation parameters
    const tokenAMint = new PublicKey(TEST_TOKENS.SOL);
    const tokenBMint = new PublicKey(TEST_TOKENS.USDC);

    console.log('📝 Pool parameters:');
    console.log(`   Token A: ${tokenAMint.toBase58()}`);
    console.log(`   Token B: ${tokenBMint.toBase58()}`);

    // TODO: Use DAMM v2 SDK to create pool
    // This is a placeholder - actual implementation would use:
    // const poolAddress = await AmmImpl.createPool(...)

    console.log('⚠️  DAMM v2 pool creation not implemented yet');
    console.log('💡 Use meteora-ag/cp-amm SDK to create pool');
    console.log('📚 Docs: https://docs.meteora.ag/cp-amm/integration');

    return {
      protocol: 'damm-v2',
      address: 'PLACEHOLDER_DAMM_POOL_ADDRESS',
      name: 'SOL-USDC',
      tokenA: tokenAMint.toBase58(),
      tokenB: tokenBMint.toBase58(),
      success: false,
      error: 'Not implemented - create pool manually using Meteora SDK',
    };
  } catch (error: any) {
    console.error('❌ Error creating DAMM v2 pool:', error.message);
    return {
      protocol: 'damm-v2',
      address: '',
      name: 'SOL-USDC',
      tokenA: TEST_TOKENS.SOL,
      tokenB: TEST_TOKENS.USDC,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Creating test pools on devnet...');
  console.log(`🌐 RPC: ${DEVNET_RPC}\n`);

  const results: PoolResult[] = [];

  // Create DLMM pool
  const dlmmResult = await createDLMMPool();
  results.push(dlmmResult);

  // Create DAMM v2 pool
  const dammResult = await createDAMMv2Pool();
  results.push(dammResult);

  // Print summary
  console.log('\n📊 Summary:');
  console.log('═'.repeat(60));

  for (const result of results) {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.protocol.toUpperCase()}`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Address: ${result.address}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Create pools manually using Meteora SDK or CLI');
  console.log('2. Add pool addresses to devnetPoolService.ts KNOWN_DEVNET_POOLS');
  console.log('3. Or use POST /api/pools/devnet/add to add pools dynamically');
  console.log('\n📚 Meteora Docs: https://docs.meteora.ag/');

  // Save results to file
  const outputPath = path.join(__dirname, 'devnet-pools.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
}

// Run main function
main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
