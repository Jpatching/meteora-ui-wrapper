-- Pools table to store ALL Meteora pools
-- This allows fast searching by token CA and other filters

CREATE TABLE IF NOT EXISTS pools (
  id SERIAL PRIMARY KEY,

  -- Pool identification
  pool_address VARCHAR(64) NOT NULL UNIQUE,
  pool_name VARCHAR(255) NOT NULL,
  protocol VARCHAR(20) NOT NULL, -- 'dlmm', 'damm-v1', 'damm-v2', 'dbc', 'alpha'

  -- Token information
  token_a_mint VARCHAR(64) NOT NULL,
  token_b_mint VARCHAR(64) NOT NULL,
  token_a_symbol VARCHAR(50),
  token_b_symbol VARCHAR(50),

  -- Pool metrics
  tvl DECIMAL(20, 2) DEFAULT 0,
  volume_24h DECIMAL(20, 2) DEFAULT 0,
  fees_24h DECIMAL(20, 2) DEFAULT 0,
  apr DECIMAL(15, 4) DEFAULT 0, -- Increased to handle very high APR values

  -- Protocol-specific data (stored as JSONB for flexibility)
  metadata JSONB NOT NULL DEFAULT '{}',
  -- For DLMM: { "bin_step": 10, "base_fee_percentage": "0.03" }
  -- For DAMM: { "base_fee": 0.25, "pool_type": 0 }

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_pools_token_a ON pools(token_a_mint);
CREATE INDEX idx_pools_token_b ON pools(token_b_mint);
CREATE INDEX idx_pools_protocol ON pools(protocol);
CREATE INDEX idx_pools_tvl ON pools(tvl DESC);
CREATE INDEX idx_pools_volume ON pools(volume_24h DESC);
CREATE INDEX idx_pools_updated ON pools(updated_at DESC);

-- Composite index for token pair searches
CREATE INDEX idx_pools_token_pair ON pools(token_a_mint, token_b_mint);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pools_updated_at
  BEFORE UPDATE ON pools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE pools IS 'Stores all Meteora protocol pools for fast searching';
COMMENT ON COLUMN pools.metadata IS 'Protocol-specific data stored as JSON (bin_step, fees, etc)';
COMMENT ON COLUMN pools.last_synced_at IS 'Last time this pool was synced from Meteora APIs';
