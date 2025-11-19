/**
 * Verify that liquidity was actually added to the pool
 * Checks bin-level liquidity distribution
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH'; // Your pool
const TX_SIGNATURE = '2gZ8KC19QStLmVNJchqAVaLsiNd1dhCKEtGY4JRdu4H2jecYXKxf2RvmxVRArKAcCWmrQxVCAPqg631P476kv94f';

async function main() {
  console.log('\n🔍 Verifying liquidity from transaction:', TX_SIGNATURE);
  console.log('📍 Pool:', POOL_ADDRESS);
  console.log('─'.repeat(80));

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // 1. Get transaction details
  console.log('\n📜 Fetching transaction details...');
  const tx = await connection.getTransaction(TX_SIGNATURE, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx) {
    console.error('❌ Transaction not found!');
    return;
  }

  console.log(`✅ Transaction found - Status: ${tx.meta?.err ? 'Failed' : 'Success'}`);

  // 2. Load DLMM pool
  console.log('\n🏊 Loading DLMM pool...');
  const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), {
    cluster: 'devnet',
  });

  await dlmmPool.refetchStates();
  const activeBinId = dlmmPool.lbPair.activeId;
  const binStep = dlmmPool.lbPair.binStep;

  console.log(`✅ Pool loaded - Active Bin: ${activeBinId}, Bin Step: ${binStep}bp`);

  // 3. Get bins around active bin
  console.log('\n📊 Fetching bin liquidity distribution...');
  const { bins } = await dlmmPool.getBinsAroundActiveBin(50, 50);

  // Filter bins with liquidity
  const binsWithLiquidity = bins.filter(
    (bin) => !bin.xAmount.isZero() || !bin.yAmount.isZero()
  );

  console.log(`✅ Found ${binsWithLiquidity.length} bins with liquidity (out of ${bins.length} total)`);
  console.log('─'.repeat(80));

  if (binsWithLiquidity.length === 0) {
    console.log('⚠️  No bins with liquidity found!');
    console.log('This might indicate:');
    console.log('  1. The liquidity was removed');
    console.log('  2. The transaction failed silently');
    console.log('  3. RPC data is not yet updated');
    return;
  }

  // 4. Display bins with liquidity
  console.log('\n💧 Bins with liquidity:');
  console.log('─'.repeat(80));
  console.log('Bin ID | Price        | Token X Amount  | Token Y Amount  | Active?');
  console.log('─'.repeat(80));

  for (const bin of binsWithLiquidity.slice(0, 20)) {
    // Show first 20
    const tokenX = Number(bin.xAmount.toString()) / 1e6; // Assuming 6 decimals
    const tokenY = Number(bin.yAmount.toString()) / 1e6;
    const isActive = bin.binId === activeBinId ? '✅' : '';

    console.log(
      `${String(bin.binId).padStart(6)} | ${bin.price.toFixed(8).padEnd(12)} | ${tokenX.toFixed(6).padEnd(15)} | ${tokenY.toFixed(6).padEnd(15)} | ${isActive}`
    );
  }

  if (binsWithLiquidity.length > 20) {
    console.log(`... and ${binsWithLiquidity.length - 20} more bins`);
  }

  console.log('─'.repeat(80));

  // 5. Calculate total liquidity in pool
  let totalX = 0;
  let totalY = 0;

  for (const bin of bins) {
    totalX += Number(bin.xAmount.toString()) / 1e6;
    totalY += Number(bin.yAmount.toString()) / 1e6;
  }

  console.log('\n📈 Total Pool Liquidity:');
  console.log(`  Token X: ${totalX.toFixed(6)}`);
  console.log(`  Token Y: ${totalY.toFixed(6)}`);
  console.log('─'.repeat(80));

  // 6. Check for your wallet's positions
  console.log('\n💼 Checking for positions in this pool...');

  // Extract wallet from transaction
  const walletPubkey = tx.transaction.message.accountKeys[0];
  console.log(`  Wallet: ${walletPubkey.toString()}`);

  try {
    const positions = await dlmmPool.getPositionsByUserAndLbPair(walletPubkey);

    if (positions.userPositions.length === 0) {
      console.log('⚠️  No positions found for this wallet');
    } else {
      console.log(`✅ Found ${positions.userPositions.length} position(s)`);

      for (let i = 0; i < positions.userPositions.length; i++) {
        const pos = positions.userPositions[i];
        console.log(`\n  Position ${i + 1}:`);
        console.log(`    Address: ${pos.publicKey.toString()}`);
        console.log(`    Total X: ${Number(pos.positionData.totalXAmount.toString()) / 1e6}`);
        console.log(`    Total Y: ${Number(pos.positionData.totalYAmount.toString()) / 1e6}`);
      }
    }
  } catch (error: any) {
    console.warn(`⚠️  Could not fetch positions: ${error.message}`);
  }

  console.log('\n✅ Verification complete!');
  console.log('─'.repeat(80));
  console.log('\n💡 Note: If liquidity shows here but not on Solscan:');
  console.log('  - Solscan devnet indexing may be delayed (can take minutes to hours)');
  console.log('  - Chart rendering may have minimum thresholds');
  console.log('  - Try refreshing Solscan or checking again later');
  console.log('  - The liquidity IS in the pool even if Solscan doesn\'t show it yet');
}

main().catch(console.error);
