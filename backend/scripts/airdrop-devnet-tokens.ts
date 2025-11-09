#!/usr/bin/env tsx
/**
 * Airdrop Devnet Test Tokens to a Wallet
 *
 * Sends TESTA and TESTB tokens from the pool creator wallet to any specified address
 *
 * Usage:
 *   npx tsx backend/scripts/airdrop-devnet-tokens.ts <RECIPIENT_ADDRESS> [AMOUNT]
 *
 * Example:
 *   npx tsx backend/scripts/airdrop-devnet-tokens.ts YourWalletAddressHere 100000
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Token mints from devnet pool creation
const TESTA_MINT = '6YZM4EtP5RyYqgWQGCZ3aHWPhfynaZD4jUfHNAKsdDXt';
const TESTB_MINT = 'FouihvJeod86c2c5h9puviuD6KrCfiEwxinr6YdxWXZ9';

/**
 * Load the wallet that has the tokens (pool creator)
 */
function loadSourceWallet(): Keypair {
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

  if (!fs.existsSync(walletPath)) {
    console.error('❌ Source wallet file not found at:', walletPath);
    console.error('💡 This wallet should contain the TESTA and TESTB tokens');
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log(`✅ Source wallet loaded: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

/**
 * Airdrop tokens to a recipient
 */
async function airdropTokens(
  recipient: PublicKey,
  amount: number
) {
  const sourceWallet = loadSourceWallet();

  console.log('\n🎁 Airdropping Tokens to:', recipient.toBase58());
  console.log('📊 Amount per token:', amount.toLocaleString());
  console.log('─'.repeat(60));

  try {
    // Airdrop TESTA
    console.log('\n💜 Airdropping TESTA...');
    const testaTokenMint = new PublicKey(TESTA_MINT);

    // Get source token account
    const sourceTestaAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      testaTokenMint,
      sourceWallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   Source TESTA account: ${sourceTestaAccount.address.toBase58()}`);

    // Get or create recipient token account
    const recipientTestaAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      testaTokenMint,
      recipient,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   Recipient TESTA account: ${recipientTestaAccount.address.toBase58()}`);

    // Transfer TESTA
    const testaSig = await transfer(
      connection,
      sourceWallet,
      sourceTestaAccount.address,
      recipientTestaAccount.address,
      sourceWallet.publicKey,
      amount * 1e6, // Convert to token units (6 decimals)
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   ✅ TESTA transferred!`);
    console.log(`   📝 Transaction: https://explorer.solana.com/tx/${testaSig}?cluster=devnet`);

    // Airdrop TESTB
    console.log('\n💙 Airdropping TESTB...');
    const testbTokenMint = new PublicKey(TESTB_MINT);

    // Get source token account
    const sourceTestbAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      testbTokenMint,
      sourceWallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   Source TESTB account: ${sourceTestbAccount.address.toBase58()}`);

    // Get or create recipient token account
    const recipientTestbAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      testbTokenMint,
      recipient,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   Recipient TESTB account: ${recipientTestbAccount.address.toBase58()}`);

    // Transfer TESTB
    const testbSig = await transfer(
      connection,
      sourceWallet,
      sourceTestbAccount.address,
      recipientTestbAccount.address,
      sourceWallet.publicKey,
      amount * 1e6, // Convert to token units (6 decimals)
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   ✅ TESTB transferred!`);
    console.log(`   📝 Transaction: https://explorer.solana.com/tx/${testbSig}?cluster=devnet`);

    // Summary
    console.log('\n🎉 Airdrop Complete!');
    console.log('─'.repeat(60));
    console.log(`✅ Sent ${amount.toLocaleString()} TESTA to ${recipient.toBase58()}`);
    console.log(`✅ Sent ${amount.toLocaleString()} TESTB to ${recipient.toBase58()}`);
    console.log('\n💡 You can now add liquidity to the devnet pool using these tokens!');
    console.log('🔗 Pool: http://localhost:3000/pool/8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1');

  } catch (error: any) {
    console.error('\n❌ Error during airdrop:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Devnet Token Airdrop');
  console.log('═'.repeat(60));

  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('\n❌ Usage: npx tsx backend/scripts/airdrop-devnet-tokens.ts <RECIPIENT_ADDRESS> [AMOUNT]');
    console.error('\nExample:');
    console.error('  npx tsx backend/scripts/airdrop-devnet-tokens.ts YourWalletAddress 100000');
    console.error('\nThis will send 100,000 TESTA and 100,000 TESTB to the specified address.');
    process.exit(1);
  }

  const recipientAddress = args[0];
  const amount = args[1] ? parseInt(args[1]) : 100000; // Default 100k tokens

  // Validate recipient address
  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientAddress);
  } catch (error) {
    console.error('❌ Invalid recipient address:', recipientAddress);
    process.exit(1);
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount:', args[1]);
    process.exit(1);
  }

  // Execute airdrop
  await airdropTokens(recipient, amount);
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
