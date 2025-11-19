/**
 * Create DLMM Pool Using SDK Directly
 * This script creates a real pool on devnet for testing
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import DLMM, { derivePresetParameter2 } from '@meteora-ag/dlmm';
import BN from 'bn.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function loadKeypair(): Promise<Keypair> {
  const keypairPath = `${homedir()}/.config/solana/id.json`;
  const secretKey = JSON.parse(readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function createTestToken(
  connection: Connection,
  payer: Keypair,
  decimals: number,
  symbol: string
): Promise<PublicKey> {
  console.log(`\n🔨 Creating ${symbol} token (${decimals} decimals)...`);

  // Create mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    decimals,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );

  console.log(`✅ ${symbol} Token Mint: ${mint.toBase58()}`);

  // Create token account and mint some tokens
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // Mint 1 million tokens to user
  const amount = BigInt(1_000_000) * BigInt(10 ** decimals);
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    amount
  );

  console.log(`✅ Minted 1,000,000 ${symbol} to ${tokenAccount.address.toBase58()}`);

  return mint;
}

async function createDLMMPool(
  connection: Connection,
  payer: Keypair,
  tokenXMint: PublicKey,
  tokenYMint: PublicKey
) {
  console.log('\n🏗️  Creating DLMM Pool...');

  const binStep = 25; // 0.25% - SAFE bin step
  const initialPrice = 1.0;
  const baseFeePercentage = 0.1;

  console.log('Pool Parameters:');
  console.log(`  Token X: ${tokenXMint.toBase58()}`);
  console.log(`  Token Y: ${tokenYMint.toBase58()}`);
  console.log(`  Bin Step: ${binStep} (0.25%)`);
  console.log(`  Initial Price: ${initialPrice}`);
  console.log(`  Base Fee: ${baseFeePercentage}%`);

  try {
    // Calculate active bin ID from initial price
    // Price = (1 + binStep/10000)^(activeId - 8388608)
    // For price = 1.0, activeId = 8388608 (center bin)
    const activeBinId = new BN(8388608);

    // Base factor (typically 10000 for most pools)
    const baseFactor = new BN(10000);

    // Get DLMM program ID for devnet
    const DLMM_PROGRAM_ID = new PublicKey('LbUMTTJ8bpGw2pD1XSCVNFZGj7PQJBXdHPrPbCCrT8g');

    // Derive preset parameter PDA for bin step and base factor
    const [presetParameter] = derivePresetParameter2(
      new BN(binStep),
      baseFactor,
      DLMM_PROGRAM_ID
    );

    // Create pool using SDK with correct parameter order
    // Note: createLbPair creates a standard permissionless pair with immediate activation
    // For custom activation control, use createCustomizablePermissionlessLbPair instead
    const createPoolTx = await DLMM.createLbPair(
      connection,
      payer.publicKey,      // funder
      tokenXMint,           // tokenX
      tokenYMint,           // tokenY
      new BN(binStep),      // binStep as BN
      baseFactor,           // baseFactor
      presetParameter,      // presetParameter PDA
      activeBinId           // activeId as BN
      // No options needed - uses defaults
    );

    console.log('\n📝 Signing and sending transaction...');

    const txSignature = await sendAndConfirmTransaction(
      connection,
      createPoolTx,
      [payer],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    );

    console.log(`\n✅ Pool Created!`);
    console.log(`   Transaction: https://solscan.io/tx/${txSignature}?cluster=devnet`);

    // Get pool address from transaction
    const txInfo = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    // Extract pool address from logs
    const poolAddress = extractPoolAddressFromLogs(txInfo?.meta?.logMessages || []);

    if (poolAddress) {
      console.log(`   Pool Address: ${poolAddress}`);
      return poolAddress;
    } else {
      console.log('   ⚠️  Pool address not found in logs. Check transaction manually.');
      return null;
    }
  } catch (error: any) {
    console.error('\n❌ Error creating pool:', error.message);
    throw error;
  }
}

function extractPoolAddressFromLogs(logs: string[]): string | null {
  // Look for the pool address in transaction logs
  for (const log of logs) {
    if (log.includes('LbPair') || log.includes('Initialized')) {
      // Extract pubkey from log
      const match = log.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/g);
      if (match && match.length > 0) {
        return match[0];
      }
    }
  }
  return null;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DLMM Pool Creation - End-to-End Test');
  console.log('═══════════════════════════════════════════════════════\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const payer = await loadKeypair();

  console.log(`Wallet: ${payer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);

  if (balance < 1e9) {
    console.log('\n⚠️  Low SOL balance. Get airdrop:');
    console.log(`   solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet\n`);
    return;
  }

  try {
    // Step 1: Create test tokens
    console.log('\n══════════════ STEP 1: Create Tokens ══════════════');
    const tokenX = await createTestToken(connection, payer, 9, 'TEST');
    const tokenY = await createTestToken(connection, payer, 6, 'USDT');

    // Step 2: Create DLMM pool
    console.log('\n══════════════ STEP 2: Create Pool ══════════════');
    const poolAddress = await createDLMMPool(connection, payer, tokenX, tokenY);

    if (poolAddress) {
      // Step 3: Save pool info
      console.log('\n══════════════ SUCCESS ══════════════');
      console.log('\n🎉 Pool created successfully!\n');
      console.log('Pool Information:');
      console.log(`  Address: ${poolAddress}`);
      console.log(`  Token X: ${tokenX.toBase58()} (TEST, 9 decimals)`);
      console.log(`  Token Y: ${tokenY.toBase58()} (USDT, 6 decimals)`);
      console.log(`  Bin Step: 25 (0.25%)`);
      console.log(`  Network: devnet\n`);

      console.log('🔗 Links:');
      console.log(`  UI: http://localhost:3000/pool/${poolAddress}`);
      console.log(`  Solscan: https://solscan.io/account/${poolAddress}?cluster=devnet`);
      console.log(`  Meteora: https://devnet.meteora.ag/pools/${poolAddress}\n`);

      console.log('✅ Next Steps:');
      console.log('  1. Start dev server: npm run dev');
      console.log(`  2. Open: http://localhost:3000/pool/${poolAddress}`);
      console.log('  3. Test add liquidity with safety features');
      console.log('  4. Verify:');
      console.log('     - Spot strategy shows 10 bins (green)');
      console.log('     - Curve strategy shows 20 bins (yellow)');
      console.log('     - Wide manual range blocked (red)\n');

      // Save to file
      const poolInfo = {
        poolAddress,
        tokenX: tokenX.toBase58(),
        tokenY: tokenY.toBase58(),
        binStep: 25,
        created: new Date().toISOString(),
        uiUrl: `http://localhost:3000/pool/${poolAddress}`,
      };

      const fs = require('fs');
      fs.writeFileSync(
        'CREATED_POOL.json',
        JSON.stringify(poolInfo, null, 2)
      );
      console.log('📝 Pool info saved to CREATED_POOL.json\n');
    }
  } catch (error) {
    console.error('\n❌ Failed to create pool:', error);
    process.exit(1);
  }
}

main().catch(console.error);
