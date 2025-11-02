/**
 * Centralized Meteora Program IDs for all networks
 * These are the official program addresses from Meteora documentation
 */

export type NetworkType = 'mainnet-beta' | 'devnet' | 'localnet';

/**
 * DLMM (Dynamic Liquidity Market Maker) Program IDs
 * https://docs.meteora.ag/dlmm/sdk-reference
 */
export const DLMM_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'devnet': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'localnet': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
};

/**
 * DBC (Dynamic Bonding Curve) Program IDs
 * https://docs.meteora.ag/dbc/sdk-reference
 */
export const DBC_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
  'devnet': 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
  'localnet': 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
};

/**
 * DAMM v2 (Dynamic AMM v2) Program IDs
 * https://docs.meteora.ag/damm-v2/sdk-reference
 */
export const DAMM_V2_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG',
  'devnet': 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG',
  'localnet': 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG',
};

/**
 * DAMM v2 Pool Authority
 */
export const DAMM_V2_POOL_AUTHORITY = 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC';

/**
 * Stake2Earn Program IDs
 * https://docs.meteora.ag/stake2earn/sdk-reference
 */
export const STAKE2EARN_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP',
  'devnet': 'FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP',
  'localnet': 'FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP',
};

/**
 * Dynamic Fee Sharing Program IDs
 * https://docs.meteora.ag/dynamic-fee-sharing/sdk-reference
 */
export const DYNAMIC_FEE_SHARING_PROGRAM_IDS: Record<NetworkType, string> = {
  'mainnet-beta': 'dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh',
  'devnet': 'dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh',
  'localnet': 'dfsdo2UqvwfN8DuUVrMRNfQe11VaiNoKcMqLHVvDPzh',
};

/**
 * DLMM Pool Authority
 */
export const DLMM_POOL_AUTHORITY = 'FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM';

/**
 * Get program ID for a specific protocol and network
 */
export function getProgramId(
  protocol: 'dlmm' | 'dbc' | 'damm-v2' | 'stake2earn' | 'dynamic-fee-sharing',
  network: NetworkType
): string {
  switch (protocol) {
    case 'dlmm':
      return DLMM_PROGRAM_IDS[network];
    case 'dbc':
      return DBC_PROGRAM_IDS[network];
    case 'damm-v2':
      return DAMM_V2_PROGRAM_IDS[network];
    case 'stake2earn':
      return STAKE2EARN_PROGRAM_IDS[network];
    case 'dynamic-fee-sharing':
      return DYNAMIC_FEE_SHARING_PROGRAM_IDS[network];
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}
