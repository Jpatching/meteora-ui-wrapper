/**
 * Debug script to check what's being returned from DLMM.getAllLbPairPositionsByUser
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const WALLET_ADDRESS = '85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs'; // Your wallet from the logs
const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH'; // Your pool

async function main() {
  console.log('\n🔍 Debugging User Positions');
  console.log('─'.repeat(80));
  console.log('Wallet:', WALLET_ADDRESS);
  console.log('Expected Pool:', POOL_ADDRESS);
  console.log('─'.repeat(80));

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const walletPubkey = new PublicKey(WALLET_ADDRESS);

  try {
    console.log('\n📡 Fetching all positions for wallet...');
    const positionsMap = await DLMM.getAllLbPairPositionsByUser(connection, walletPubkey, {
      cluster: 'devnet',
    });

    console.log(`\n✅ Found ${positionsMap.size} position(s)`);
    console.log('─'.repeat(80));

    if (positionsMap.size === 0) {
      console.log('\n⚠️  No positions found!');
      console.log('This could mean:');
      console.log('  1. The position was not created successfully');
      console.log('  2. The SDK is looking at the wrong account');
      console.log('  3. There is a discriminator mismatch (SDK version issue)');
      return;
    }

    // Iterate through each position
    let positionIndex = 0;
    for (const [positionKey, positionData] of positionsMap.entries()) {
      positionIndex++;
      console.log(`\n📍 Position ${positionIndex}:`);
      console.log('  Position Address:', positionKey.toString());

      // Inspect the position data structure
      console.log('\n  📦 Position Data Structure:');
      console.log('    Keys:', Object.keys(positionData));

      const { lbPair, tokenX, tokenY, lbPairPositionsData } = positionData;

      // Try different ways to get pool address
      console.log('\n  🏊 Pool Address (lbPair):');
      console.log('    lbPair.publicKey:', (lbPair as any).publicKey?.toString() || 'undefined');
      console.log('    lbPair.address:', (lbPair as any).address?.toString() || 'undefined');
      console.log('    lbPair itself:', lbPair?.toString() || 'undefined');

      // Check if this matches our expected pool
      const poolAddr =
        (lbPair as any).publicKey?.toString() ||
        (lbPair as any).address?.toString() ||
        lbPair?.toString() ||
        '';

      console.log(`\n  🎯 Pool Match: ${poolAddr === POOL_ADDRESS ? '✅ YES' : '❌ NO'}`);
      console.log(`    Expected: ${POOL_ADDRESS}`);
      console.log(`    Got:      ${poolAddr}`);

      // Token info
      console.log('\n  🪙 Tokens:');
      console.log('    Token X Symbol:', (tokenX as any).symbol || 'unknown');
      console.log('    Token X Mint:', (tokenX as any).publicKey?.toString() || (tokenX as any).address?.toString() || 'unknown');
      console.log('    Token Y Symbol:', (tokenY as any).symbol || 'unknown');
      console.log('    Token Y Mint:', (tokenY as any).publicKey?.toString() || (tokenY as any).address?.toString() || 'unknown');

      // Position bins
      console.log('\n  📊 Position Bins:');
      console.log(`    Number of bins: ${lbPairPositionsData.length}`);

      let totalX = 0;
      let totalY = 0;
      let minBin = Infinity;
      let maxBin = -Infinity;

      for (const posData of lbPairPositionsData) {
        const binId = (posData as any).binId || 0;
        const xAmount = Number(posData.positionData.totalXAmount) / 1e6; // Assuming 6 decimals
        const yAmount = Number(posData.positionData.totalYAmount) / 1e6;

        totalX += xAmount;
        totalY += yAmount;
        minBin = Math.min(minBin, binId);
        maxBin = Math.max(maxBin, binId);

        if (xAmount > 0 || yAmount > 0) {
          console.log(`      Bin ${binId}: X=${xAmount.toFixed(6)}, Y=${yAmount.toFixed(6)}`);
        }
      }

      console.log(`\n  💰 Total Amounts:`);
      console.log(`    Token X: ${totalX.toFixed(6)}`);
      console.log(`    Token Y: ${totalY.toFixed(6)}`);
      console.log(`    Bin Range: ${minBin} → ${maxBin} (${maxBin - minBin + 1} bins)`);

      console.log('─'.repeat(80));
    }

    console.log('\n✅ Debug complete!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack?.slice(0, 500));

    if (error.message?.includes('Invalid account discriminator')) {
      console.log('\n💡 Tip: This is an SDK version mismatch. The position exists but the SDK cannot read it.');
      console.log('   Try updating @meteora-ag/dlmm to the latest version.');
    }
  }
}

main().catch(console.error);
