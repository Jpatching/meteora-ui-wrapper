// Backend API Client
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserStats {
  wallet_address: string;
  tier: string;
  referral_code: string;
  total_referral_earnings: number;
  total_referrals: number;
  active_referrals: number;
  conversion_rate: number;
  recent_earnings: any[];
  referrals: Array<{
    referee_wallet: string;
    total_earnings: number;
    total_transactions: number;
    joined_at: string;
  }>;
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

export interface User {
  id: string;
  wallet_address: string;
  referral_code: string;
  tier: string;
  total_referral_earnings: number;
  total_referrals: number;
  total_volume: number;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Referral API
export const referralAPI = {
  // Get user referral stats
  getUserStats: async (walletAddress: string): Promise<ApiResponse<UserStats>> => {
    return apiFetch<UserStats>(`/api/referrals/${walletAddress}/stats`);
  },

  // Get leaderboard
  getLeaderboard: async (limit: number = 100): Promise<ApiResponse<LeaderboardEntry[]>> => {
    return apiFetch<LeaderboardEntry[]>(`/api/referrals/leaderboard?limit=${limit}`);
  },

  // Validate referral code
  validateCode: async (code: string): Promise<ApiResponse<{ valid: boolean; referrer_wallet?: string }>> => {
    return apiFetch<{ valid: boolean; referrer_wallet?: string }>(`/api/referrals/validate/${code}`);
  },

  // Create referral relationship
  createReferral: async (data: {
    referrer_wallet: string;
    referee_wallet: string;
    referral_code: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch('/api/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// User API
export const userAPI = {
  // Create or get user
  createUser: async (data: {
    wallet_address: string;
    referral_code?: string;
  }): Promise<ApiResponse<User>> => {
    return apiFetch<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get user by wallet
  getUser: async (walletAddress: string): Promise<ApiResponse<User>> => {
    return apiFetch<User>(`/api/users/${walletAddress}`);
  },

  // Get user tier info
  getUserTier: async (walletAddress: string): Promise<ApiResponse<{
    current_tier: string;
    total_volume: number;
    next_tier?: string;
    volume_needed?: number;
  }>> => {
    return apiFetch(`/api/users/${walletAddress}/tier`);
  },

  // Get user transactions
  getUserTransactions: async (
    walletAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<any[]>> => {
    return apiFetch(`/api/users/${walletAddress}/transactions?limit=${limit}&offset=${offset}`);
  },

  // Record transaction
  recordTransaction: async (data: {
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
  }): Promise<ApiResponse<any>> => {
    return apiFetch('/api/users/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Analytics API
export const analyticsAPI = {
  // Get platform statistics
  getPlatformStats: async (): Promise<ApiResponse<PlatformStats>> => {
    return apiFetch<PlatformStats>('/api/analytics/platform');
  },

  // Get referral analytics
  getReferralAnalytics: async (): Promise<ApiResponse<{
    total_referrals: number;
    active_referrals: number;
    total_earnings: number;
    avg_earnings_per_referral: number;
    conversion_rate: number;
  }>> => {
    return apiFetch('/api/analytics/referrals');
  },

  // Get volume over time
  getVolumeOverTime: async (days: number = 30): Promise<ApiResponse<Array<{
    date: string;
    volume: number;
    transactions: number;
    fees: number;
  }>>> => {
    return apiFetch(`/api/analytics/volume?days=${days}`);
  },

  // Get top pools
  getTopPools: async (limit: number = 10): Promise<ApiResponse<Array<{
    pool_address: string;
    protocol: string;
    base_token: string;
    quote_token: string;
    volume_24h: number;
    fees_24h: number;
    transactions_24h: number;
  }>>> => {
    return apiFetch(`/api/analytics/pools/top?limit=${limit}`);
  },

  // Get user growth
  getUserGrowth: async (days: number = 30): Promise<ApiResponse<Array<{
    date: string;
    new_users: number;
    cumulative_users: number;
  }>>> => {
    return apiFetch(`/api/analytics/growth?days=${days}`);
  },

  // Get tier distribution
  getTierDistribution: async (): Promise<ApiResponse<Record<string, number>>> => {
    return apiFetch('/api/analytics/tiers');
  },
};

// Health check
export const healthCheck = async (): Promise<ApiResponse<{
  status: string;
  timestamp: string;
  environment: string;
  services: {
    database: string;
    redis: string;
  };
}>> => {
  return apiFetch('/health');
};
