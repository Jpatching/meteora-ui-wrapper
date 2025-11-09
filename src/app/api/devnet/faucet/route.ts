import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';

/**
 * POST /api/devnet/faucet
 *
 * Airdrops devnet test tokens to a wallet
 *
 * Body:
 * - recipient: string (wallet address)
 * - tokenXMint: string
 * - tokenYMint: string
 * - amount: number (in token units, not lamports)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient, tokenXMint, tokenYMint, amount = 100000 } = body;

    // Validate inputs
    if (!recipient || !tokenXMint || !tokenYMint) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    // Load source wallet (the one with tokens)
    const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME || '', '.config/solana/id.json');

    if (!fs.existsSync(walletPath)) {
      console.error('Source wallet not found:', walletPath);
      return NextResponse.json(
        { success: false, error: 'Faucet temporarily unavailable' },
        { status: 500 }
      );
    }

    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const sourceWallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    const connection = new Connection(DEVNET_RPC, 'confirmed');

    console.log(`🎁 Faucet request from ${recipient}`);
    console.log(`   Amount: ${amount} tokens each`);

    // Airdrop Token X
    const tokenXMintPubkey = new PublicKey(tokenXMint);
    const sourceTokenXAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      tokenXMintPubkey,
      sourceWallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const recipientTokenXAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      tokenXMintPubkey,
      recipientPubkey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const tokenXSig = await transfer(
      connection,
      sourceWallet,
      sourceTokenXAccount.address,
      recipientTokenXAccount.address,
      sourceWallet.publicKey,
      amount * 1e6, // 6 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   ✅ Token X sent: ${tokenXSig}`);

    // Airdrop Token Y
    const tokenYMintPubkey = new PublicKey(tokenYMint);
    const sourceTokenYAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      tokenYMintPubkey,
      sourceWallet.publicKey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const recipientTokenYAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sourceWallet,
      tokenYMintPubkey,
      recipientPubkey,
      false,
      'confirmed',
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    const tokenYSig = await transfer(
      connection,
      sourceWallet,
      sourceTokenYAccount.address,
      recipientTokenYAccount.address,
      sourceWallet.publicKey,
      amount * 1e6, // 6 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log(`   ✅ Token Y sent: ${tokenYSig}`);
    console.log(`   🎉 Faucet complete for ${recipient}`);

    return NextResponse.json({
      success: true,
      data: {
        recipient,
        amount,
        transactions: {
          tokenX: tokenXSig,
          tokenY: tokenYSig,
        },
      },
    });
  } catch (error: any) {
    console.error('Faucet error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process faucet request' },
      { status: 500 }
    );
  }
}
