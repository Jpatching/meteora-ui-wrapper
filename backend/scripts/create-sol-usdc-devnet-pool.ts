#!/usr/bin/env tsx
/**
 * Create SOL-USDC DLMM Pool on Devnet
 *
 * Creates a production-like SOL-USDC DLMM pool on devnet using:
 * - Native SOL (wrapped)
 * - Devnet USDC (official mint)
 *
 * Based on: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
 *
 * Prerequisites:
 * 1. Devnet SOL in wallet (~5 SOL recommended)
 * 2. Wallet keypair in ~/.config/solana/id.json or WALLET_PATH env var
 *
 * Usage:
 *   tsx backend/scripts/create-sol-usdc-devnet-pool.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import DLMM, { ActivationType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';

// Configuration
const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Devnet token mints
const TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL
  USDC: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Official devnet USDC
};

// Pool parameters
const POOL_CONFIG = {
  binStep: 25, // 0.25% bin step (25 basis points) - good for stablecoin-like pairs
  feeBps: 30, // 0.3% trading fee (30 basis points)
  initialPrice: 180, // 1 SOL = 180 USDC (approximate market price)
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
};

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

  if (balanceSOL < 1.0) {
    console.warn('⚠️  Low balance! Need at least 1 SOL for pool creation.');
    console.warn(`   Get devnet SOL from: https://faucet.solana.com/`);
    console.warn(`   Address: ${wallet.publicKey.toBase58()}`);
    throw new Error('Insufficient balance');
  }

  return balanceSOL;
}

/**
 * Calculate active bin ID from price
 *
 * Formula: activeId = floor(log(price) / log(1 + binStep / 10000))
 * For DLMM, bins are distributed logarithmically around price = 1
 */
function calculateActiveBinId(price: number, binStep: number): number {
  const binStepNum = binStep / 10000; // Convert basis points to decimal
  const activeId = Math.floor(Math.log(price) / Math.log(1 + binStepNum));
  return activeId;
}

/**
 * Create SOL-USDC DLMM pool on devnet
 */
async function createSOLUSDCPool(wallet: Keypair): Promise<string | null> {
  console.log('\n🌊 Creating SOL-USDC DLMM pool on devnet...');
  console.log('═'.repeat(60));

  try {
    // Calculate active bin ID for target price
    const activeId = calculateActiveBinId(POOL_CONFIG.initialPrice, POOL_CONFIG.binStep);

    console.log('📝 Pool Configuration:');
    console.log(`   Token X: SOL (${TOKENS.SOL.toBase58()})`);
    console.log(`   Token Y: USDC (${TOKENS.USDC.toBase58()})`);
    console.log(`   Bin Step: ${POOL_CONFIG.binStep} bps (${POOL_CONFIG.binStep / 100}%)`);
    console.log(`   Initial Price: ${POOL_CONFIG.initialPrice} USDC per SOL`);
    console.log(`   Active Bin ID: ${activeId}`);
    console.log(`   Trading Fee: ${POOL_CONFIG.feeBps} bps (${POOL_CONFIG.feeBps / 100}%)`);
    console.log(`   Activation: ${ActivationType[POOL_CONFIG.activationType]}`);
    console.log(`   Alpha Vault: ${POOL_CONFIG.hasAlphaVault ? 'Yes' : 'No'}`);

    // Create pool transaction
    console.log('\n📤 Creating pool transaction...');
    const transaction = await DLMM.createCustomizablePermissionlessLbPair(
      connection,
      new BN(POOL_CONFIG.binStep),
      TOKENS.SOL,
      TOKENS.USDC,
      new BN(activeId),
      new BN(POOL_CONFIG.feeBps),
      POOL_CONFIG.activationType,
      POOL_CONFIG.hasAlphaVault,
      wallet.publicKey,
      null, // activationPoint - null for immediate activation
      false // creatorPoolOnOffControl
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign and send
    transaction.partialSign(wallet);
    const txId = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`⏳ Transaction sent: ${txId}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(txId, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    // Derive pool address (LB Pair PDA)
    const [lbPair] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('lb_pair'),
        TOKENS.SOL.toBuffer(),
        TOKENS.USDC.toBuffer(),
        new BN(POOL_CONFIG.binStep).toArrayLike(Buffer, 'le', 2),
      ],
      DLMM.PROGRAM_ID
    );

    console.log(`\n✅ DLMM pool created successfully!`);
    console.log(`   Pool Address: ${lbPair.toBase58()}`);
    console.log(`   Transaction: ${txId}`);
    console.log(`   Explorer: https://explorer.solana.com/address/${lbPair.toBase58()}?cluster=devnet`);

    return lbPair.toBase58();
  } catch (error: any) {
    console.error('\n❌ Error creating pool:', error.message);
    if (error.logs) {
      console.error('📋 Transaction logs:', error.logs);
    }
    return null;
  }
}

/**
 * Save pool info to file
 */
function savePoolInfo(poolAddress: string, txId: string) {
  const poolInfo = {
    protocol: 'dlmm',
    poolAddress,
    name: 'SOL-USDC',
    tokenX: {
      mint: TOKENS.SOL.toBase58(),
      symbol: 'SOL',
      decimals: 9,
    },
    tokenY: {
      mint: TOKENS.USDC.toBase58(),
      symbol: 'USDC',
      decimals: 6,
    },
    config: {
      binStep: POOL_CONFIG.binStep,
      feeBps: POOL_CONFIG.feeBps,
      initialPrice: POOL_CONFIG.initialPrice,
      activeId: calculateActiveBinId(POOL_CONFIG.initialPrice, POOL_CONFIG.binStep),
    },
    createdAt: new Date().toISOString(),
    transactionId: txId,
  };

  const outputPath = path.join(__dirname, '../devnet-test-pools.json');

  // Read existing pools if file exists
  let pools = [];
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf-8');
    pools = JSON.parse(existing);
  }

  // Add new pool
  pools.push(poolInfo);

  // Save
  fs.writeFileSync(outputPath, JSON.stringify(pools, null, 2));
  console.log(`\n💾 Pool info saved to: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 SOL-USDC DLMM Pool Creation');
  console.log('═'.repeat(60));
  console.log(`🌐 Network: Devnet`);
  console.log(`🔗 RPC: ${DEVNET_RPC}\n`);

  // Load wallet
  const wallet = loadWallet();

  // Check balance
  await checkBalance(wallet);

  // Create pool
  const poolAddress = await createSOLUSDCPool(wallet);

  if (!poolAddress) {
    console.error('\n❌ Pool creation failed!');
    process.exit(1);
  }

  // Save info
  savePoolInfo(poolAddress, 'txId');

  // Print next steps
  console.log('\n📝 Next Steps:');
  console.log('═'.repeat(60));
  console.log('\n1. Seed liquidity using:');
  console.log(`   tsx backend/scripts/seed-devnet-pool.ts ${poolAddress}`);
  console.log('\n2. Add pool to backend tracking:');
  console.log(`   curl -X POST http://localhost:4000/api/pools/devnet/add \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"address": "${poolAddress}", "protocol": "dlmm", "name": "SOL-USDC"}'`);
  console.log('\n3. View pool in UI:');
  console.log('   - Switch to devnet in network selector');
  console.log('   - Pool should appear in dashboard');
  console.log('   - Click to view details and add liquidity');

  console.log('\n✅ Done!');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
