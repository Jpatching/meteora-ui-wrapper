/**
 * Centralized Meteora Program IDs for all networks
 * These are the official program addresses from Meteora documentation
 */

export type NetworkType = 'mainnet-beta' | 'devnet';

/**
 * DLMM (Dynamic Liquidity Market Maker) Program IDs
 * https://docs.meteora.ag/dlmm/sdk-reference
 */
export const DLMM_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'devnet': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
};

/**
 * DBC (Dynamic Bonding Curve) Program IDs
 * https://docs.meteora.ag/dbc/sdk-reference
 */
export const DBC_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
  'devnet': 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
};

/**
 * DAMM v1 (Dynamic AMM v1) Program IDs
 * https://docs.meteora.ag/damm-v1/sdk-reference
 */
export const DAMM_V1_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  'devnet': 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
};

/**
 * DAMM v2 (Dynamic AMM v2) Program IDs
 * https://docs.meteora.ag/damm-v2/sdk-reference
 */
export const DAMM_V2_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG',
  'devnet': 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG',
};

/**
 * DAMM v2 Pool Authority
 */
export const DAMM_V2_POOL_AUTHORITY = 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC';

/**
 * Alpha Vault Program IDs
 * https://docs.meteora.ag/alpha-vault/sdk-reference
 */
export const ALPHA_VAULT_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'vaU6kP7iNEGkbmPkLmZfGwiGxd4Mob24QQCie5R9kd2',
  'devnet': 'vaU6kP7iNEGkbmPkLmZfGwiGxd4Mob24QQCie5R9kd2',
};

/**
 * Dynamic Vault Program IDs
 * https://docs.meteora.ag/dynamic-vault/sdk-reference
 */
export const DYNAMIC_VAULT_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi',
  'devnet': '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi',
};

/**
 * Stake2Earn Program IDs
 * https://docs.meteora.ag/stake2earn/sdk-reference
 */
export const STAKE2EARN_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP',
  'devnet': 'FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP',
};

/**
 * Dynamic Fee Sharing Program IDs
 * https://docs.meteora.ag/dynamic-fee-sharing/sdk-reference
 */
export const DYNAMIC_FEE_SHARING_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh',
  'devnet': 'dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh',
};

/**
 * Pool Authority Addresses
 */
export const POOL_AUTHORITIES = {
  DLMM: 'FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM',
  DBC: 'FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM',
  DAMM_V2: 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC',
} as const;

/**
 * Get program ID for a specific protocol and network
 */
export function getProgramId(
  protocol: 'dlmm' | 'dbc' | 'damm-v1' | 'damm-v2' | 'alpha-vault' | 'dynamic-vault' | 'stake2earn' | 'dynamic-fee-sharing',
  network: NetworkType
): string {
  switch (protocol) {
    case 'dlmm':
      return DLMM_PROGRAM_IDS[network];
    case 'dbc':
      return DBC_PROGRAM_IDS[network];
    case 'damm-v1':
      return DAMM_V1_PROGRAM_IDS[network];
    case 'damm-v2':
      return DAMM_V2_PROGRAM_IDS[network];
    case 'alpha-vault':
      return ALPHA_VAULT_PROGRAM_IDS[network];
    case 'dynamic-vault':
      return DYNAMIC_VAULT_PROGRAM_IDS[network];
    case 'stake2earn':
      return STAKE2EARN_PROGRAM_IDS[network];
    case 'dynamic-fee-sharing':
      return DYNAMIC_FEE_SHARING_PROGRAM_IDS[network];
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}
