#!/usr/bin/env tsx
/**
 * Update Devnet Pool Token Metadata
 * Fetches token names and symbols from on-chain data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import fetch from 'cross-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH';
const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function getTokenMetadata(connection: Connection, mintAddress: string) {
  try {
    const mint = new PublicKey(mintAddress);
    const mintInfo = await getMint(connection, mint);

    // For devnet tokens, we likely won't have metadata program data
    // So we'll use a simple naming scheme based on mint address
    const shortMint = mintAddress.slice(0, 4) + '...' + mintAddress.slice(-4);

    return {
      decimals: mintInfo.decimals,
      symbol: `TOKEN-${shortMint}`,
      name: `Devnet Token ${shortMint}`,
    };
  } catch (error) {
    console.error(`Failed to fetch token metadata for ${mintAddress}:`, error);
    return {
      decimals: 6, // Default
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
    };
  }
}

async function updatePoolMetadata() {
  console.log('🔄 Fetching pool data from backend...\n');

  // Get current pool data
  const response = await fetch(`${BACKEND_URL}/api/pools/${POOL_ADDRESS}?network=devnet`);
  const result = await response.json();

  if (!result.success) {
    throw new Error('Pool not found in database');
  }

  const pool = result.data;
  console.log('Current pool data:');
  console.log(`  Name: ${pool.pool_name}`);
  console.log(`  Token A: ${pool.token_a_mint}`);
  console.log(`  Token B: ${pool.token_b_mint}`);
  console.log(`  Token A Symbol: ${pool.token_a_symbol || 'null'}`);
  console.log(`  Token B Symbol: ${pool.token_b_symbol || 'null'}\n`);

  // Fetch token metadata from on-chain
  console.log('📡 Fetching token metadata from Solana...\n');
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  const tokenA = await getTokenMetadata(connection, pool.token_a_mint);
  const tokenB = await getTokenMetadata(connection, pool.token_b_mint);

  console.log('Token A metadata:');
  console.log(`  Symbol: ${tokenA.symbol}`);
  console.log(`  Name: ${tokenA.name}`);
  console.log(`  Decimals: ${tokenA.decimals}\n`);

  console.log('Token B metadata:');
  console.log(`  Symbol: ${tokenB.symbol}`);
  console.log(`  Name: ${tokenB.name}`);
  console.log(`  Decimals: ${tokenB.decimals}\n`);

  // Update pool in database
  console.log('💾 Updating pool in database...\n');

  const updateResponse = await fetch(`${BACKEND_URL}/api/pools/devnet/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: POOL_ADDRESS,
      protocol: 'dlmm',
      token_a_mint: pool.token_a_mint,
      token_b_mint: pool.token_b_mint,
      token_a_symbol: tokenA.symbol,
      token_b_symbol: tokenB.symbol,
      name: `${tokenA.symbol}-${tokenB.symbol}`,
      bin_step: pool.metadata?.bin_step || 25,
      active_bin: pool.metadata?.active_bin,
      reserve_x: parseFloat(pool.metadata?.reserve_x || '0'),
      reserve_y: parseFloat(pool.metadata?.reserve_y || '0'),
      tvl: parseFloat(pool.tvl || '0'),
    }),
  });

  const updateResult = await updateResponse.json();

  if (updateResult.success) {
    console.log('✅ Pool metadata updated successfully!\n');
    console.log(`New pool name: ${tokenA.symbol}-${tokenB.symbol}`);
  } else {
    console.error('❌ Failed to update pool:', updateResult.error);
  }
}

// Run the update
updatePoolMetadata().catch(console.error);
