// Common types
export type NetworkType = 'localnet' | 'devnet' | 'mainnet-beta';

export interface TokenCreateConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals?: number;
  supply?: string;
}

// DLMM Types
export interface DLMMCreatePoolParams {
  baseMint?: string;
  quoteMint: string;
  binStep: number | string;
  initialPrice?: string | number;
  feeBps?: number | string;
  activationType?: number;
  hasAlphaVault?: boolean;
  activationPoint?: number | string;
  creatorPoolOnOffControl?: boolean;
  baseAmount?: string;
  quoteAmount?: string;
  createBaseToken?: TokenCreateConfig;
}

export interface DLMMSeedLiquidityLFGParams {
  baseMint: string;
  quoteMint: string;
  initialPrice: string;
  baseAmount: string;
  quoteAmount: string;
  distribution: 'spot' | 'curve' | 'bid-ask';
}

export interface DLMMSeedLiquiditySingleBinParams {
  baseMint: string;
  quoteMint: string;
  binId: number;
  baseAmount: string;
  quoteAmount: string;
}

export interface DLMMSetPoolStatusParams {
  poolAddress: string;
  status: 'enabled' | 'disabled';
}

// DAMM v2 Types
export interface DAMMv2CreateBalancedPoolParams {
  baseMint?: string;
  quoteMint: string;
  baseAmount: string;
  quoteAmount: string;
  fee: number;
  createBaseToken?: TokenCreateConfig;
}

export interface DAMMv2CreateOneSidedPoolParams {
  baseMint?: string;
  quoteMint: string;
  amount: string;
  side: 'base' | 'quote';
  fee: number;
  createBaseToken?: TokenCreateConfig;
}

export interface DAMMv2AddLiquidityParams {
  poolAddress: string;
  baseAmount: string;
  quoteAmount: string;
  slippage?: number;
}

export interface DAMMv2RemoveLiquidityParams {
  poolAddress: string;
  lpAmount: string;
  slippage?: number;
}

export interface DAMMv2SplitPositionParams {
  poolAddress: string;
  positionAddress: string;
  splitPercentage: number;
}

export interface DAMMv2ClaimFeesParams {
  poolAddress: string;
  positionAddress: string;
}

export interface DAMMv2ClosePositionParams {
  poolAddress: string;
  positionAddress: string;
}

// DAMM v1 Types
export interface DAMMv1CreatePoolParams {
  baseMint?: string;
  quoteMint: string;
  baseAmount: string;
  quoteAmount: string;
  fee: number;
  createBaseToken?: TokenCreateConfig;
}

export interface DAMMv1LockLiquidityParams {
  baseMint: string;
  quoteMint: string;
  duration: number; // in seconds
}

export interface DAMMv1CreateStake2EarnParams {
  baseMint: string;
  quoteMint: string;
  rewardMint: string;
  rewardAmount: string;
  duration: number; // in seconds
}

export interface DAMMv1LockLiquidityStake2EarnParams {
  baseMint: string;
  quoteMint: string;
  farmAddress: string;
}

// DBC Types
export interface DBCCreateConfigParams {
  migrationQuoteThreshold: string;
  tradingFee: number;
  protocolFee: number;
}

export interface DBCCreatePoolParams {
  configAddress?: string;
  baseMint?: string;
  quoteMint: string;
  initialPrice: string;
  createBaseToken?: TokenCreateConfig;
  createConfig?: DBCCreateConfigParams;
}

export interface DBCSwapParams {
  baseMint: string;
  quoteMint: string;
  amount: string;
  side: 'buy' | 'sell';
  slippage?: number;
}

export interface DBCClaimFeesParams {
  baseMint: string;
  quoteMint: string;
}

export interface DBCMigrateToDAMMv1Params {
  baseMint: string;
  quoteMint: string;
}

export interface DBCMigrateToDAMMv2Params {
  baseMint: string;
  quoteMint: string;
}

export interface DBCTransferCreatorParams {
  baseMint: string;
  quoteMint: string;
  newCreator: string;
}

// Alpha Vault Types
export interface AlphaVaultCreateParams {
  baseMint: string;
  quoteMint: string;
  poolAddress: string;
  poolType: 'dlmm' | 'damm-v1' | 'damm-v2';
  whitelistType?: 'merkle' | 'wallet';
  merkleRoot?: string;
  whitelistWallets?: string[];
}

// Settings Types
export interface GenerateKeypairParams {
  network: NetworkType;
  airdrop?: boolean;
  airdropAmount?: number;
}

export interface AirdropSOLParams {
  network: NetworkType;
  amount?: number;
  recipientAddress?: string;
}

// Transaction Result
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  data?: any;
}
