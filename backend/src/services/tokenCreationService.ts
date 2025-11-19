/**
 * Token Creation Timestamp Service
 * Fetches actual token mint creation timestamps from Solana blockchain
 * and caches them in PostgreSQL + Redis
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { db } from '../config/database';
import { redis } from '../config/redis';

const REDIS_KEY_PREFIX = 'token:creation:';
const REDIS_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get token creation timestamp for a single token
 * Priority: Redis cache > PostgreSQL > Blockchain
 */
export async function getTokenCreationTimestamp(
  mintAddress: string,
  rpcUrl?: string
): Promise<number | null> {
  try {
    // 1. Check Redis cache first (fastest)
    const redisKey = `${REDIS_KEY_PREFIX}${mintAddress}`;
    const cachedTimestamp = await redis.get(redisKey);

    if (cachedTimestamp) {
      console.log(`✅ Token creation timestamp from Redis: ${mintAddress}`);
      return parseInt(cachedTimestamp);
    }

    // 2. Check PostgreSQL
    const dbResult = await db.query(
      'SELECT creation_timestamp, fetch_count FROM token_creation_timestamps WHERE mint_address = $1',
      [mintAddress]
    );

    if (dbResult.rows.length > 0) {
      const timestamp = parseInt(dbResult.rows[0].creation_timestamp);

      // Update fetch_count and cache in Redis
      await db.query(
        'UPDATE token_creation_timestamps SET fetch_count = fetch_count + 1, updated_at = NOW() WHERE mint_address = $1',
        [mintAddress]
      );
      await redis.setex(redisKey, REDIS_TTL, timestamp.toString());

      console.log(`✅ Token creation timestamp from PostgreSQL: ${mintAddress}`);
      return timestamp;
    }

    // 3. Fetch from Solana blockchain (slowest)
    console.log(`⏳ Fetching token creation timestamp from blockchain: ${mintAddress}`);
    const timestamp = await fetchTokenCreationFromBlockchain(mintAddress, rpcUrl);

    if (timestamp) {
      // Store in PostgreSQL
      await db.query(
        `INSERT INTO token_creation_timestamps (mint_address, creation_timestamp, fetch_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (mint_address)
         DO UPDATE SET creation_timestamp = $2, updated_at = NOW(), fetch_count = token_creation_timestamps.fetch_count + 1`,
        [mintAddress, timestamp]
      );

      // Cache in Redis
      await redis.setex(redisKey, REDIS_TTL, timestamp.toString());

      console.log(`✅ Token creation timestamp fetched and cached: ${mintAddress}`);
    }

    return timestamp;
  } catch (error) {
    console.error(`❌ Error getting token creation timestamp for ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Get token creation timestamps for multiple tokens (batch)
 * Returns a Map of mintAddress => timestamp
 */
export async function getBatchTokenCreationTimestamps(
  mintAddresses: string[],
  rpcUrl?: string
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();

  // 1. Check Redis for all addresses
  const redisKeys = mintAddresses.map(addr => `${REDIS_KEY_PREFIX}${addr}`);
  const redisValues = await redis.mget(...redisKeys);

  const notInRedis: string[] = [];

  mintAddresses.forEach((addr, index) => {
    if (redisValues[index]) {
      results.set(addr, parseInt(redisValues[index]));
    } else {
      notInRedis.push(addr);
    }
  });

  if (notInRedis.length === 0) {
    console.log(`✅ All ${mintAddresses.length} token timestamps from Redis cache`);
    return results;
  }

  // 2. Check PostgreSQL for remaining addresses
  const dbResult = await db.query(
    'SELECT mint_address, creation_timestamp FROM token_creation_timestamps WHERE mint_address = ANY($1)',
    [notInRedis]
  );

  const notInDb: string[] = [];
  const foundInDb = new Set<string>();

  dbResult.rows.forEach(row => {
    const timestamp = parseInt(row.creation_timestamp);
    results.set(row.mint_address, timestamp);
    foundInDb.add(row.mint_address);

    // Cache in Redis
    redis.setex(`${REDIS_KEY_PREFIX}${row.mint_address}`, REDIS_TTL, timestamp.toString());
  });

  // Update fetch counts for DB hits
  if (foundInDb.size > 0) {
    await db.query(
      'UPDATE token_creation_timestamps SET fetch_count = fetch_count + 1, updated_at = NOW() WHERE mint_address = ANY($1)',
      [Array.from(foundInDb)]
    );
  }

  notInRedis.forEach(addr => {
    if (!foundInDb.has(addr)) {
      notInDb.push(addr);
    }
  });

  if (notInDb.length === 0) {
    console.log(`✅ Batch token timestamps: ${results.size} from cache, 0 from blockchain`);
    return results;
  }

  // 3. Fetch from blockchain for remaining addresses (in parallel, but rate-limited)
  console.log(`⏳ Fetching ${notInDb.length} token timestamps from blockchain...`);

  const blockchainPromises = notInDb.map(async (addr) => {
    const timestamp = await fetchTokenCreationFromBlockchain(addr, rpcUrl);
    if (timestamp) {
      results.set(addr, timestamp);

      // Store in PostgreSQL
      await db.query(
        `INSERT INTO token_creation_timestamps (mint_address, creation_timestamp, fetch_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (mint_address)
         DO UPDATE SET creation_timestamp = $2, updated_at = NOW(), fetch_count = token_creation_timestamps.fetch_count + 1`,
        [addr, timestamp]
      );

      // Cache in Redis
      await redis.setex(`${REDIS_KEY_PREFIX}${addr}`, REDIS_TTL, timestamp.toString());
    } else {
      results.set(addr, null);
    }
  });

  // Wait for all blockchain fetches to complete
  await Promise.allSettled(blockchainPromises);

  console.log(`✅ Batch complete: ${results.size} total, ${notInDb.length} from blockchain`);
  return results;
}

/**
 * Fetch token creation timestamp from Solana blockchain
 * Uses getSignaturesForAddress with pagination to find the earliest transaction
 */
async function fetchTokenCreationFromBlockchain(
  mintAddress: string,
  rpcUrl?: string
): Promise<number | null> {
  try {
    const connection = new Connection(
      rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    const mintPubkey = new PublicKey(mintAddress);

    let allSignatures: any[] = [];
    let before: string | undefined = undefined;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Safety limit to avoid infinite loops

    // Fetch all signatures with pagination
    while (iterations < MAX_ITERATIONS) {
      const signatures = await connection.getSignaturesForAddress(mintPubkey, {
        limit: 1000,
        before: before,
      });

      if (signatures.length === 0) break;

      allSignatures = [...allSignatures, ...signatures];

      // Use the last signature as pagination cursor
      before = signatures[signatures.length - 1].signature;

      // Stop if we got less than 1000 (reached the end)
      if (signatures.length < 1000) break;

      iterations++;
    }

    if (allSignatures.length === 0) {
      console.warn(`⚠️ No signatures found for token: ${mintAddress}`);
      return null;
    }

    // Sort chronologically and get the earliest with a blockTime
    const validSignatures = allSignatures.filter(sig => sig.blockTime !== null && sig.blockTime !== undefined);

    if (validSignatures.length === 0) {
      console.warn(`⚠️ No valid blockTime found for token: ${mintAddress}`);
      return null;
    }

    const oldestSignature = validSignatures.sort((a, b) =>
      (a.blockTime || 0) - (b.blockTime || 0)
    )[0];

    return oldestSignature.blockTime as number;
  } catch (error) {
    console.error(`❌ Error fetching from blockchain for ${mintAddress}:`, error);
    return null;
  }
}
