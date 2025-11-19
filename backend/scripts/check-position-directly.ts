/**
 * Check position directly from transaction signature
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const TX_SIGNATURE = '24GJxbFuk9M7fBdZwt4KoYPf3TP4PjmZSXpe1p2EYpzS1Jdrfgv2DY4gijuLrhjoRzk7i9ZiixHAQJMkceeKnM6M';
const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH';

async function main() {
  console.log('\n🔍 Checking Position from Transaction');
  console.log('─'.repeat(80));
  console.log('Transaction:', TX_SIGNATURE);
  console.log('Pool:', POOL_ADDRESS);
  console.log('─'.repeat(80));

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // 1. Get transaction to find position account
  console.log('\n📜 Fetching transaction...');
  const tx = await connection.getTransaction(TX_SIGNATURE, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx || !tx.meta) {
    console.error('❌ Transaction not found or no metadata');
    return;
  }

  console.log('✅ Transaction found');

  // 2. Look for position account in the transaction
  console.log('\n🔎 Looking for position account in transaction...');

  // The position account is usually one of the writable accounts created during the transaction
  const accountKeys = tx.transaction.message.accountKeys;

  console.log(`\n📋 Transaction Account Keys (${accountKeys.length} total):`);
  for (let i = 0; i < Math.min(accountKeys.length, 20); i++) {
    const key = accountKeys[i];
    console.log(`  [${i}] ${key.toString()}`);
  }

  // Look for newly created accounts in innerInstructions
  if (tx.meta.innerInstructions) {
    console.log('\n🔍 Checking inner instructions for position creation...');

    for (const inner of tx.meta.innerInstructions) {
      for (const ix of inner.instructions) {
        if ('parsed' in ix && ix.parsed?.type === 'createAccount') {
          const newAccount = ix.parsed.info?.newAccount;
          if (newAccount) {
            console.log(`  ✅ Found created account: ${newAccount}`);

            // Try to load this as a position
            try {
              const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), {
                cluster: 'devnet',
              });

              console.log('\n  📊 Checking if this is a position for our pool...');
              const positionPubkey = new PublicKey(newAccount);
              const position = await dlmmPool.getPosition(positionPubkey);

              console.log('  ✅ This IS a position for the pool!');
              console.log('  Position Address:', positionPubkey.toString());

              // Get position details
              let totalX = 0;
              let totalY = 0;
              let minBin = Infinity;
              let maxBin = -Infinity;

              if (position.positionData) {
                for (const binData of (position.positionData as any)) {
                  const binId = binData.binId || 0;
                  const xAmount = Number(binData.positionData?.totalXAmount || 0) / 1e6;
                  const yAmount = Number(binData.positionData?.totalYAmount || 0) / 1e6;

                  totalX += xAmount;
                  totalY += yAmount;
                  minBin = Math.min(minBin, binId);
                  maxBin = Math.max(maxBin, binId);

                  console.log(`    Bin ${binId}: X=${xAmount.toFixed(6)}, Y=${yAmount.toFixed(6)}`);
                }
              }

              console.log(`\n  💰 Position Summary:`);
              console.log(`    Total X: ${totalX.toFixed(6)}`);
              console.log(`    Total Y: ${totalY.toFixed(6)}`);
              console.log(`    Bin Range: ${minBin} → ${maxBin}`);

            } catch (error: any) {
              console.log(`  ⚠️  Not a position for this pool: ${error.message}`);
            }
          }
        }
      }
    }
  }

  // 3. Try to get positions for the pool directly
  console.log('\n\n🏊 Checking pool directly...');
  try {
    const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), {
      cluster: 'devnet',
    });

    await dlmmPool.refetchStates();

    console.log('✅ Pool loaded successfully');
    console.log('  Active Bin:', dlmmPool.lbPair.activeId);
    console.log('  Bin Step:', dlmmPool.lbPair.binStep);
    console.log('  Token X:', dlmmPool.tokenX.publicKey.toString());
    console.log('  Token Y:', dlmmPool.tokenY.publicKey.toString());

    // Get wallet from transaction
    const wallet = tx.transaction.message.accountKeys[0];
    console.log('\n👛 Wallet:', wallet.toString());

    // Try to get positions for this user and pool
    console.log('\n📍 Fetching positions for user and pool...');
    const positions = await dlmmPool.getPositionsByUserAndLbPair(wallet);

    console.log(`\n✅ Found ${positions.userPositions.length} position(s) for this user and pool`);

    for (let i = 0; i < positions.userPositions.length; i++) {
      const pos = positions.userPositions[i];
      console.log(`\nPosition ${i + 1}:`);
      console.log('  Address:', pos.publicKey.toString());
      console.log('  Total X:', Number(pos.positionData.totalXAmount.toString()) / 1e6);
      console.log('  Total Y:', Number(pos.positionData.totalYAmount.toString()) / 1e6);
    }

  } catch (error: any) {
    console.error('❌ Error loading pool:', error.message);
  }

  console.log('\n─'.repeat(80));
  console.log('✅ Analysis complete!');
}

main().catch(console.error);
