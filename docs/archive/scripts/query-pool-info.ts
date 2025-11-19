#!/usr/bin/env tsx
/**
 * Query Pool Information
 * Fetches token mints and configuration from a DLMM pool
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';

const POOL_ADDRESS = process.argv[2] || '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1';
const RPC_URL = 'https://api.devnet.solana.com';

async function queryPool() {
  console.log('🔍 Querying pool information...\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const poolPubkey = new PublicKey(POOL_ADDRESS);

  const dlmmPool = await DLMM.create(connection, poolPubkey, { cluster: 'devnet' });
  const poolState = dlmmPool.lbPair;

  console.log('Pool Address:', POOL_ADDRESS);
  console.log('\n📊 Token Information:');
  console.log('  Token X (Base):');
  console.log('    - Mint:', dlmmPool.tokenX.publicKey.toBase58());
  console.log('    - Decimals:', dlmmPool.tokenX.mint.decimals);
  console.log('\n  Token Y (Quote):');
  console.log('    - Mint:', dlmmPool.tokenY.publicKey.toBase58());
  console.log('    - Decimals:', dlmmPool.tokenY.mint.decimals);

  console.log('\n⚙️  Pool Configuration:');
  console.log('  - Bin Step:', poolState.binStep);
  console.log('  - Active Bin ID:', poolState.activeId);

  // Calculate current price from active bin
  const currentPrice = getPriceOfBinByBinId(poolState.activeId, poolState.binStep);
  console.log('  - Current Price:', currentPrice.toString());

  console.log('  - Activation Point:', poolState.activationPoint?.toString() || 'null');
  console.log('  - Base Fee (bps):', poolState.parameters.baseFactor);

  const binArrays = await dlmmPool.getBinArrays();
  console.log('\n📦 Liquidity Status:');
  console.log('  - Bin Arrays:', binArrays.length);
  console.log('  - Has Liquidity:', binArrays.length > 0 ? 'Yes' : 'No');

  console.log('\n✅ Pool information retrieved!');
}

queryPool().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
