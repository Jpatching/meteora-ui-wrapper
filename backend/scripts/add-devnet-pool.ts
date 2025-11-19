/**
 * Add Devnet Pool - Direct Database Insert
 *
 * Simple script to add devnet pools directly to database without fetching.
 * Usage:
 *   tsx scripts/add-devnet-pool.ts <pool_address> <protocol> <token_a_mint> <token_b_mint> [optional_params]
 *
 * Example:
 *   tsx scripts/add-devnet-pool.ts HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH dlmm \
 *     GvGP66ALRJnN9vxXfJZa5WngyqiR9PjhBD7UtFBwQCNM \
 *     4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
 *     --name "TEST-USDC" --bin-step 100 --active-bin 116
 */

import { db } from '../backend/src/config/database';

interface PoolData {
  address: string;
  protocol: 'dlmm' | 'damm-v2';
  token_a_mint: string;
  token_b_mint: string;
  name?: string;
  token_a_symbol?: string;
  token_b_symbol?: string;
  bin_step?: number;
  active_bin?: number;
  reserve_x?: number;
  reserve_y?: number;
  tvl?: number;
  [key: string]: any;
}

async function addDevnetPool(poolData: PoolData): Promise<void> {
  console.log(`➕ Adding devnet pool to database...`);
  console.log(`   Address: ${poolData.address}`);
  console.log(`   Protocol: ${poolData.protocol}`);
  console.log(`   Token A: ${poolData.token_a_mint} (${poolData.token_a_symbol || 'TOKEN-A'})`);
  console.log(`   Token B: ${poolData.token_b_mint} (${poolData.token_b_symbol || 'TOKEN-B'})`);

  const name = poolData.name || `${poolData.token_a_symbol || 'TOKEN-A'}-${poolData.token_b_symbol || 'TOKEN-B'}`;
  const token_a_symbol = poolData.token_a_symbol || 'TOKEN-A';
  const token_b_symbol = poolData.token_b_symbol || 'TOKEN-B';

  // Build metadata based on protocol
  const metadata: any = {
    network: 'devnet',
  };

  if (poolData.protocol === 'dlmm') {
    metadata.bin_step = poolData.bin_step || 100;
    metadata.active_bin = poolData.active_bin;
    metadata.reserve_x = poolData.reserve_x || 0;
    metadata.reserve_y = poolData.reserve_y || 0;
  } else if (poolData.protocol === 'damm-v2') {
    metadata.pool_type = poolData.pool_type || 0;
  }

  try {
    // Ensure network column exists (migration)
    await db.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'mainnet-beta'`);
  } catch (e) {
    // Column already exists
  }

  // Insert into database
  await db.query(
    `INSERT INTO pools (
      pool_address, pool_name, protocol,
      token_a_mint, token_b_mint,
      token_a_symbol, token_b_symbol,
      tvl, volume_24h, fees_24h, apr,
      metadata, network, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (pool_address, network)
    DO UPDATE SET
      pool_name = EXCLUDED.pool_name,
      token_a_symbol = EXCLUDED.token_a_symbol,
      token_b_symbol = EXCLUDED.token_b_symbol,
      tvl = EXCLUDED.tvl,
      metadata = EXCLUDED.metadata,
      last_synced_at = NOW()`,
    [
      poolData.address,
      name,
      poolData.protocol,
      poolData.token_a_mint,
      poolData.token_b_mint,
      token_a_symbol,
      token_b_symbol,
      poolData.tvl || 0,
      0, // volume_24h
      0, // fees_24h
      0, // apr
      JSON.stringify(metadata),
      'devnet',
    ]
  );

  console.log(`✅ Pool added successfully to database!`);
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('❌ Usage: tsx scripts/add-devnet-pool.ts <pool_address> <protocol> <token_a_mint> <token_b_mint> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --name <name>              Pool name (default: TOKEN-A-TOKEN-B)');
    console.error('  --token-a-symbol <symbol>  Token A symbol (default: TOKEN-A)');
    console.error('  --token-b-symbol <symbol>  Token B symbol (default: TOKEN-B)');
    console.error('  --bin-step <number>        DLMM bin step (default: 100)');
    console.error('  --active-bin <number>      DLMM active bin');
    console.error('  --reserve-x <number>       DLMM reserve X');
    console.error('  --reserve-y <number>       DLMM reserve Y');
    console.error('  --tvl <number>             Total value locked');
    console.error('');
    console.error('Example:');
    console.error('  tsx scripts/add-devnet-pool.ts HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH dlmm \\');
    console.error('    GvGP66ALRJnN9vxXfJZa5WngyqiR9PjhBD7UtFBwQCNM \\');
    console.error('    4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \\');
    console.error('    --name "TEST-USDC" --token-a-symbol "TEST" --token-b-symbol "USDC" --bin-step 100 --active-bin 116');
    process.exit(1);
  }

  const poolData: PoolData = {
    address: args[0],
    protocol: args[1] as 'dlmm' | 'damm-v2',
    token_a_mint: args[2],
    token_b_mint: args[3],
  };

  // Parse optional arguments
  for (let i = 4; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      poolData.name = args[i + 1];
      i++;
    } else if (args[i] === '--token-a-symbol' && args[i + 1]) {
      poolData.token_a_symbol = args[i + 1];
      i++;
    } else if (args[i] === '--token-b-symbol' && args[i + 1]) {
      poolData.token_b_symbol = args[i + 1];
      i++;
    } else if (args[i] === '--bin-step' && args[i + 1]) {
      poolData.bin_step = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--active-bin' && args[i + 1]) {
      poolData.active_bin = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--reserve-x' && args[i + 1]) {
      poolData.reserve_x = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--reserve-y' && args[i + 1]) {
      poolData.reserve_y = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--tvl' && args[i + 1]) {
      poolData.tvl = parseFloat(args[i + 1]);
      i++;
    }
  }

  // Validate protocol
  if (poolData.protocol !== 'dlmm' && poolData.protocol !== 'damm-v2') {
    console.error('❌ Invalid protocol. Must be "dlmm" or "damm-v2"');
    process.exit(1);
  }

  try {
    await addDevnetPool(poolData);
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding pool:', error);
    await db.end();
    process.exit(1);
  }
}

main();
