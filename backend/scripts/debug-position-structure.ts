/**
 * Debug Position Data Structure
 * Shows exactly what the DLMM SDK returns for positions
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH';
const WALLET_ADDRESS = '85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs';

async function main() {
  console.log('\n🔍 Debugging Position Data Structure');
  console.log('─'.repeat(80));

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const walletPubkey = new PublicKey(WALLET_ADDRESS);
  const poolPubkey = new PublicKey(POOL_ADDRESS);

  // Create DLMM instance
  const dlmmPool = await DLMM.create(connection, poolPubkey, {
    cluster: 'devnet',
  });

  // Get positions
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(walletPubkey);

  console.log(`\n✅ Found ${userPositions.length} position(s)\n`);

  // Debug each position
  for (let i = 0; i < userPositions.length; i++) {
    const position = userPositions[i];
    console.log(`\n━━━━━━━━━━━━━━━━ Position ${i + 1} ━━━━━━━━━━━━━━━━`);
    console.log(`Address: ${position.publicKey.toString()}\n`);

    // Show all top-level keys
    console.log('📋 Top-level keys:', Object.keys(position));

    // Show positionData structure
    console.log('\n📦 position.positionData:');
    console.log('  Keys:', Object.keys(position.positionData || {}));
    console.log('  Raw:', JSON.stringify(position.positionData, null, 2).slice(0, 500));

    // Try to access common fields
    console.log('\n💰 Amounts (raw BigNumber values):');
    console.log('  totalXAmount:', position.positionData?.totalXAmount?.toString() || 'undefined');
    console.log('  totalYAmount:', position.positionData?.totalYAmount?.toString() || 'undefined');
    console.log('  feeX:', position.positionData?.feeX?.toString() || 'undefined');
    console.log('  feeY:', position.positionData?.feeY?.toString() || 'undefined');

    // Try to access bin range
    console.log('\n📊 Bin Range:');
    console.log('  lowerBinId:', position.positionData?.lowerBinId);
    console.log('  upperBinId:', position.positionData?.upperBinId);

    // Check if there's a different structure for bin data
    console.log('\n🔍 Checking for alternative structures...');

    // Check position.positionBinData
    if ((position as any).positionBinData) {
      console.log('  ✅ Found positionBinData!');
      console.log('  Length:', (position as any).positionBinData.length);
      console.log('  First bin:', JSON.stringify((position as any).positionBinData[0], null, 2));
    } else {
      console.log('  ❌ No positionBinData');
    }

    // Check position.binData
    if ((position as any).binData) {
      console.log('  ✅ Found binData!');
      console.log('  Length:', (position as any).binData.length);
    } else {
      console.log('  ❌ No binData');
    }

    // Check position itself for bin info
    const posKeys = Object.keys(position);
    const binRelatedKeys = posKeys.filter(k => k.toLowerCase().includes('bin'));
    if (binRelatedKeys.length > 0) {
      console.log('  🔑 Bin-related keys on position:', binRelatedKeys);
      binRelatedKeys.forEach(key => {
        console.log(`    ${key}:`, (position as any)[key]);
      });
    }

    // Try to get position version/type
    console.log('\n📌 Position Metadata:');
    console.log('  version:', (position as any).version);
    console.log('  positionType:', (position as any).positionType);
    console.log('  All keys:', Object.keys(position).join(', '));

    console.log('\n' + '─'.repeat(80));
  }

  // Also show token decimals for reference
  console.log('\n🪙 Token Info:');
  console.log('  Token X:', {
    symbol: dlmmPool.tokenX.symbol,
    decimals: dlmmPool.tokenX.decimal,
    mint: dlmmPool.tokenX.publicKey.toString(),
  });
  console.log('  Token Y:', {
    symbol: dlmmPool.tokenY.symbol,
    decimals: dlmmPool.tokenY.decimal,
    mint: dlmmPool.tokenY.publicKey.toString(),
  });

  console.log('\n✅ Debug complete!\n');
}

main().catch(console.error);
