export type UserTier = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface User {
  id: string;
  wallet_address: string;
  referral_code: string;
  tier: UserTier;
  total_referral_earnings: number;
  total_referrals: number;
  total_volume: number;
  total_transactions: number;
  created_at: Date;
  updated_at: Date;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  total_earnings: number;
  total_transactions: number;
  created_at: Date;
  updated_at: Date;
}

export interface ReferralTransaction {
  id: string;
  referral_id: string;
  user_transaction_id: string;
  transaction_signature: string;
  platform_fee: number;
  referral_amount: number;
  created_at: Date;
}

export interface UserTransaction {
  id: string;
  user_id: string;
  transaction_signature: string;
  protocol: string;
  action_type: string;
  pool_address?: string;
  amount_in: number;
  amount_out: number;
  token_in: string;
  token_out: string;
  platform_fee: number;
  referral_id?: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface Pool {
  id: string;
  pool_address: string;
  protocol: string;
  base_token: string;
  quote_token: string;
  liquidity: number;
  volume_24h: number;
  fees_24h: number;
  apr: number;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface TierHistory {
  id: string;
  user_id: string;
  old_tier: UserTier;
  new_tier: UserTier;
  reason: string;
  created_at: Date;
}

export interface LeaderboardEntry {
  wallet_address: string;
  referral_code: string;
  total_earnings: number;
  total_referrals: number;
  rank: number;
}

export interface PlatformStats {
  total_users: number;
  total_referrals: number;
  total_volume: number;
  total_fees: number;
  total_referral_earnings: number;
}

export interface UserStats {
  wallet_address: string;
  tier: UserTier;
  referral_code: string;
  total_referral_earnings: number;
  total_referrals: number;
  active_referrals: number;
  conversion_rate: number;
  recent_earnings: ReferralTransaction[];
  referrals: Array<{
    referee_wallet: string;
    total_earnings: number;
    total_transactions: number;
    joined_at: Date;
  }>;
}

// Request/Response types
export interface CreateUserRequest {
  wallet_address: string;
  referral_code?: string;
}

export interface CreateReferralRequest {
  referrer_wallet: string;
  referee_wallet: string;
  referral_code: string;
}

export interface RecordTransactionRequest {
  user_wallet: string;
  transaction_signature: string;
  protocol: string;
  action_type: string;
  pool_address?: string;
  amount_in: number;
  amount_out: number;
  token_in: string;
  token_out: string;
  platform_fee: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
