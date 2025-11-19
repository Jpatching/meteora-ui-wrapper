/**
 * Diagnostic script to check pool state, positions, and price ranges
 * Usage: npx tsx scripts/diagnose-pool.ts
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import { readFileSync } from 'fs';
import { homedir } from 'os';

const POOL_ADDRESS = 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH';
const RPC_URL = 'https://api.devnet.solana.com';

async function diagnosePool() {
  console.log('🔍 Diagnosing DLMM Pool...\n');
  console.log(`Pool: ${POOL_ADDRESS}`);
  console.log(`Network: devnet\n`);

  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Load wallet
    const keypairPath = `${homedir()}/.config/solana/id.json`;
    const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Create DLMM instance
    console.log('📡 Fetching pool data from chain...');
    const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), {
      cluster: 'devnet',
    });

    // Pool Info
    console.log('\n📊 POOL INFO:');
    console.log(`  Active Bin ID: ${dlmmPool.lbPair.activeId}`);
    console.log(`  Bin Step: ${dlmmPool.lbPair.binStep}`);
    console.log(`  Base Fee (bps): ${dlmmPool.lbPair.parameters.baseFactor}`);
    console.log(`  Token X: ${dlmmPool.tokenX.publicKey.toBase58()}`);
    console.log(`  Token Y: ${dlmmPool.tokenY.publicKey.toBase58()}`);

    // Get active bin
    const activeBin = await dlmmPool.getActiveBin();
    const activePriceDecimal = getPriceOfBinByBinId(activeBin.binId, dlmmPool.lbPair.binStep);
    const activePrice = dlmmPool.fromPricePerLamport(parseFloat(activePriceDecimal.toString()));
    console.log(`\n💰 ACTIVE PRICE:`);
    console.log(`  Bin ID: ${activeBin.binId}`);
    console.log(`  Price: ${activePrice}`);
    console.log(`  X Amount: ${Number(activeBin.xAmount) / 1e9}`);
    console.log(`  Y Amount: ${Number(activeBin.yAmount) / 1e9}`);

    // Get bins around active
    console.log('\n📈 LIQUIDITY DISTRIBUTION (±50 bins):');
    const { bins } = await dlmmPool.getBinsAroundActiveBin(50, 50);
    const binsWithLiquidity = bins.filter(b =>
      Number(b.xAmount) > 0 || Number(b.yAmount) > 0
    );
    console.log(`  Total bins: ${bins.length}`);
    console.log(`  Bins with liquidity: ${binsWithLiquidity.length}`);

    if (binsWithLiquidity.length > 0) {
      console.log(`\n  📊 Top 10 Bins by Liquidity:`);
      binsWithLiquidity
        .sort((a, b) => (Number(b.xAmount) + Number(b.yAmount)) - (Number(a.xAmount) + Number(a.yAmount)))
        .slice(0, 10)
        .forEach((bin, i) => {
          const priceDecimal = getPriceOfBinByBinId(bin.binId, dlmmPool.lbPair.binStep);
          const price = dlmmPool.fromPricePerLamport(parseFloat(priceDecimal.toString()));
          console.log(`    ${i + 1}. Bin ${bin.binId} (Price: ${price})`);
          console.log(`       X: ${(Number(bin.xAmount) / 1e9).toFixed(6)}`);
          console.log(`       Y: ${(Number(bin.yAmount) / 1e9).toFixed(6)}`);
        });
    }

    // Get user positions
    console.log('\n👤 USER POSITIONS:');
    try {
      const positionsMap = await DLMM.getAllLbPairPositionsByUser(
        connection,
        wallet.publicKey,
        { cluster: 'devnet' }
      );

      console.log(`  Total positions: ${positionsMap.size}`);

      if (positionsMap.size > 0) {
        for (const [positionKey, positionData] of positionsMap.entries()) {
          console.log(`\n  Position: ${positionKey}`);
          console.log(`    Pool: ${positionData.lbPair.publicKey?.toString() || 'N/A'}`);

          const { lbPairPositionsData } = positionData;
          console.log(`    Bins: ${lbPairPositionsData.length}`);

          let totalX = 0;
          let totalY = 0;
          let minBin = Number.MAX_SAFE_INTEGER;
          let maxBin = Number.MIN_SAFE_INTEGER;

          for (const pos of lbPairPositionsData) {
            totalX += Number(pos.positionData.totalXAmount) / 1e9;
            totalY += Number(pos.positionData.totalYAmount) / 1e9;
            const binId = pos.positionData.lowerBinId;
            if (binId < minBin) minBin = binId;
            if (binId > maxBin) maxBin = binId;
          }

          const minPriceDecimal = getPriceOfBinByBinId(minBin, dlmmPool.lbPair.binStep);
          const minPrice = dlmmPool.fromPricePerLamport(parseFloat(minPriceDecimal.toString()));
          const maxPriceDecimal = getPriceOfBinByBinId(maxBin, dlmmPool.lbPair.binStep);
          const maxPrice = dlmmPool.fromPricePerLamport(parseFloat(maxPriceDecimal.toString()));

          console.log(`    Total X: ${totalX.toFixed(6)}`);
          console.log(`    Total Y: ${totalY.toFixed(6)}`);
          console.log(`    Price Range: ${minPrice} - ${maxPrice}`);
          console.log(`    Bin Range: ${minBin} - ${maxBin}`);
        }
      } else {
        console.log('  ❌ No positions found for this wallet');
      }
    } catch (error: any) {
      console.error(`  ❌ Error fetching positions: ${error.message}`);
    }

    console.log('\n✅ Diagnosis complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnosePool();
