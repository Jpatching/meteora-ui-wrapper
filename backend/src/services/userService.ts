import { query } from '../config/database';
import { User, CreateUserRequest, RecordTransactionRequest, UserTransaction } from '../utils/types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { isValidSolanaAddress, calculateTier } from '../utils/helpers';
import referralService from './referralService';
import { deleteCached, cacheKeys } from '../config/redis';

export class UserService {
  // Create or get user
  async createUser(data: CreateUserRequest): Promise<User> {
    const { wallet_address, referral_code } = data;

    // Validate wallet address
    if (!isValidSolanaAddress(wallet_address)) {
      throw new ValidationError('Invalid Solana wallet address');
    }

    // Check if user already exists
    const existing = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet_address]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Generate unique referral code for this user
    const userReferralCode = await referralService.generateUniqueCode(wallet_address);

    // Create user
    const result = await query<User>(
      `INSERT INTO users (wallet_address, referral_code, tier)
       VALUES ($1, $2, 'free')
       RETURNING *`,
      [wallet_address, userReferralCode]
    );

    const user = result.rows[0];

    // If user was referred by someone, create referral relationship
    if (referral_code) {
      try {
        const validation = await referralService.validateCode(referral_code);
        if (validation.valid && validation.referrer_wallet) {
          await referralService.createReferral({
            referrer_wallet: validation.referrer_wallet,
            referee_wallet: wallet_address,
            referral_code,
          });
        }
      } catch (error) {
        console.error('Failed to create referral relationship:', error);
        // Don't fail user creation if referral fails
      }
    }

    return user;
  }

  // Get user by wallet address
  async getUser(walletAddress: string): Promise<User> {
    const result = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0];
  }

  // Update user tier based on volume
  async updateTier(userId: string, newVolume: number): Promise<void> {
    const newTier = calculateTier(newVolume);

    // Get current user
    const userResult = await query<User>(
      'SELECT tier FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const oldTier = userResult.rows[0].tier;

    // Only update if tier changed
    if (oldTier !== newTier) {
      // Update user tier
      await query(
        'UPDATE users SET tier = $1 WHERE id = $2',
        [newTier, userId]
      );

      // Record tier history
      await query(
        `INSERT INTO tier_history (user_id, old_tier, new_tier, reason)
         VALUES ($1, $2, $3, $4)`,
        [userId, oldTier, newTier, `Volume reached threshold for ${newTier} tier`]
      );

      console.log(`✨ User ${userId} upgraded from ${oldTier} to ${newTier}`);
    }
  }

  // Record user transaction
  async recordTransaction(data: RecordTransactionRequest): Promise<UserTransaction> {
    const {
      user_wallet,
      transaction_signature,
      protocol,
      action_type,
      pool_address,
      amount_in,
      amount_out,
      token_in,
      token_out,
      platform_fee,
    } = data;

    // Get user
    const userResult = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [user_wallet]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = userResult.rows[0];

    // Check if user has an active referral (they were referred)
    const referralResult = await query<{ id: string }>(
      'SELECT id FROM referrals WHERE referee_id = $1',
      [user.id]
    );

    const referral_id = referralResult.rows[0]?.id || null;

    // Insert transaction
    const txResult = await query<UserTransaction>(
      `INSERT INTO user_transactions
       (user_id, transaction_signature, protocol, action_type, pool_address,
        amount_in, amount_out, token_in, token_out, platform_fee, referral_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed')
       RETURNING *`,
      [
        user.id,
        transaction_signature,
        protocol,
        action_type,
        pool_address,
        amount_in,
        amount_out,
        token_in,
        token_out,
        platform_fee,
        referral_id,
      ]
    );

    const transaction = txResult.rows[0];

    // Update user stats
    const newVolume = user.total_volume + amount_in;
    await query(
      `UPDATE users
       SET total_volume = $1,
           total_transactions = total_transactions + 1
       WHERE id = $2`,
      [newVolume, user.id]
    );

    // Check tier upgrade
    await this.updateTier(user.id, newVolume);

    // Process referral earnings if applicable
    if (referral_id) {
      await referralService.recordTransaction(transaction.id, transaction_signature, platform_fee);
    }

    // Invalidate caches
    await deleteCached(cacheKeys.userStats(user_wallet));
    if (referral_id) {
      const referrerResult = await query<{ wallet_address: string }>(
        `SELECT u.wallet_address
         FROM users u
         JOIN referrals r ON r.referrer_id = u.id
         WHERE r.id = $1`,
        [referral_id]
      );
      if (referrerResult.rows[0]) {
        await deleteCached(cacheKeys.userStats(referrerResult.rows[0].wallet_address));
      }
      await deleteCached(cacheKeys.leaderboard());
    }

    return transaction;
  }

  // Get user transactions
  async getUserTransactions(
    walletAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserTransaction[]> {
    const result = await query<UserTransaction>(
      `SELECT ut.*
       FROM user_transactions ut
       JOIN users u ON u.id = ut.user_id
       WHERE u.wallet_address = $1
       ORDER BY ut.created_at DESC
       LIMIT $2 OFFSET $3`,
      [walletAddress, limit, offset]
    );

    return result.rows;
  }

  // Get user tier info
  async getUserTier(walletAddress: string): Promise<{
    current_tier: string;
    total_volume: number;
    next_tier?: string;
    volume_needed?: number;
  }> {
    const user = await this.getUser(walletAddress);

    const tiers = [
      { name: 'free', threshold: 0 },
      { name: 'bronze', threshold: 10000 },
      { name: 'silver', threshold: 100000 },
      { name: 'gold', threshold: 500000 },
      { name: 'platinum', threshold: 1000000 },
    ];

    const currentTierIndex = tiers.findIndex(t => t.name === user.tier);
    const nextTier = tiers[currentTierIndex + 1];

    return {
      current_tier: user.tier,
      total_volume: user.total_volume,
      next_tier: nextTier?.name,
      volume_needed: nextTier ? nextTier.threshold - user.total_volume : undefined,
    };
  }
}

export default new UserService();
