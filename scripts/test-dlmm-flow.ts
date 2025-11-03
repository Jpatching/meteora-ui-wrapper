/**
 * Test script to verify DLMM flow works correctly
 * Run with: npx ts-node --esm scripts/test-dlmm-flow.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import DLMM, { deriveCustomizablePermissionlessLbPair } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import * as fs from 'fs';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Load test wallet
const walletFile = process.env.HOME + '/.config/solana/test/e2e-test-wallet.json';
const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const DLMM_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

async function testDLMMFlow() {
  console.log('🧪 Testing DLMM Flow on Devnet');
  console.log('=====================================\n');

  console.log('Wallet:', wallet.publicKey.toString());
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL\n');

  // Test 1: Verify pool derivation works
  console.log('Test 1: Pool Address Derivation');
  console.log('-----------------------------------');

  const testBaseMint = new PublicKey('Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW'); // Example token
  const [derivedPool] = deriveCustomizablePermissionlessLbPair(
    testBaseMint,
    SOL_MINT,
    DLMM_PROGRAM_ID
  );

  console.log('Base Token:', testBaseMint.toString());
  console.log('Quote Token:', SOL_MINT.toString());
  console.log('Derived Pool:', derivedPool.toString());

  // Check if pool exists
  const poolAccount = await connection.getAccountInfo(derivedPool);
  console.log('Pool Exists:', poolAccount ? '✅ YES' : '❌ NO');

  if (!poolAccount) {
    console.log('\n⚠️  Pool does not exist. This is expected if you haven\'t created it yet.');
    console.log('To create a pool, use the app UI at http://localhost:3000/dlmm/create-pool\n');
  } else {
    console.log('\n✅ Pool exists! Attempting to create DLMM instance...\n');

    // Test 2: Create DLMM instance
    console.log('Test 2: Create DLMM Instance');
    console.log('-----------------------------------');

    try {
      const dlmmInstance = await DLMM.create(connection, derivedPool, {
        cluster: 'devnet',
      });

      console.log('✅ DLMM instance created successfully!');

      // Refresh pool state
      await dlmmInstance.refetchStates();
      console.log('\nPool State:');
      console.log('- Active Bin ID:', dlmmInstance.lbPair.activeId);
      console.log('- Bin Step:', dlmmInstance.lbPair.binStep);
      console.log('- Base Fee (bps):', dlmmInstance.lbPair.parameters.baseFactor);
      console.log('- Protocol Fee (bps):', dlmmInstance.lbPair.parameters.protocolShare);

      // Get pool info
      const lbPair = dlmmInstance.lbPair;
      console.log('\nPool Info:');
      console.log('- Creator:', lbPair.creator.toString());
      console.log('- Creator Control:', lbPair.creatorPoolOnOffControl);
      console.log('- Status:', lbPair.status);

      console.log('\n✅ All tests passed! SDK is working correctly.');
    } catch (error) {
      console.error('❌ Failed to create DLMM instance:', error);
    }
  }

  console.log('\n=====================================');
  console.log('Test completed!\n');
}

testDLMMFlow().catch(console.error);
