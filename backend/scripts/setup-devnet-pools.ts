#!/usr/bin/env tsx
/**
 * Setup Devnet Test Pools
 * Creates DLMM and DAMM v2 pools on devnet with test tokens for full functionality testing
 *
 * Based on: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
 *
 * Prerequisites:
 * 1. Devnet SOL in your wallet (https://faucet.solana.com/)
 * 2. Wallet keypair in ~/.config/solana/id.json or WALLET_PATH env var
 *
 * Usage:
 *   tsx backend/scripts/setup-devnet-pools.ts
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import DLMM, { ActivationType } from '@meteora-ag/dlmm';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Results to save
interface TestPoolResult {
  protocol: 'dlmm' | 'damm-v2';
  poolAddress: string;
  name: string;
  tokenA: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  metadata: any;
}

const results: TestPoolResult[] = [];

/**
 * Load wallet from file
 */
function loadWallet(): Keypair {
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

  console.log(`📂 Loading wallet from: ${walletPath}`);

  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet file not found!');
    console.error('💡 Create a wallet with: solana-keygen new --outfile ~/.config/solana/id.json');
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log(`✅ Wallet loaded: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

/**
 * Check wallet balance
 */
async function checkBalance(wallet: Keypair): Promise<number> {
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceSOL = balance / 1e9;

  console.log(`💰 Wallet balance: ${balanceSOL.toFixed(4)} SOL`);

  if (balanceSOL < 0.5) {
    console.warn('⚠️  Low balance! Get devnet SOL from: https://faucet.solana.com/');
    console.warn(`   Address: ${wallet.publicKey.toBase58()}`);
  }

  return balanceSOL;
}

/**
 * Create a test SPL token on devnet
 */
async function createTestToken(
  wallet: Keypair,
  symbol: string,
  decimals: number = 6
): Promise<PublicKey> {
  console.log(`\n🪙 Creating test token: ${symbol} (${decimals} decimals)...`);

  try {
    const mint = await createMint(
      connection,
      wallet,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
      decimals,
      undefined,
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`✅ Token created: ${mint.toBase58()}`);

    // Create token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);

    // Mint initial supply (1 million tokens)
    const amount = 1_000_000 * Math.pow(10, decimals);
    await mintTo(
      connection,
      wallet,
      mint,
      tokenAccount.address,
      wallet.publicKey,
      amount,
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`✅ Minted ${(amount / Math.pow(10, decimals)).toLocaleString()} ${symbol}`);

    return mint;
  } catch (error: any) {
    console.error(`❌ Error creating token ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Create DLMM pool on devnet
 * Based on: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
 */
async function createDLMMPool(
  wallet: Keypair,
  tokenX: PublicKey,
  tokenXSymbol: string,
  tokenY: PublicKey,
  tokenYSymbol: string
): Promise<TestPoolResult | null> {
  console.log('\n🌊 Creating DLMM pool on devnet...');
  console.log(`   Pair: ${tokenXSymbol}/${tokenYSymbol}`);

  try {
    // DLMM pool parameters
    const binStep = new BN(10); // 0.1% bin step (10 basis points)
    const feeBps = new BN(30); // 0.3% fee (30 basis points)
    const hasAlphaVault = false;
    const activationType = ActivationType.Slot; // Slot-based activation

    // Calculate activeId for 1:1 price
    // For binStep=10, activeId near 0 represents 1:1 price
    // Valid range depends on binStep, using 0 for simplicity (exact 1:1)
    const activeId = new BN(0); // Initial active bin ID (1:1 price)

    console.log('📝 Pool parameters:');
    console.log(`   Token X: ${tokenX.toBase58()} (${tokenXSymbol})`);
    console.log(`   Token Y: ${tokenY.toBase58()} (${tokenYSymbol})`);
    console.log(`   Bin Step: ${binStep.toString()} (0.1%)`);
    console.log(`   Active ID: ${activeId.toString()} (~1:1 price)`);
    console.log(`   Fee: ${feeBps.toString()} bps (0.3%)`);

    // Create DLMM pool using SDK - correct function signature
    const transaction = await DLMM.createCustomizablePermissionlessLbPair(
      connection,
      binStep,
      tokenX,
      tokenY,
      activeId,
      feeBps,
      activationType,
      hasAlphaVault,
      wallet.publicKey,
      null, // activationPoint - null for immediate activation
      false // creatorPoolOnOffControl
    );

    console.log('📤 Sending transaction...');

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign and send transaction
    transaction.partialSign(wallet);
    const txId = await connection.sendRawTransaction(transaction.serialize());

    console.log(`⏳ Transaction sent: ${txId}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(txId, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    // Derive the pool address (LB Pair PDA)
    const [lbPair] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('lb_pair'),
        tokenX.toBuffer(),
        tokenY.toBuffer(),
        binStep.toArrayLike(Buffer, 'le', 2),
      ],
      DLMM.PROGRAM_ID
    );

    console.log(`✅ DLMM pool created!`);
    console.log(`   Pool Address: ${lbPair.toBase58()}`);
    console.log(`   Explorer: https://explorer.solana.com/address/${lbPair.toBase58()}?cluster=devnet`);

    return {
      protocol: 'dlmm',
      poolAddress: lbPair.toBase58(),
      name: `${tokenXSymbol}-${tokenYSymbol}`,
      tokenA: {
        mint: tokenX.toBase58(),
        symbol: tokenXSymbol,
        decimals: 6,
      },
      tokenB: {
        mint: tokenY.toBase58(),
        symbol: tokenYSymbol,
        decimals: 6,
      },
      metadata: {
        binStep: binStep.toNumber(),
        activeId: activeId.toNumber(),
        feeBps: feeBps.toNumber(),
      },
    };
  } catch (error: any) {
    console.error('❌ Error creating DLMM pool:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    return null;
  }
}

/**
 * Add initial liquidity to DLMM pool
 */
async function addLiquidityToDLMM(
  wallet: Keypair,
  poolAddress: string,
  amountX: number,
  amountY: number
): Promise<boolean> {
  console.log(`\n💧 Adding liquidity to DLMM pool ${poolAddress}...`);

  try {
    // Create DLMM instance
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
      cluster: 'devnet',
    });

    // Get active bin
    const activeBin = await dlmmPool.getActiveBin();
    console.log(`📊 Active bin: ${activeBin.binId}`);

    // Add liquidity around active bin
    const minBinId = activeBin.binId - 10; // 10 bins below
    const maxBinId = activeBin.binId + 10; // 10 bins above

    console.log(`💰 Adding liquidity:`);
    console.log(`   Amount X: ${amountX}`);
    console.log(`   Amount Y: ${amountY}`);
    console.log(`   Bin range: ${minBinId} to ${maxBinId}`);

    // Add balanced liquidity
    const addLiquidityTx = await dlmmPool.addLiquidity({
      totalXAmount: amountX,
      totalYAmount: amountY,
      minBinId,
      maxBinId,
      user: wallet.publicKey,
      slippage: 100, // 1% slippage
    });

    // Sign and send
    addLiquidityTx.partialSign(wallet);
    const txId = await connection.sendRawTransaction(addLiquidityTx.serialize());

    console.log(`⏳ Transaction sent: ${txId}`);
    await connection.confirmTransaction(txId, 'confirmed');

    console.log(`✅ Liquidity added successfully!`);
    return true;
  } catch (error: any) {
    console.error('❌ Error adding liquidity:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Setting up Devnet Test Pools');
  console.log('═'.repeat(60));
  console.log(`🌐 RPC: ${DEVNET_RPC}\n`);

  // Load wallet
  const wallet = loadWallet();

  // Check balance
  const balance = await checkBalance(wallet);

  if (balance < 0.5) {
    console.error('\n❌ Insufficient balance. Need at least 0.5 SOL for testing.');
    console.error('💡 Get devnet SOL from: https://faucet.solana.com/');
    process.exit(1);
  }

  try {
    // Step 1: Create test tokens
    console.log('\n📦 Step 1: Creating test tokens...');
    console.log('─'.repeat(60));

    const tokenA = await createTestToken(wallet, 'TESTA', 6);
    const tokenB = await createTestToken(wallet, 'TESTB', 6);

    // Step 2: Create DLMM pool
    console.log('\n📦 Step 2: Creating DLMM pool...');
    console.log('─'.repeat(60));

    const dlmmPool = await createDLMMPool(wallet, tokenA, 'TESTA', tokenB, 'TESTB');

    if (dlmmPool) {
      results.push(dlmmPool);

      // Step 3: Add liquidity
      console.log('\n📦 Step 3: Adding initial liquidity...');
      console.log('─'.repeat(60));

      const liquidityAdded = await addLiquidityToDLMM(
        wallet,
        dlmmPool.poolAddress,
        10000 * 1e6, // 10,000 TESTA
        10000 * 1e6  // 10,000 TESTB
      );

      if (!liquidityAdded) {
        console.warn('⚠️  Failed to add liquidity - you can add it manually later');
      }
    }

    // Step 4: Save results
    console.log('\n📊 Summary');
    console.log('═'.repeat(60));

    for (const result of results) {
      console.log(`\n✅ ${result.protocol.toUpperCase()} Pool Created:`);
      console.log(`   Name: ${result.name}`);
      console.log(`   Address: ${result.poolAddress}`);
      console.log(`   Token A: ${result.tokenA.symbol} (${result.tokenA.mint})`);
      console.log(`   Token B: ${result.tokenB.symbol} (${result.tokenB.mint})`);
      console.log(`   Explorer: https://explorer.solana.com/address/${result.poolAddress}?cluster=devnet`);
    }

    // Save to file
    const outputPath = path.join(__dirname, '../devnet-test-pools.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

    // Print commands to add to backend
    console.log('\n📝 Next Steps:');
    console.log('─'.repeat(60));
    console.log('\n1. Add pools to backend:');
    for (const result of results) {
      console.log(`\ncurl -X POST http://localhost:4000/api/pools/devnet/add \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{`);
      console.log(`    "address": "${result.poolAddress}",`);
      console.log(`    "protocol": "${result.protocol}",`);
      console.log(`    "name": "${result.name}"`);
      console.log(`  }'`);
    }

    console.log('\n2. Switch to devnet in UI and view pools');
    console.log('3. Test adding liquidity, swapping, etc.');

    console.log('\n✅ Setup complete!');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
