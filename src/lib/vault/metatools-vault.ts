/**
 * MetaTools Vault - TypeScript SDK
 * Steel contract integration for fee management on liquidity operations
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';

// Program ID (deployed on devnet)
export const METATOOLS_VAULT_PROGRAM_ID = new PublicKey(
  '64QeAJYw4dRLwCNTHZbYtLMRMv5aksNgbNHNzy4SMZTw'
);

// Instruction discriminators (1-byte enum values)
export enum VaultInstruction {
  InitializeConfig = 0,
  CreateVault = 1,
  CloseVault = 2,
  OpenPosition = 3,
  ClosePosition = 4,
  UpdatePositionTVL = 5,
  UpdateConfig = 6,
}

// Protocol types
export enum Protocol {
  DLMM = 0,
  DAMMv2 = 1,
  DAMMv1 = 2,
  DBC = 3,
  AlphaVault = 4,
}

// Strategy types
export enum Strategy {
  Spot = 0,
  Curve = 1,
  BidAsk = 2,
}

/**
 * Create InitializeConfig instruction
 * Sets up global fee configuration (admin-only, one-time)
 */
export function createInitializeConfigInstruction(
  admin: PublicKey,
  treasury: PublicKey,
  buybackWallet: PublicKey,
  feeBps: number, // e.g., 70 = 0.7%
  referralPct: number, // 10 = 10%
  buybackPct: number, // 45 = 45%
  treasuryPct: number // 45 = 45%
): TransactionInstruction {
  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Build instruction data (73 bytes total)
  const data = Buffer.alloc(73);
  let offset = 0;

  // Discriminator (1 byte)
  data.writeUInt8(VaultInstruction.InitializeConfig, offset);
  offset += 1;

  // Treasury pubkey (32 bytes)
  Buffer.from(treasury.toBytes()).copy(data, offset);
  offset += 32;

  // Buyback wallet pubkey (32 bytes)
  Buffer.from(buybackWallet.toBytes()).copy(data, offset);
  offset += 32;

  // fee_bps (u16, little-endian)
  data.writeUInt16LE(feeBps, offset);
  offset += 2;

  // referral_pct (u8)
  data.writeUInt8(referralPct, offset);
  offset += 1;

  // buyback_pct (u8)
  data.writeUInt8(buybackPct, offset);
  offset += 1;

  // treasury_pct (u8)
  data.writeUInt8(treasuryPct, offset);
  offset += 1;

  // Padding (3 bytes)
  data.fill(0, offset, offset + 3);

  return new TransactionInstruction({
    programId: METATOOLS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create CreateVault instruction
 * Creates a vault metadata account for a session wallet
 */
export function createCreateVaultInstruction(
  sessionWallet: PublicKey,
  referrer: PublicKey
): TransactionInstruction {
  // Derive vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), sessionWallet.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Build instruction data (33 bytes total)
  const data = Buffer.alloc(33);
  let offset = 0;

  // Discriminator (1 byte)
  data.writeUInt8(VaultInstruction.CreateVault, offset);
  offset += 1;

  // Referrer pubkey (32 bytes)
  Buffer.from(referrer.toBytes()).copy(data, offset);

  return new TransactionInstruction({
    programId: METATOOLS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create OpenPosition instruction
 * Opens a new position and charges 0.7% fee atomically
 */
export function createOpenPositionInstruction(
  sessionWallet: PublicKey,
  pool: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  initialTvl: bigint,
  protocol: Protocol,
  strategy: Strategy,
  treasury: PublicKey,
  buybackWallet: PublicKey,
  referrer: PublicKey
): TransactionInstruction {
  // Derive vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), sessionWallet.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Derive position PDA
  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('position'), sessionWallet.toBytes(), pool.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Build instruction data (113 bytes total)
  // 1 (discriminator) + 32 (pool) + 32 (base_mint) + 32 (quote_mint) + 8 (tvl) + 1 (protocol) + 1 (strategy) + 6 (padding)
  const data = Buffer.alloc(113);
  let offset = 0;

  // Discriminator (1 byte)
  data.writeUInt8(VaultInstruction.OpenPosition, offset);
  offset += 1;

  // Pool pubkey (32 bytes)
  Buffer.from(pool.toBytes()).copy(data, offset);
  offset += 32;

  // Base mint pubkey (32 bytes)
  Buffer.from(baseMint.toBytes()).copy(data, offset);
  offset += 32;

  // Quote mint pubkey (32 bytes)
  Buffer.from(quoteMint.toBytes()).copy(data, offset);
  offset += 32;

  // Initial TVL (u64, little-endian)
  data.writeBigUInt64LE(initialTvl, offset);
  offset += 8;

  // Protocol (u8)
  data.writeUInt8(protocol, offset);
  offset += 1;

  // Strategy (u8)
  data.writeUInt8(strategy, offset);
  offset += 1;

  // Padding (6 bytes)
  data.fill(0, offset, offset + 6);

  return new TransactionInstruction({
    programId: METATOOLS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: positionPda, isSigner: false, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: buybackWallet, isSigner: false, isWritable: true },
      { pubkey: referrer, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create ClosePosition instruction
 * Closes a position and cleans up the position account
 */
export function createClosePositionInstruction(
  sessionWallet: PublicKey,
  positionId: bigint
): TransactionInstruction {
  // Derive vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), sessionWallet.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Build instruction data (9 bytes total)
  const data = Buffer.alloc(9);
  let offset = 0;

  // Discriminator (1 byte)
  data.writeUInt8(VaultInstruction.ClosePosition, offset);
  offset += 1;

  // Position ID (u64, little-endian)
  data.writeBigUInt64LE(positionId, offset);

  return new TransactionInstruction({
    programId: METATOOLS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Update position TVL (for analytics tracking)
 */
export function createUpdatePositionTVLInstruction(
  sessionWallet: PublicKey,
  positionId: bigint,
  newTvl: bigint,
  feesClaimed: bigint,
  totalCompounded: bigint
): TransactionInstruction {
  // Derive vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), sessionWallet.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  // Build instruction data (33 bytes total)
  const data = Buffer.alloc(33);
  let offset = 0;

  // Discriminator (1 byte)
  data.writeUInt8(VaultInstruction.UpdatePositionTVL, offset);
  offset += 1;

  // Position ID (u64)
  data.writeBigUInt64LE(positionId, offset);
  offset += 8;

  // New TVL (u64)
  data.writeBigUInt64LE(newTvl, offset);
  offset += 8;

  // Fees claimed (u64)
  data.writeBigUInt64LE(feesClaimed, offset);
  offset += 8;

  // Total compounded (u64)
  data.writeBigUInt64LE(totalCompounded, offset);

  return new TransactionInstruction({
    programId: METATOOLS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Helper: Calculate fee amount (0.7% default)
 */
export function calculateFee(amount: bigint, feeBps: number = 70): bigint {
  return (amount * BigInt(feeBps)) / BigInt(10000);
}

/**
 * Helper: Get or create vault for session wallet
 */
export async function getOrCreateVault(
  connection: Connection,
  sessionWallet: PublicKey,
  referrer: PublicKey = sessionWallet
): Promise<{ exists: boolean; instruction?: TransactionInstruction }> {
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), sessionWallet.toBytes()],
    METATOOLS_VAULT_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(vaultPda);

  if (accountInfo) {
    return { exists: true };
  }

  return {
    exists: false,
    instruction: createCreateVaultInstruction(sessionWallet, referrer),
  };
}

/**
 * Helper: Check if config is initialized
 */
export async function isConfigInitialized(connection: Connection): Promise<boolean> {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    METATOOLS_VAULT_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(configPda);
  return accountInfo !== null;
}
