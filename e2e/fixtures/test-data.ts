/**
 * Test data fixtures for DLMM E2E tests
 * Provides consistent test data across all test files
 */

// Generate unique identifiers for each test run to avoid conflicts
const timestamp = Date.now();
const uniqueId = timestamp.toString().slice(-6);

/**
 * Test token configuration for Create Pool tests
 */
export const TEST_TOKEN_CONFIG = {
  name: `Test Token ${uniqueId}`,
  symbol: `TST${uniqueId.slice(-4)}`,
  uri: 'https://arweave.net/test-metadata',
  decimals: '9',
  supply: '1000000000',
};

/**
 * Base pool configuration for DLMM pools
 */
export const TEST_POOL_CONFIG = {
  quoteMint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  binStep: '25', // 0.25% bin step
  feeBps: '1', // 0.01% fee
  initialPrice: '', // Let it auto-calculate
  activationType: '1', // Slot-based activation
  activationPoint: '', // Immediate activation
  hasAlphaVault: false,
  creatorPoolOnOffControl: true, // Allow pool status control
};

/**
 * Liquidity amounts for seeding tests
 */
export const TEST_LIQUIDITY_AMOUNTS = {
  baseAmount: '100', // 100 tokens
  quoteAmount: '1', // 1 SOL
};

/**
 * LFG liquidity seeding configuration
 */
export const TEST_LFG_SEED_CONFIG = {
  minPrice: '0.001', // 0.001 SOL per token
  maxPrice: '0.1', // 0.1 SOL per token
  curvature: '0.6', // Standard curvature
  seedAmount: '50', // 50 tokens
  positionOwner: '', // Will be set to test wallet
  feeOwner: '', // Will be set to test wallet
  lockReleasePoint: '0', // No lock
};

/**
 * Single bin liquidity seeding configuration
 */
export const TEST_SINGLE_SEED_CONFIG = {
  price: '0.01', // 0.01 SOL per token
  priceRounding: 'up' as const,
  seedAmount: '50', // 50 tokens
  positionOwner: '', // Will be set to test wallet
  feeOwner: '', // Will be set to test wallet
  lockReleasePoint: '0', // No lock
};

/**
 * Pool status configuration
 */
export const TEST_POOL_STATUS = {
  enabled: 'enabled' as const,
  disabled: 'disabled' as const,
};

/**
 * Known devnet token addresses for testing with existing tokens
 */
export const DEVNET_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  // Add other known devnet tokens if available
  // USDC: 'DevnetUSDCAddress...',
};

/**
 * RPC endpoint for devnet
 */
export const DEVNET_RPC = process.env.TEST_RPC_ENDPOINT || 'https://api.devnet.solana.com';

/**
 * Test wallet configuration
 */
export const TEST_WALLET_CONFIG = {
  privateKey: process.env.TEST_WALLET_PRIVATE_KEY || '',
  address: process.env.TEST_WALLET_ADDRESS || '',
};

/**
 * Timeout constants for various operations
 */
export const TIMEOUTS = {
  TRANSACTION_CONFIRM: 60000, // 1 minute
  POOL_CREATION: 120000, // 2 minutes
  LIQUIDITY_SEEDING: 90000, // 1.5 minutes
  STATUS_UPDATE: 30000, // 30 seconds
};

/**
 * Solscan URLs for devnet
 */
export function getSolscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export function getSolscanAccountUrl(address: string): string {
  return `https://solscan.io/account/${address}?cluster=devnet`;
}

export function getSolscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${mint}?cluster=devnet`;
}
