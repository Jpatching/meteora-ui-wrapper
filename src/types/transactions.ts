/**
 * Transaction tracking types for analytics and user history
 */

export type ProtocolType = 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha-vault' | 'settings';

export type ActionType =
  // DLMM
  | 'dlmm-create-pool'
  | 'dlmm-create-token'
  | 'dlmm-seed-lfg'
  | 'dlmm-seed-single'
  | 'dlmm-set-status'
  // DAMM v1
  | 'damm-v1-create-pool'
  | 'damm-v1-lock-liquidity'
  | 'damm-v1-create-stake2earn'
  | 'damm-v1-lock-stake2earn'
  // DAMM v2
  | 'damm-v2-create-balanced'
  | 'damm-v2-create-one-sided'
  | 'damm-v2-add-liquidity'
  | 'damm-v2-remove-liquidity'
  | 'damm-v2-claim-fees'
  | 'damm-v2-close-position'
  | 'damm-v2-split-position'
  // DBC
  | 'dbc-create-config'
  | 'dbc-create-pool'
  | 'dbc-swap'
  | 'dbc-claim-fees'
  | 'dbc-migrate-v1'
  | 'dbc-migrate-v2'
  | 'dbc-transfer-creator'
  // Alpha Vault
  | 'alpha-vault-create'
  // Settings
  | 'airdrop';

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface TransactionRecord {
  // Core identification
  id: string; // Unique ID (UUID)
  signature: string; // Transaction signature
  walletAddress: string; // User's wallet address
  timestamp: number; // Unix timestamp
  network: 'localnet' | 'devnet' | 'mainnet-beta';

  // Classification
  protocol: ProtocolType;
  action: ActionType;
  status: TransactionStatus;

  // Transaction details
  params: Record<string, any>; // Original parameters passed to SDK
  error?: string; // Error message if failed

  // Created resources
  poolAddress?: string;
  tokenAddress?: string;
  configAddress?: string;
  vaultAddress?: string;
  positionAddress?: string;

  // Financial data
  platformFee?: number; // Fee paid in SOL (lamports)
  feeToken?: string; // Fee token mint if different from SOL
  metadataServiceUsed?: boolean; // Whether user used metadata service
  metadataFee?: number; // Metadata service fee paid (lamports, if used)

  // Metadata
  label?: string; // User-defined label for this transaction
  tags?: string[]; // User tags for organization
  metadataUri?: string; // IPFS URI if metadata was created
}

export interface TransactionFilter {
  protocol?: ProtocolType;
  action?: ActionType;
  status?: TransactionStatus;
  network?: string;
  startDate?: number;
  endDate?: number;
  search?: string; // Search in signature, pool address, token address
}

export interface AnalyticsSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalFeesPaid: number; // Total platform fees paid (lamports)
  totalMetadataFees: number; // Total metadata service fees paid (lamports)
  metadataServiceUsages: number; // Number of times metadata service was used
  totalPools: number;
  totalTokens: number;
  protocolBreakdown: Record<ProtocolType, number>;
  actionBreakdown: Record<ActionType, number>;
}

export interface ExportData {
  version: string; // Schema version for future compatibility
  exportDate: number; // When export was created
  walletAddress: string;
  transactions: TransactionRecord[];
}
