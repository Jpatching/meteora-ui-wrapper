-- Migration 004: Token Creation Timestamps Table
-- Store actual token mint creation timestamps from Solana blockchain
-- This prevents repeated RPC calls by caching the data

CREATE TABLE IF NOT EXISTS token_creation_timestamps (
  mint_address VARCHAR(44) PRIMARY KEY,
  creation_timestamp BIGINT NOT NULL, -- Unix timestamp (seconds since epoch)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  fetch_count INTEGER NOT NULL DEFAULT 1 -- Track how many times we've fetched this
);

-- Index for fast lookups by timestamp
CREATE INDEX IF NOT EXISTS idx_token_creation_timestamp ON token_creation_timestamps(creation_timestamp DESC);

-- Index for finding stale entries that need refreshing (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_token_updated_at ON token_creation_timestamps(updated_at);

COMMENT ON TABLE token_creation_timestamps IS 'Caches token mint creation timestamps from Solana blockchain to avoid repeated RPC calls';
COMMENT ON COLUMN token_creation_timestamps.mint_address IS 'Solana token mint address (public key)';
COMMENT ON COLUMN token_creation_timestamps.creation_timestamp IS 'Unix timestamp when token was minted on Solana (from earliest transaction)';
COMMENT ON COLUMN token_creation_timestamps.fetch_count IS 'Number of times this timestamp has been requested (helps identify popular tokens)';
