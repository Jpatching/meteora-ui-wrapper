/**
 * Find active DLMM pools on devnet
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// Known devnet DLMM pools - add more as you discover them
const KNOWN_DEVNET_POOLS = [
  // Add pool addresses here as you create them
  // Example: '7pGCYxqJT2J8H7WT8VfKKFNWKT3vFjFbXvQp7bvqQyK5',
];

async function findPools() {
  console.log('\n🔍 Searching for DLMM pools on devnet...\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  if (KNOWN_DEVNET_POOLS.length === 0) {
    console.log('⚠️  No known devnet pools configured yet.\n');
    console.log('💡 To create a test pool:');
    console.log('   cd backend');
    console.log('   npm run seed-devnet\n');
    return;
  }

  for (const poolAddress of KNOWN_DEVNET_POOLS) {
    console.log(`\nChecking pool: ${poolAddress}`);
    console.log('─'.repeat(60));

    try {
      const dlmm = await DLMM.create(connection, new PublicKey(poolAddress), {
        cluster: 'devnet',
      });

      await dlmm.refetchStates();
      const state = dlmm.lbPair;

      console.log('✅ Pool found!');
      console.log('  Token X:', state.tokenXMint.toBase58());
      console.log('  Token Y:', state.tokenYMint.toBase58());
      console.log('  Bin Step:', state.binStep);
      console.log('  Active Bin:', state.activeId);
      console.log('  Base Fee:', state.protocolShare.baseFeeRatePercentage, '%');

      // Get active bin details
      const activeBin = await dlmm.getActiveBin();
      console.log('  Active Bin Supply:', activeBin.supply.toString());
      console.log('  Active Bin X Amount:', activeBin.xAmount.toString());
      console.log('  Active Bin Y Amount:', activeBin.yAmount.toString());

      // Determine if pool has liquidity
      const hasLiquidity = !activeBin.supply.isZero() ||
                          !activeBin.xAmount.isZero() ||
                          !activeBin.yAmount.isZero();

      console.log(`  Has Liquidity: ${hasLiquidity ? '✅ Yes' : '❌ No (empty pool)'}`);

      console.log('\n💡 To test with this pool:');
      console.log(`   export TEST_POOL_ADDRESS=${poolAddress}`);
      console.log('   npm run test:add-liquidity');

    } catch (error: any) {
      console.log('❌ Error:', error.message);
    }
  }
}

findPools().catch(console.error);
