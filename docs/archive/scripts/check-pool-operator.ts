#!/usr/bin/env tsx
/**
 * Check Pool Operator
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const POOL_ADDRESS = '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1';
const RPC_URL = 'https://api.devnet.solana.com';

async function checkOperator() {
  console.log('🔍 Checking pool operator...\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const poolPubkey = new PublicKey(POOL_ADDRESS);

  const dlmmPool = await DLMM.create(connection, poolPubkey, { cluster: 'devnet' });
  const poolState = dlmmPool.lbPair;

  console.log('Pool Address:', POOL_ADDRESS);
  console.log('\n👤 Access Control:');
  console.log('  - Creator:', poolState.creator?.toBase58() || 'Unknown');
  // Note: DLMM pools don't have a pool-level operator field
  // Operators are position-specific, not pool-level
  console.log('  - Pool Type:', poolState.creatorPoolOnOffControl ? 'Creator Controlled' : 'Fully Permissionless');

  console.log('\n🔑 Your Wallet:');
  console.log('  - Address: BYnoVgMLftH28ERdnrWjeGmZvQwAmDm9CqCPiGNRBTHu');

  const isCreator = poolState.creator?.toBase58() === 'BYnoVgMLftH28ERdnrWjeGmZvQwAmDm9CqCPiGNRBTHu';

  console.log('\n✅ Permissions:');
  console.log('  - You are the creator:', isCreator ? 'YES ✓' : 'NO ✗');
  console.log('  - Pool is permissionless:', !poolState.creatorPoolOnOffControl ? 'YES ✓' : 'NO ✗');

  if (!isCreator && poolState.creatorPoolOnOffControl) {
    console.log('\n⚠️  WARNING: This pool is creator-controlled!');
    console.log('   Only the creator may have certain permissions.');
    console.log('   Creator address:', poolState.creator?.toBase58());
  }
}

checkOperator().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
