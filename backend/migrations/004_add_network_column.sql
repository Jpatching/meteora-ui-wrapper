-- Migration 004: Add network column and update unique constraint
-- This allows storing pools from both mainnet and devnet

-- Add network column (default to mainnet-beta for existing rows)
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta';

-- Drop the old unique constraint on pool_address alone
ALTER TABLE pools
DROP CONSTRAINT IF EXISTS pools_pool_address_key;

-- Add new unique constraint on (pool_address, network)
-- This allows same pool address on different networks
ALTER TABLE pools
ADD CONSTRAINT pools_pool_address_network_unique UNIQUE (pool_address, network);

-- Add index on network for faster queries
CREATE INDEX IF NOT EXISTS idx_pools_network ON pools(network);

COMMENT ON COLUMN pools.network IS 'Solana network: mainnet-beta or devnet';
