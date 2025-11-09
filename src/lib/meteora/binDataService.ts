/**
 * Bin Data Service for DLMM Pools
 * Provides real-time bin data, active bin tracking, and position visualization
 * Uses Meteora DLMM SDK functions:
 * - getBinsBetweenMinAndMaxPrice()
 * - getActiveBin()
 * - getBinsAroundActiveBin()
 * - getPosition()
 */

import { Connection, PublicKey } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';

export interface BinData {
  binId: number;
  price: number;
  pricePerToken: number;
  liquidityX: number;
  liquidityY: number;
  totalLiquidity: number;
  isActive: boolean;
}

export interface ActiveBinInfo {
  binId: number;
  price: number;
  pricePerToken: number;
  supply: number;
  xAmount: number;
  yAmount: number;
}

export interface PositionRangeData {
  positionKey: string;
  minBinId: number;
  maxBinId: number;
  minPrice: number;
  maxPrice: number;
  bins: BinData[];
  totalLiquidityX: number;
  totalLiquidityY: number;
  unclaimedFeesX: number;
  unclaimedFeesY: number;
}

/**
 * Bin Data Service Class
 */
export class BinDataService {
  private dlmmPool: DLMM | null = null;
  private connection: Connection;
  private poolAddress: PublicKey;
  private network: 'mainnet-beta' | 'devnet' | 'localhost';
  private activeBinCache: ActiveBinInfo | null = null;
  private lastActiveBinFetch: number = 0;
  private activeBinCacheDuration: number = 2000; // 2 seconds

  constructor(
    connection: Connection,
    poolAddress: string,
    network: 'mainnet-beta' | 'devnet' | 'localhost' = 'devnet'
  ) {
    this.connection = connection;
    this.poolAddress = new PublicKey(poolAddress);
    this.network = network;
  }

  /**
   * Initialize the DLMM pool instance
   */
  async initialize(): Promise<void> {
    if (this.dlmmPool) return;

    try {
      // First, verify the account exists
      const accountInfo = await this.connection.getAccountInfo(this.poolAddress);
      if (!accountInfo) {
        throw new Error(`Pool account ${this.poolAddress.toString()} does not exist on ${this.network}`);
      }

      this.dlmmPool = await DLMM.create(this.connection, this.poolAddress, {
        cluster: this.network,
      }).catch((error: any) => {
        // Handle discriminator errors gracefully
        if (error.message?.includes('Invalid account discriminator')) {
          throw new Error(`Invalid DLMM pool account at ${this.poolAddress.toString()}. This may not be a valid DLMM pool or the pool doesn't exist yet.`);
        }
        throw error;
      });

      console.log('[BinDataService] DLMM pool initialized:', this.poolAddress.toString());
    } catch (error: any) {
      console.error('[BinDataService] Failed to initialize DLMM pool:', error.message);
      throw error;
    }
  }

  /**
   * Get the active bin (current price bin)
   * Cached for performance
   * Uses SDK's getActiveBin() method
   */
  async getActiveBin(): Promise<ActiveBinInfo> {
    await this.initialize();

    // Return cached data if recent
    const now = Date.now();
    if (this.activeBinCache && (now - this.lastActiveBinFetch) < this.activeBinCacheDuration) {
      return this.activeBinCache;
    }

    try {
      // Use SDK's getActiveBin() method which returns BinLiquidity
      const activeBinData = await this.dlmmPool!.getActiveBin();

      const binId = activeBinData.binId;
      const binStep = this.dlmmPool!.lbPair.binStep;

      // Calculate price from bin ID
      const priceDecimal = getPriceOfBinByBinId(binId, binStep);
      const priceString = this.dlmmPool!.fromPricePerLamport(priceDecimal.toNumber());
      const price = parseFloat(priceString);

      const activeBinInfo: ActiveBinInfo = {
        binId,
        price,
        pricePerToken: price,
        supply: Number(activeBinData.supply || 0),
        xAmount: Number(activeBinData.xAmount || 0) / 1e9,
        yAmount: Number(activeBinData.yAmount || 0) / 1e9,
      };

      // Cache the result
      this.activeBinCache = activeBinInfo;
      this.lastActiveBinFetch = now;

      return activeBinInfo;
    } catch (error) {
      console.error('[BinDataService] Error getting active bin:', error);
      throw error;
    }
  }

  /**
   * Get bins around the active bin
   * Useful for showing nearby liquidity distribution
   * Uses SDK's getBinsAroundActiveBin() method
   */
  async getBinsAroundActiveBin(binRange: number = 50): Promise<BinData[]> {
    await this.initialize();

    try {
      // Check if dlmmPool and lbPair are properly initialized
      if (!this.dlmmPool || !this.dlmmPool.lbPair) {
        console.error('[BinDataService] DLMM pool or lbPair not initialized');
        return [];
      }

      // Use SDK method: getBinsAroundActiveBin(left, right)
      const { activeBin, bins } = await this.dlmmPool.getBinsAroundActiveBin(binRange, binRange);
      const binStep = this.dlmmPool.lbPair.binStep;

      // Convert BinLiquidity[] to BinData[]
      return bins.map((bin: any) => {
        const priceDecimal = getPriceOfBinByBinId(bin.binId, binStep);
        const priceString = this.dlmmPool!.fromPricePerLamport(priceDecimal.toNumber());
        const price = parseFloat(priceString);

        return {
          binId: bin.binId,
          price,
          pricePerToken: price,
          liquidityX: Number(bin.xAmount || 0) / 1e9,
          liquidityY: Number(bin.yAmount || 0) / 1e9,
          totalLiquidity: (Number(bin.xAmount || 0) + Number(bin.yAmount || 0)) / 1e9,
          isActive: bin.binId === activeBin,
        };
      });
    } catch (error) {
      console.error('[BinDataService] Error getting bins around active bin:', error);
      throw error;
    }
  }

  /**
   * Get bins between min and max price
   * For visualizing liquidity distribution in price range
   * Uses SDK's getBinsBetweenMinAndMaxPrice() method
   */
  async getBinsBetweenPrices(minPrice: number, maxPrice: number): Promise<BinData[]> {
    await this.initialize();

    try {
      // Use SDK method directly
      const { activeBin, bins } = await this.dlmmPool!.getBinsBetweenMinAndMaxPrice(minPrice, maxPrice);
      const binStep = this.dlmmPool!.lbPair.binStep;

      // Convert BinLiquidity[] to BinData[]
      return bins.map((bin: any) => {
        const priceDecimal = getPriceOfBinByBinId(bin.binId, binStep);
        const priceString = this.dlmmPool!.fromPricePerLamport(priceDecimal.toNumber());
        const price = parseFloat(priceString);

        return {
          binId: bin.binId,
          price,
          pricePerToken: price,
          liquidityX: Number(bin.xAmount || 0) / 1e9,
          liquidityY: Number(bin.yAmount || 0) / 1e9,
          totalLiquidity: (Number(bin.xAmount || 0) + Number(bin.yAmount || 0)) / 1e9,
          isActive: bin.binId === activeBin,
        };
      });
    } catch (error) {
      console.error('[BinDataService] Error getting bins between prices:', error);
      throw error;
    }
  }

  /**
   * Get bins between min and max bin IDs
   */
  async getBinsBetweenRange(minBinId: number, maxBinId: number): Promise<BinData[]> {
    await this.initialize();

    try {
      await this.dlmmPool!.refetchStates();

      const activeBin = this.dlmmPool!.lbPair.activeId;
      const binArrays = await this.dlmmPool!.getBinArrays();
      const binsResult: BinData[] = [];

      // Iterate through all bin arrays
      for (const binArray of binArrays) {
        // BinArrayAccount type doesn't expose bins property, but it exists at runtime
        const bins = (binArray as any).bins || [];
        for (const bin of bins) {
          const binId = (bin as any).binId || 0;

          // Only include bins in our range
          if (binId >= minBinId && binId <= maxBinId) {
            const binStep = this.dlmmPool!.lbPair.binStep;
            const priceDecimal = getPriceOfBinByBinId(binId, binStep);
            const priceString = this.dlmmPool!.fromPricePerLamport(priceDecimal.toNumber());
            const price = parseFloat(priceString);

            const liquidityX = Number((bin as any).amountX || 0) / 1e9;
            const liquidityY = Number((bin as any).amountY || 0) / 1e9;

            binsResult.push({
              binId,
              price,
              pricePerToken: price,
              liquidityX,
              liquidityY,
              totalLiquidity: liquidityX + liquidityY * price, // Approximate total in base token
              isActive: binId === activeBin,
            });
          }
        }
      }

      // Sort by bin ID
      binsResult.sort((a, b) => a.binId - b.binId);

      return binsResult;
    } catch (error) {
      console.error('[BinDataService] Error getting bins between range:', error);
      throw error;
    }
  }

  /**
   * Get position data with bin-level details
   * Shows exactly where user's liquidity is distributed
   */
  async getPositionRangeData(positionAddress: string): Promise<PositionRangeData> {
    await this.initialize();

    try {
      const positionPubkey = new PublicKey(positionAddress);
      const position = await this.dlmmPool!.getPosition(positionPubkey);

      // Get min/max bin IDs from position data
      let minBinId = Infinity;
      let maxBinId = -Infinity;
      let totalLiquidityX = 0;
      let totalLiquidityY = 0;
      let unclaimedFeesX = 0;
      let unclaimedFeesY = 0;

      // Position data may not be iterable, cast to any for SDK compatibility
      const positionData = position.positionData as any;
      for (const posData of Array.isArray(positionData) ? positionData : []) {
        const binId = (posData as any).binId || 0;
        minBinId = Math.min(minBinId, binId);
        maxBinId = Math.max(maxBinId, binId);

        totalLiquidityX += Number(posData.totalXAmount || 0) / 1e9;
        totalLiquidityY += Number(posData.totalYAmount || 0) / 1e9;
        unclaimedFeesX += Number(posData.feeX || 0) / 1e9;
        unclaimedFeesY += Number(posData.feeY || 0) / 1e9;
      }

      // Calculate price range
      const binStep = this.dlmmPool!.lbPair.binStep;
      const minPriceDecimal = getPriceOfBinByBinId(minBinId, binStep);
      const maxPriceDecimal = getPriceOfBinByBinId(maxBinId, binStep);
      const minPriceStr = this.dlmmPool!.fromPricePerLamport(minPriceDecimal.toNumber());
      const maxPriceStr = this.dlmmPool!.fromPricePerLamport(maxPriceDecimal.toNumber());

      // Get bin data for visualization
      const bins = await this.getBinsBetweenRange(minBinId, maxBinId);

      return {
        positionKey: positionAddress,
        minBinId,
        maxBinId,
        minPrice: parseFloat(minPriceStr),
        maxPrice: parseFloat(maxPriceStr),
        bins,
        totalLiquidityX,
        totalLiquidityY,
        unclaimedFeesX,
        unclaimedFeesY,
      };
    } catch (error) {
      console.error('[BinDataService] Error getting position range data:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal bin range based on volatility and strategy
   * Used for auto-rebalancing
   */
  calculateOptimalBinRange(
    currentPrice: number,
    strategy: 'narrow' | 'moderate' | 'wide',
    volatility?: number
  ): { minBinId: number; maxBinId: number; minPrice: number; maxPrice: number } {
    const binStep = this.dlmmPool!.lbPair.binStep;
    const binStepDecimal = binStep / 10000;

    let rangeBins: number;
    if (strategy === 'narrow') {
      rangeBins = 20; // ±20 bins
    } else if (strategy === 'moderate') {
      rangeBins = 50; // ±50 bins
    } else {
      rangeBins = 100; // ±100 bins
    }

    // Adjust for volatility if provided
    if (volatility !== undefined) {
      rangeBins = Math.floor(rangeBins * (1 + volatility));
    }

    const minPrice = currentPrice * Math.pow(1 + binStepDecimal, -rangeBins);
    const maxPrice = currentPrice * Math.pow(1 + binStepDecimal, rangeBins);

    const minBinId = this.dlmmPool!.getBinIdFromPrice(minPrice, false);
    const maxBinId = this.dlmmPool!.getBinIdFromPrice(maxPrice, true);

    return { minBinId, maxBinId, minPrice, maxPrice };
  }

  /**
   * Check if position needs rebalancing
   * Returns true if current price is outside the position range
   */
  async shouldRebalancePosition(
    positionAddress: string,
    rebalanceThreshold: number = 0.1 // 10% from edge
  ): Promise<{ shouldRebalance: boolean; reason?: string; currentPrice: number }> {
    try {
      const activeBin = await this.getActiveBin();
      const positionRange = await this.getPositionRangeData(positionAddress);

      const binRange = positionRange.maxBinId - positionRange.minBinId;
      const thresholdBins = Math.floor(binRange * rebalanceThreshold);

      // Check if active bin is within threshold of position edges
      const distanceFromMin = activeBin.binId - positionRange.minBinId;
      const distanceFromMax = positionRange.maxBinId - activeBin.binId;

      if (distanceFromMin < thresholdBins) {
        return {
          shouldRebalance: true,
          reason: `Price ${activeBin.price} is near lower bound ${positionRange.minPrice}`,
          currentPrice: activeBin.price,
        };
      }

      if (distanceFromMax < thresholdBins) {
        return {
          shouldRebalance: true,
          reason: `Price ${activeBin.price} is near upper bound ${positionRange.maxPrice}`,
          currentPrice: activeBin.price,
        };
      }

      // Check if price is completely outside range
      if (activeBin.binId < positionRange.minBinId || activeBin.binId > positionRange.maxBinId) {
        return {
          shouldRebalance: true,
          reason: `Price ${activeBin.price} is outside position range [${positionRange.minPrice}, ${positionRange.maxPrice}]`,
          currentPrice: activeBin.price,
        };
      }

      return {
        shouldRebalance: false,
        currentPrice: activeBin.price,
      };
    } catch (error) {
      console.error('[BinDataService] Error checking rebalance need:', error);
      throw error;
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.dlmmPool = null;
    this.activeBinCache = null;
  }
}

/**
 * Factory function to create BinDataService instance
 */
export function createBinDataService(
  connection: Connection,
  poolAddress: string,
  network: 'mainnet-beta' | 'devnet' | 'localhost' = 'devnet'
): BinDataService {
  return new BinDataService(connection, poolAddress, network);
}
