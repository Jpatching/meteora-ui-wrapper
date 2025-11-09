-- Add network column to pools table for multi-network support
-- This allows storing both mainnet and devnet pools in the same database

-- Add network column with default value
ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta';

-- Update existing rows to have mainnet-beta as network
UPDATE pools SET network = 'mainnet-beta' WHERE network IS NULL;

-- Make network NOT NULL after setting default values
ALTER TABLE pools ALTER COLUMN network SET NOT NULL;

-- Drop old unique constraint on pool_address only
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_pool_address_key;

-- Add composite unique constraint on (pool_address, network)
-- This allows the same pool address on different networks
ALTER TABLE pools ADD CONSTRAINT pools_address_network_unique UNIQUE (pool_address, network);

-- Add index for network filtering
CREATE INDEX IF NOT EXISTS idx_pools_network ON pools(network);

-- Add composite index for protocol + network queries
CREATE INDEX IF NOT EXISTS idx_pools_protocol_network ON pools(protocol, network);

-- Add composite index for TVL sorting within a network
CREATE INDEX IF NOT EXISTS idx_pools_network_tvl ON pools(network, tvl DESC);

-- Comment
COMMENT ON COLUMN pools.network IS 'Solana network: mainnet-beta, devnet, or testnet';
