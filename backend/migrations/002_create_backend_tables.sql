-- Meteora Backend Database Schema
-- PostgreSQL 16+

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  referral_code VARCHAR(8) UNIQUE NOT NULL,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'bronze', 'silver', 'gold', 'platinum')),

  -- Stats
  total_transactions INTEGER DEFAULT 0,
  total_volume_usd DECIMAL(20, 2) DEFAULT 0,
  total_fees_paid DECIMAL(20, 8) DEFAULT 0,

  -- Referral earnings
  total_referral_earnings DECIMAL(20, 8) DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT valid_wallet CHECK (LENGTH(wallet_address) BETWEEN 32 AND 44),
  CONSTRAINT valid_referral_code CHECK (LENGTH(referral_code) = 8)
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- Referrals table (tracks who referred whom)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Referral data
  referral_code VARCHAR(8) NOT NULL,

  -- Earnings tracking
  total_earned DECIMAL(20, 8) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_transaction_at TIMESTAMP,

  UNIQUE(referrer_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Referral transactions (individual earning events)
CREATE TABLE IF NOT EXISTS referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  user_transaction_id UUID,

  -- Transaction details
  transaction_signature VARCHAR(88) UNIQUE NOT NULL,
  protocol VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,

  -- Financial data
  platform_fee_lamports BIGINT NOT NULL,
  referral_amount_lamports BIGINT NOT NULL,
  buyback_amount_lamports BIGINT NOT NULL,
  treasury_amount_lamports BIGINT NOT NULL,

  -- Metadata
  pool_address VARCHAR(44),
  token_address VARCHAR(44),
  network VARCHAR(20) DEFAULT 'mainnet-beta',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_txs_referral ON referral_transactions(referral_id);
CREATE INDEX IF NOT EXISTS idx_ref_txs_signature ON referral_transactions(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_ref_txs_created ON referral_transactions(created_at DESC);

-- User transactions (all platform usage)
CREATE TABLE IF NOT EXISTS user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  signature VARCHAR(88) UNIQUE NOT NULL,
  protocol VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),

  -- Financial data
  platform_fee_lamports BIGINT,
  used_referral BOOLEAN DEFAULT FALSE,
  referral_code VARCHAR(8),

  -- Metadata
  pool_address VARCHAR(44),
  token_address VARCHAR(44),
  network VARCHAR(20) DEFAULT 'mainnet-beta',
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_txs_user ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_txs_signature ON user_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_user_txs_status ON user_transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_txs_created ON user_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_txs_referral ON user_transactions(referral_code) WHERE referral_code IS NOT NULL;

-- Note: Pools table is created in 001_create_pools_table.sql

-- User tier progression history
CREATE TABLE IF NOT EXISTS tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  old_tier VARCHAR(20),
  new_tier VARCHAR(20) NOT NULL,

  -- Qualification metrics
  total_transactions INTEGER NOT NULL,
  total_volume_usd DECIMAL(20, 2) NOT NULL,
  total_referrals INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_user ON tier_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_created ON tier_history(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT
  u.wallet_address,
  u.referral_code,
  u.total_referral_earnings,
  u.total_referrals,
  u.tier,
  COUNT(DISTINCT r.referee_id) as active_referrals,
  SUM(r.transaction_count) as total_transactions
FROM users u
LEFT JOIN referrals r ON u.id = r.referrer_id
GROUP BY u.id
ORDER BY u.total_referral_earnings DESC
LIMIT 100;

CREATE OR REPLACE VIEW platform_stats AS
SELECT
  COUNT(DISTINCT wallet_address) as total_users,
  SUM(total_transactions) as total_transactions,
  SUM(total_volume_usd) as total_volume_usd,
  SUM(total_fees_paid) as total_fees_collected,
  SUM(total_referral_earnings) as total_referral_payouts,
  COUNT(DISTINCT CASE WHEN tier != 'free' THEN id END) as premium_users
FROM users;
