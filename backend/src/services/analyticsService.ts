import { query } from '../config/database';
import { getCached, setCached, cacheKeys, CACHE_TTL } from '../config/redis';
import { PlatformStats } from '../utils/types';

export class AnalyticsService {
  // Get platform-wide statistics
  async getPlatformStats(): Promise<PlatformStats> {
    // Check cache first
    const cached = await getCached<PlatformStats>(cacheKeys.platformStats());
    if (cached) return cached;

    const result = await query<PlatformStats>(
      'SELECT * FROM platform_stats'
    );

    const stats = result.rows[0] || {
      total_users: 0,
      total_referrals: 0,
      total_volume: 0,
      total_fees: 0,
      total_referral_earnings: 0,
    };

    // Cache for 10 minutes
    await setCached(cacheKeys.platformStats(), stats, CACHE_TTL.PLATFORM_STATS);

    return stats;
  }

  // Get referral analytics
  async getReferralAnalytics(): Promise<{
    total_referrals: number;
    active_referrals: number;
    total_earnings: number;
    avg_earnings_per_referral: number;
    conversion_rate: number;
  }> {
    const result = await query<{
      total_referrals: string;
      active_referrals: string;
      total_earnings: string;
    }>(
      `SELECT
         COUNT(*) as total_referrals,
         COUNT(DISTINCT CASE WHEN total_transactions > 0 THEN id END) as active_referrals,
         COALESCE(SUM(total_earnings), 0) as total_earnings
       FROM referrals`
    );

    const data = result.rows[0];
    const totalReferrals = parseInt(data.total_referrals || '0');
    const activeReferrals = parseInt(data.active_referrals || '0');
    const totalEarnings = parseFloat(data.total_earnings || '0');

    return {
      total_referrals: totalReferrals,
      active_referrals: activeReferrals,
      total_earnings: totalEarnings,
      avg_earnings_per_referral: totalReferrals > 0 ? totalEarnings / totalReferrals : 0,
      conversion_rate: totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0,
    };
  }

  // Get volume over time (daily)
  async getVolumeOverTime(days: number = 30): Promise<Array<{
    date: string;
    volume: number;
    transactions: number;
    fees: number;
  }>> {
    const result = await query<{
      date: string;
      volume: string;
      transactions: string;
      fees: string;
    }>(
      `SELECT
         DATE(created_at) as date,
         COALESCE(SUM(amount_in), 0) as volume,
         COUNT(*) as transactions,
         COALESCE(SUM(platform_fee), 0) as fees
       FROM user_transactions
       WHERE created_at >= NOW() - INTERVAL '${days} days'
         AND status = 'confirmed'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );

    return result.rows.map(row => ({
      date: row.date,
      volume: parseFloat(row.volume || '0'),
      transactions: parseInt(row.transactions || '0'),
      fees: parseFloat(row.fees || '0'),
    }));
  }

  // Get top pools by volume
  async getTopPools(limit: number = 10): Promise<Array<{
    pool_address: string;
    protocol: string;
    base_token: string;
    quote_token: string;
    volume_24h: number;
    fees_24h: number;
    transactions_24h: number;
  }>> {
    const result = await query<{
      pool_address: string;
      protocol: string;
      base_token: string;
      quote_token: string;
      volume_24h: string;
      fees_24h: string;
      transactions_24h: string;
    }>(
      `SELECT
         ut.pool_address,
         ut.protocol,
         ut.token_in as base_token,
         ut.token_out as quote_token,
         SUM(ut.amount_in) as volume_24h,
         SUM(ut.platform_fee) as fees_24h,
         COUNT(*) as transactions_24h
       FROM user_transactions ut
       WHERE ut.created_at >= NOW() - INTERVAL '24 hours'
         AND ut.status = 'confirmed'
         AND ut.pool_address IS NOT NULL
       GROUP BY ut.pool_address, ut.protocol, ut.token_in, ut.token_out
       ORDER BY volume_24h DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      pool_address: row.pool_address,
      protocol: row.protocol,
      base_token: row.base_token,
      quote_token: row.quote_token,
      volume_24h: parseFloat(row.volume_24h || '0'),
      fees_24h: parseFloat(row.fees_24h || '0'),
      transactions_24h: parseInt(row.transactions_24h || '0'),
    }));
  }

  // Get user growth over time
  async getUserGrowth(days: number = 30): Promise<Array<{
    date: string;
    new_users: number;
    cumulative_users: number;
  }>> {
    const result = await query<{
      date: string;
      new_users: string;
      cumulative_users: string;
    }>(
      `WITH daily_users AS (
         SELECT
           DATE(created_at) as date,
           COUNT(*) as new_users
         FROM users
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
       )
       SELECT
         date,
         new_users,
         SUM(new_users) OVER (ORDER BY date) as cumulative_users
       FROM daily_users
       ORDER BY date DESC`,
      []
    );

    return result.rows.map(row => ({
      date: row.date,
      new_users: parseInt(row.new_users || '0'),
      cumulative_users: parseInt(row.cumulative_users || '0'),
    }));
  }

  // Get tier distribution
  async getTierDistribution(): Promise<Record<string, number>> {
    const result = await query<{ tier: string; count: string }>(
      `SELECT tier, COUNT(*) as count
       FROM users
       GROUP BY tier
       ORDER BY
         CASE tier
           WHEN 'platinum' THEN 5
           WHEN 'gold' THEN 4
           WHEN 'silver' THEN 3
           WHEN 'bronze' THEN 2
           WHEN 'free' THEN 1
         END DESC`,
      []
    );

    const distribution: Record<string, number> = {
      free: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    };

    result.rows.forEach(row => {
      distribution[row.tier] = parseInt(row.count || '0');
    });

    return distribution;
  }
}

export default new AnalyticsService();
