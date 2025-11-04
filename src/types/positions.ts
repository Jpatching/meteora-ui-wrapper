/**
 * Position tracking types for portfolio dashboard
 */

import { PublicKey } from '@solana/web3.js';

export type PositionType = 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha-vault';

export type PositionStatus = 'active' | 'closed' | 'error';

/**
 * User's position in a Meteora pool
 */
export interface UserPosition {
  // Identification
  id: string; // Unique position ID
  type: PositionType;
  poolAddress: string;
  positionAddress?: string; // NFT address for DAMM v2
  walletAddress: string;
  network: 'localnet' | 'devnet' | 'mainnet-beta';

  // Token information
  baseMint: string;
  quoteMint: string;
  baseSymbol?: string;
  quoteSymbol?: string;

  // Position data
  lpBalance: number; // LP token balance
  baseAmount: number; // Current base token amount
  quoteAmount: number; // Current quote token amount

  // Value tracking
  currentValueUSD: number; // Current position value in USD
  initialValueUSD: number; // Initial investment value in USD
  pnlUSD: number; // Profit/Loss in USD
  pnlPercent: number; // Profit/Loss percentage

  // Fees
  unclaimedFeesBase: number; // Unclaimed fees in base token
  unclaimedFeesQuote: number; // Unclaimed fees in quote token
  totalFeesEarnedUSD: number; // Total fees earned (USD)

  // Metadata
  status: PositionStatus;
  createdAt: number; // Unix timestamp
  lastUpdated: number; // Unix timestamp
  transactionSignature?: string; // Creation tx signature
}

/**
 * Pool metrics and statistics
 */
export interface PoolMetrics {
  poolAddress: string;
  type: PositionType;

  // TVL and Volume
  tvlUSD: number; // Total Value Locked
  volume24hUSD: number; // 24h trading volume
  volumeChange24h: number; // 24h volume change percentage

  // Liquidity
  baseReserve: number;
  quoteReserve: number;

  // Fees and APR
  tradingFeeRate: number; // Fee rate in basis points
  apr24h: number; // 24h APR
  apr7d: number; // 7d APR
  apr30d: number; // 30d APR

  // Price
  currentPrice: number; // Current exchange rate
  priceChange24h: number; // 24h price change percentage

  // Activity
  transactions24h: number; // Number of transactions
  uniqueTraders24h: number; // Unique traders

  // Metadata
  lastUpdated: number; // Unix timestamp
}

/**
 * Token price information
 */
export interface TokenPrice {
  mint: string;
  symbol?: string;
  priceUSD: number;
  priceChange24h: number;
  volume24hUSD: number;
  lastUpdated: number;
}

/**
 * Portfolio summary
 */
export interface PortfolioSummary {
  totalValueUSD: number; // Total portfolio value
  totalPnLUSD: number; // Total profit/loss
  totalPnLPercent: number; // Total PnL percentage
  totalFeesEarnedUSD: number; // Total fees earned

  // Position counts
  activePositions: number;
  closedPositions: number;

  // Protocol breakdown
  valueByProtocol: Record<PositionType, number>;
  positionsByProtocol: Record<PositionType, number>;

  // Performance
  bestPerformingPosition?: UserPosition;
  worstPerformingPosition?: UserPosition;

  lastUpdated: number;
}

/**
 * Historical data point for charts
 */
export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Portfolio history for charts
 */
export interface PortfolioHistory {
  timestamps: number[];
  values: number[]; // Portfolio value over time
  pnl: number[]; // PnL over time
  fees: number[]; // Cumulative fees over time
}

/**
 * Real-time position update
 */
export interface PositionUpdate {
  positionId: string;
  field: keyof UserPosition;
  value: any;
  timestamp: number;
}

/**
 * WebSocket subscription types
 */
export type SubscriptionType = 'position' | 'pool' | 'price';

export interface Subscription {
  id: string;
  type: SubscriptionType;
  address: string; // Pool or token address
  callback: (data: any) => void;
}

/**
 * On-chain position account data (protocol-specific)
 */
export interface OnChainPositionData {
  // DLMM/DAMM specific fields
  liquidity?: bigint;
  upperBound?: number;
  lowerBound?: number;
  feeOwedA?: bigint;
  feeOwedB?: bigint;

  // DBC specific fields
  shares?: bigint;

  // Common fields
  owner: PublicKey;
  poolKey: PublicKey;
  lastUpdatedSlot: number;
}

/**
 * Position fetch options
 */
export interface FetchPositionOptions {
  includeMetrics?: boolean; // Fetch pool metrics
  includePrices?: boolean; // Fetch token prices
  includeHistory?: boolean; // Fetch historical data
}
