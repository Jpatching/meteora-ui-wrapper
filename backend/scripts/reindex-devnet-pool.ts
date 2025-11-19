/**
 * Re-index Devnet Pool with Bin Data
 * This script fetches and stores bin liquidity data for devnet pools
 * Run: npx tsx scripts/reindex-devnet-pool.ts <pool-address>
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';

const POOL_ADDRESS = process.argv[2] || 'HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH';
const DEVNET_RPC = process.env.DEVNET_RPC || 'https://solana-devnet.g.alchemy.com/v2/BXbO3PWa0QSzFJ6ZBYI5XZ79YfPRQhN0';

// Import database from backend
import('../backend/src/config/database.js').then(async ({ db }) => {
  await reindexPool(db);
  process.exit(0);
}).catch(error => {
  console.error('Failed to import database:', error);
  process.exit(1);
});

async function reindexPool(db: any) {
  console.log(`\n🔄 Re-indexing devnet pool: ${POOL_ADDRESS}\n`);

  try {
    // Connect to devnet
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    console.log(`📡 Connected to devnet: ${DEVNET_RPC}`);

    // Create DLMM pool instance
    const dlmmPool = await DLMM.create(connection, new PublicKey(POOL_ADDRESS), {
      cluster: 'devnet',
    });
    console.log(`✅ DLMM pool loaded`);

    await dlmmPool.refetchStates();

    // Get token info
    const tokenX = dlmmPool.tokenX;
    const tokenY = dlmmPool.tokenY;

    // Get decimals with proper fallback
    const xDecimals = (tokenX as any).decimal || (tokenX as any).mint?.decimals || 9;
    const yDecimals = (tokenY as any).decimal || (tokenY as any).mint?.decimals || 9;

    console.log(`📊 Token decimals: X=${xDecimals}, Y=${yDecimals}`);

    // Get bin data for liquidity calculation AND chart display
    console.log(`🔍 Fetching bins around active bin...`);
    const { bins, activeBin } = await dlmmPool.getBinsAroundActiveBin(50, 50);
    console.log(`✅ Fetched ${bins.length} bins, active bin: ${activeBin}`);

    let totalXAmount = 0;
    let totalYAmount = 0;

    // Process bins and prepare data for storage
    const binData = bins.map((bin: any) => {
      // CRITICAL: xAmount and yAmount are BN objects - convert to string first
      const xAmountRaw = bin.xAmount ? bin.xAmount.toString() : '0';
      const yAmountRaw = bin.yAmount ? bin.yAmount.toString() : '0';

      const liquidityX = Number(xAmountRaw) / Math.pow(10, xDecimals);
      const liquidityY = Number(yAmountRaw) / Math.pow(10, yDecimals);

      totalXAmount += liquidityX;
      totalYAmount += liquidityY;

      // Calculate price for this bin
      const priceDecimal = getPriceOfBinByBinId(bin.binId, dlmmPool.lbPair.binStep);
      const price = dlmmPool.fromPricePerLamport(priceDecimal.toNumber());

      return {
        binId: bin.binId,
        price: parseFloat(price),
        liquidityX,
        liquidityY,
        totalLiquidity: liquidityX + liquidityY,
        isActive: bin.binId === activeBin,
      };
    });

    const binsWithLiquidity = binData.filter(b => b.totalLiquidity > 0);
    console.log(`💧 Bins with liquidity: ${binsWithLiquidity.length}/${bins.length}`);

    if (binsWithLiquidity.length > 0) {
      console.log(`\nFirst 3 bins with liquidity:`);
      binsWithLiquidity.slice(0, 3).forEach(b => {
        console.log(`  Bin ${b.binId}: ${b.liquidityX.toFixed(6)} X / ${b.liquidityY.toFixed(6)} Y`);
      });
    }

    // Calculate current price from active bin
    const activeId = dlmmPool.lbPair.activeId;
    const activePriceDecimal = getPriceOfBinByBinId(activeId, dlmmPool.lbPair.binStep);
    const currentPrice = dlmmPool.fromPricePerLamport(activePriceDecimal.toNumber());

    // Create pool name
    const poolName = `${tokenX.symbol || 'UNKNOWN'}-${tokenY.symbol || 'UNKNOWN'}`;

    console.log(`\n📝 Pool Info:`);
    console.log(`   Name: ${poolName}`);
    console.log(`   Reserves: ${totalXAmount.toFixed(4)} ${tokenX.symbol} / ${totalYAmount.toFixed(4)} ${tokenY.symbol}`);
    console.log(`   Current Price: ${currentPrice}`);
    console.log(`   Active Bin: ${activeId}`);

    // Update database with bin data
    console.log(`\n💾 Updating database...`);
    await db.query(`
      INSERT INTO pools (
        pool_address,
        pool_name,
        protocol,
        token_a_mint,
        token_b_mint,
        token_a_symbol,
        token_b_symbol,
        tvl,
        volume_24h,
        fees_24h,
        apr,
        network,
        metadata,
        last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (pool_address, network)
      DO UPDATE SET
        pool_name = EXCLUDED.pool_name,
        token_a_symbol = EXCLUDED.token_a_symbol,
        token_b_symbol = EXCLUDED.token_b_symbol,
        tvl = EXCLUDED.tvl,
        metadata = EXCLUDED.metadata,
        last_synced_at = NOW()
      RETURNING id
    `, [
      POOL_ADDRESS,
      poolName,
      'dlmm',
      tokenX.publicKey.toString(),
      tokenY.publicKey.toString(),
      tokenX.symbol || null,
      tokenY.symbol || null,
      0, // TVL (no USD prices on devnet)
      0, // Volume
      0, // Fees
      0, // APR
      'devnet',
      JSON.stringify({
        bin_step: dlmmPool.lbPair.binStep,
        base_fee_percentage: '0',
        current_price: currentPrice,
        liquidity: totalXAmount + totalYAmount,
        reserve_x: totalXAmount.toString(),
        reserve_y: totalYAmount.toString(),
        active_bin: activeId,
        decimals_x: xDecimals,
        decimals_y: yDecimals,
        // IMPORTANT: Store bin data for chart rendering
        bins: binsWithLiquidity, // Only store bins with liquidity
        bins_total: bins.length,
        bins_with_liquidity: binsWithLiquidity.length,
      }),
    ]);

    console.log(`✅ Successfully updated pool in database!`);
    console.log(`\n✨ Done! Bin data is now stored in the backend.`);
    console.log(`   Frontend will load bins from database (no RPC calls needed)`);
    console.log(`\nRefresh your pool page to see the chart: http://localhost:3000/pool/${POOL_ADDRESS}`);

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error);
    throw error;
  }
}
