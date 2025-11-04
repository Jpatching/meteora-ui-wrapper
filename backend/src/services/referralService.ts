import { query, withTransaction } from '../config/database';
import { getCached, setCached, cacheKeys, CACHE_TTL, deleteCached } from '../config/redis';
import {
  User,
  Referral,
  ReferralTransaction,
  LeaderboardEntry,
  UserStats,
  CreateReferralRequest,
} from '../utils/types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { generateReferralCode } from '../utils/helpers';

export class ReferralService {
  // Generate unique referral code
  async generateUniqueCode(walletAddress: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateReferralCode(walletAddress, attempts);

      // Check if code exists
      const result = await query(
        'SELECT id FROM users WHERE referral_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique referral code');
  }

  // Validate referral code
  async validateCode(code: string): Promise<{ valid: boolean; referrer_wallet?: string }> {
    // Check cache first
    const cached = await getCached<{ valid: boolean; referrer_wallet?: string }>(
      cacheKeys.referralCode(code)
    );
    if (cached) return cached;

    const result = await query<{ wallet_address: string }>(
      'SELECT wallet_address FROM users WHERE referral_code = $1',
      [code]
    );

    const response = {
      valid: result.rows.length > 0,
      referrer_wallet: result.rows[0]?.wallet_address,
    };

    // Cache for 24 hours
    await setCached(cacheKeys.referralCode(code), response, CACHE_TTL.REFERRAL_CODE);

    return response;
  }

  // Create referral relationship
  async createReferral(data: CreateReferralRequest): Promise<Referral> {
    const { referrer_wallet, referee_wallet, referral_code } = data;

    // Validate that users can't refer themselves
    if (referrer_wallet === referee_wallet) {
      throw new ValidationError('Cannot refer yourself');
    }

    // Validate referral code
    const validation = await this.validateCode(referral_code);
    if (!validation.valid || validation.referrer_wallet !== referrer_wallet) {
      throw new ValidationError('Invalid referral code');
    }

    // Get user IDs
    const referrerResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [referrer_wallet]
    );
    const refereeResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [referee_wallet]
    );

    if (referrerResult.rows.length === 0) {
      throw new NotFoundError('Referrer user');
    }
    if (refereeResult.rows.length === 0) {
      throw new NotFoundError('Referee user');
    }

    const referrer_id = referrerResult.rows[0].id;
    const referee_id = refereeResult.rows[0].id;

    // Check if referral already exists
    const existing = await query(
      'SELECT id FROM referrals WHERE referrer_id = $1 AND referee_id = $2',
      [referrer_id, referee_id]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('Referral relationship already exists');
    }

    // Create referral
    const result = await query<Referral>(
      `INSERT INTO referrals (referrer_id, referee_id, referral_code)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [referrer_id, referee_id, referral_code]
    );

    // Update referrer's total_referrals count
    await query(
      'UPDATE users SET total_referrals = total_referrals + 1 WHERE id = $1',
      [referrer_id]
    );

    // Invalidate caches
    await deleteCached(cacheKeys.userStats(referrer_wallet));
    await deleteCached(cacheKeys.leaderboard());

    return result.rows[0];
  }

  // Record referral transaction and calculate earnings
  async recordTransaction(
    transactionId: string,
    transactionSignature: string,
    platformFee: number
  ): Promise<ReferralTransaction | null> {
    // Get transaction details
    const txResult = await query<{
      id: string;
      user_id: string;
      referral_id: string | null;
    }>(
      'SELECT id, user_id, referral_id FROM user_transactions WHERE id = $1',
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      throw new NotFoundError('Transaction');
    }

    const transaction = txResult.rows[0];

    // If no referral, return null
    if (!transaction.referral_id) {
      return null;
    }

    // Calculate referral amount (10% of platform fee)
    const referralAmount = platformFee * 0.10;

    // Record referral transaction
    return await withTransaction(async (client) => {
      // Insert referral transaction
      const refTxResult = await client.query<ReferralTransaction>(
        `INSERT INTO referral_transactions
         (referral_id, user_transaction_id, transaction_signature, platform_fee, referral_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [transaction.referral_id, transactionId, transactionSignature, platformFee, referralAmount]
      );

      const refTx = refTxResult.rows[0];

      // Update referral totals
      await client.query(
        `UPDATE referrals
         SET total_earnings = total_earnings + $1,
             total_transactions = total_transactions + 1
         WHERE id = $2`,
        [referralAmount, transaction.referral_id]
      );

      // Update referrer user totals
      await client.query(
        `UPDATE users
         SET total_referral_earnings = total_referral_earnings + $1
         WHERE id = (SELECT referrer_id FROM referrals WHERE id = $2)`,
        [referralAmount, transaction.referral_id]
      );

      return refTx;
    });
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    // Check cache first
    const cached = await getCached<LeaderboardEntry[]>(cacheKeys.leaderboard());
    if (cached) return cached.slice(0, limit);

    const result = await query<LeaderboardEntry>(
      `SELECT * FROM referral_leaderboard ORDER BY rank LIMIT $1`,
      [limit]
    );

    const leaderboard = result.rows;

    // Cache for 5 minutes
    await setCached(cacheKeys.leaderboard(), leaderboard, CACHE_TTL.LEADERBOARD);

    return leaderboard;
  }

  // Get user referral stats
  async getUserStats(walletAddress: string): Promise<UserStats> {
    // Check cache first
    const cached = await getCached<UserStats>(cacheKeys.userStats(walletAddress));
    if (cached) return cached;

    // Get user
    const userResult = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    // Get active referrals (users who used this user's referral code and made transactions)
    const activeResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT ut.user_id) as count
       FROM user_transactions ut
       WHERE ut.referral_code = $1
         AND ut.status = 'success'`,
      [user.referral_code]
    );

    const activeReferrals = parseInt(activeResult.rows[0]?.count || '0');

    // Calculate conversion rate (active / total)
    const conversionRate = user.total_referrals > 0
      ? (activeReferrals / user.total_referrals) * 100
      : 0;

    // Get recent earnings (last 10) - simplified for now
    // TODO: Implement when referral_transactions table is populated
    const recent_earnings: any[] = [];

    // Get referrals list - users who used this referral code
    const referralsResult = await query<{
      referee_wallet: string;
      total_earnings: number;
      total_transactions: number;
      joined_at: Date;
    }>(
      `SELECT
         u.wallet_address as referee_wallet,
         0 as total_earnings,
         COUNT(ut.id) as total_transactions,
         MIN(ut.created_at) as joined_at
       FROM user_transactions ut
       JOIN users u ON u.id = ut.user_id
       WHERE ut.referral_code = $1
         AND ut.status = 'success'
       GROUP BY u.wallet_address
       ORDER BY MIN(ut.created_at) DESC`,
      [user.referral_code]
    );

    const stats: UserStats = {
      wallet_address: user.wallet_address,
      tier: user.tier,
      referral_code: user.referral_code,
      total_referral_earnings: parseFloat(user.total_referral_earnings as any) || 0,
      total_referrals: user.total_referrals || 0,
      active_referrals: activeReferrals,
      conversion_rate: conversionRate,
      recent_earnings: recent_earnings,
      referrals: referralsResult.rows.map(r => ({
        ...r,
        total_earnings: parseFloat(r.total_earnings as any) || 0,
      })),
    };

    // Cache for 2 minutes
    await setCached(cacheKeys.userStats(walletAddress), stats, CACHE_TTL.USER_STATS);

    return stats;
  }
}

export default new ReferralService();
