/**
 * Devnet Pool Auto-Indexing Service
 * Automatically discovers and indexes devnet pools when accessed
 * Since devnet pools aren't in Meteora APIs, we fetch directly from chain
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import { db } from '../config/database';
import { getTokenMetadata } from './tokenMetadataService';

const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';

interface PoolIndexResult {
  success: boolean;
  poolAddress: string;
  poolType: string;
  alreadyExists?: boolean;
  error?: string;
}

/**
 * Auto-index a DLMM pool from devnet
 * Fetches on-chain data and stores in database
 */
export async function autoIndexDLMMPool(poolAddress: string): Promise<PoolIndexResult> {
  console.log(`[DevnetSync] 🔍 Auto-indexing DLMM pool: ${poolAddress}`);

  try {
    // Check if already indexed
    const existing = await db.query(
      'SELECT id FROM pools WHERE pool_address = $1 AND network = $2',
      [poolAddress, 'devnet']
    );

    if (existing.rows.length > 0) {
      console.log(`[DevnetSync] ✅ Pool already indexed: ${poolAddress}`);
      return { success: true, poolAddress, poolType: 'dlmm', alreadyExists: true };
    }

    // Fetch from chain
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
      cluster: 'devnet',
    });

    await dlmmPool.refetchStates();

    // Get token info
    const tokenX = dlmmPool.tokenX;
    const tokenY = dlmmPool.tokenY;

    // Get bin data for liquidity calculation AND chart display
    const { bins, activeBin } = await dlmmPool.getBinsAroundActiveBin(50, 50);

    // Get decimals with proper fallback
    const xDecimals = (tokenX as any).decimal || (tokenX as any).mint?.decimals || 9;
    const yDecimals = (tokenY as any).decimal || (tokenY as any).mint?.decimals || 9;

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
      const pricePerLamport = dlmmPool.lbPair.getPriceOfBinByBinId(bin.binId);
      const price = dlmmPool.fromPricePerLamport(Number(pricePerLamport));

      return {
        binId: bin.binId,
        price: parseFloat(price),
        liquidityX,
        liquidityY,
        totalLiquidity: liquidityX + liquidityY,
        isActive: bin.binId === activeBin,
      };
    });

    // Calculate current price from active bin
    const activeId = dlmmPool.lbPair.activeId;
    const pricePerLamport = dlmmPool.lbPair.getPriceOfBinByBinId(activeId);
    const currentPrice = dlmmPool.fromPricePerLamport(Number(pricePerLamport));

    // Create pool name
    const poolName = `${tokenX.symbol || 'UNKNOWN'}-${tokenY.symbol || 'UNKNOWN'}`;

    // Insert into database with bin data
    const insertResult = await db.query(`
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
      poolAddress,
      poolName,
      'dlmm',
      tokenX.publicKey.toString(),
      tokenY.publicKey.toString(),
      tokenX.symbol || null,
      tokenY.symbol || null,
      0, // TVL (no USD prices on devnet)
      0, // Volume (would need historical data)
      0, // Fees (would need historical data)
      0, // APR (would need historical data)
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
        bins: binData.filter(b => b.totalLiquidity > 0), // Only store bins with liquidity
        bins_total: bins.length,
        bins_with_liquidity: binData.filter(b => b.totalLiquidity > 0).length,
      }),
    ]);

    console.log(`[DevnetSync] ✅ Successfully indexed pool ${poolAddress}`);
    console.log(`[DevnetSync]    Name: ${poolName}`);
    console.log(`[DevnetSync]    Reserves: ${totalXAmount.toFixed(4)} ${tokenX.symbol} / ${totalYAmount.toFixed(4)} ${tokenY.symbol}`);

    return { success: true, poolAddress, poolType: 'dlmm' };

  } catch (error: any) {
    console.error(`[DevnetSync] ❌ Failed to index pool ${poolAddress}:`, error.message);
    return { success: false, poolAddress, poolType: 'dlmm', error: error.message };
  }
}

/**
 * Auto-index a DAMM v2 pool from devnet
 */
export async function autoIndexDAMMPool(poolAddress: string): Promise<PoolIndexResult> {
  console.log(`[DevnetSync] 🔍 Auto-indexing DAMM v2 pool: ${poolAddress}`);

  try {
    // Check if already indexed
    const existing = await db.query(
      'SELECT id FROM pools WHERE pool_address = $1 AND network = $2',
      [poolAddress, 'devnet']
    );

    if (existing.rows.length > 0) {
      console.log(`[DevnetSync] ✅ Pool already indexed: ${poolAddress}`);
      return { success: true, poolAddress, poolType: 'damm-v2', alreadyExists: true };
    }

    // Fetch from chain
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const pool = await AmmImpl.create(connection, new PublicKey(poolAddress), {
      cluster: 'devnet',
    });

    // Get pool info
    const poolState = pool.poolState;
    const tokenAMint = poolState.tokenAMint.toString();
    const tokenBMint = poolState.tokenBMint.toString();

    // Get token metadata
    const [tokenAMeta, tokenBMeta] = await Promise.all([
      getTokenMetadata(tokenAMint, 'devnet').catch(() => ({ symbol: 'UNKNOWN', decimals: 9 })),
      getTokenMetadata(tokenBMint, 'devnet').catch(() => ({ symbol: 'UNKNOWN', decimals: 9 })),
    ]);

    const poolName = `${tokenAMeta.symbol}-${tokenBMeta.symbol}`;

    // Get reserve amounts
    const tokenAAmount = Number(poolState.tokenAAmount || 0) / Math.pow(10, tokenAMeta.decimals || 9);
    const tokenBAmount = Number(poolState.tokenBAmount || 0) / Math.pow(10, tokenBMeta.decimals || 9);

    // Insert into database
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
        metadata = EXCLUDED.metadata,
        last_synced_at = NOW()
    `, [
      poolAddress,
      poolName,
      'damm-v2',
      tokenAMint,
      tokenBMint,
      tokenAMeta.symbol,
      tokenBMeta.symbol,
      0, // TVL
      0, // Volume
      0, // Fees
      0, // APR
      'devnet',
      JSON.stringify({
        pool_type: poolState.poolType || 0,
        base_fee: 0,
        reserve_a: tokenAAmount.toString(),
        reserve_b: tokenBAmount.toString(),
      }),
    ]);

    console.log(`[DevnetSync] ✅ Successfully indexed DAMM v2 pool ${poolAddress}`);
    return { success: true, poolAddress, poolType: 'damm-v2' };

  } catch (error: any) {
    console.error(`[DevnetSync] ❌ Failed to index DAMM v2 pool ${poolAddress}:`, error.message);
    return { success: false, poolAddress, poolType: 'damm-v2', error: error.message };
  }
}

/**
 * Auto-detect pool type and index accordingly
 */
export async function autoIndexPool(poolAddress: string, poolType?: 'dlmm' | 'damm-v2'): Promise<PoolIndexResult> {
  // If type is specified, use it
  if (poolType === 'dlmm') {
    return autoIndexDLMMPool(poolAddress);
  } else if (poolType === 'damm-v2') {
    return autoIndexDAMMPool(poolAddress);
  }

  // Otherwise, try DLMM first (most common), then DAMM v2
  const dlmmResult = await autoIndexDLMMPool(poolAddress);
  if (dlmmResult.success) {
    return dlmmResult;
  }

  return autoIndexDAMMPool(poolAddress);
}
