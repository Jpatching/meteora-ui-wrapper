/**
 * MetaTools Vault SDK
 * TypeScript wrapper for the Steel smart contract
 * Manages session wallets and LP positions
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID (update after deployment)
export const VAULT_PROGRAM_ID = new PublicKey('11111111111111111111111111111111'); // Placeholder

// Protocol types matching the Rust enum
export enum Protocol {
  DLMM = 0,
  DAMMv2 = 1,
  DAMMv1 = 2,
  DBC = 3,
}

// Strategy types
export enum Strategy {
  Balanced = 0,
  OneSided = 1,
  RangeOrder = 2,
  Custom = 3,
}

/**
 * Derive PDA for GlobalConfig
 */
export function getGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global_config')],
    VAULT_PROGRAM_ID
  );
}

/**
 * Derive PDA for VaultMetadata
 */
export function getVaultMetadataPDA(sessionWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_metadata'), sessionWallet.toBuffer()],
    VAULT_PROGRAM_ID
  );
}

/**
 * Derive PDA for Position
 */
export function getPositionPDA(sessionWallet: PublicKey, positionId: bigint): [PublicKey, number] {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(positionId);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('position'),
      sessionWallet.toBuffer(),
      buffer,
    ],
    VAULT_PROGRAM_ID
  );
}

/**
 * Generate a new session wallet keypair
 * User should export this to Phantom wallet
 */
export function generateSessionWallet(): Keypair {
  return Keypair.generate();
}

/**
 * Create vault instruction
 * Requires signatures from both main wallet and session wallet
 */
export function createVaultInstruction(
  mainWallet: PublicKey,
  sessionWallet: PublicKey,
  referrer: PublicKey
): TransactionInstruction {
  const [vaultPDA] = getVaultMetadataPDA(sessionWallet);

  // Instruction data: discriminator (8 bytes) + referrer (32 bytes)
  const data = Buffer.alloc(40);
  // TODO: Add proper discriminator when we have the IDL

  referrer.toBuffer().copy(data, 8);

  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: mainWallet, isSigner: true, isWritable: true },
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Open position instruction
 */
export function openPositionInstruction(
  sessionWallet: PublicKey,
  pool: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  initialTVL: bigint,
  protocol: Protocol,
  strategy: Strategy
): TransactionInstruction {
  const [vaultPDA] = getVaultMetadataPDA(sessionWallet);
  const [configPDA] = getGlobalConfigPDA();

  // Instruction data structure
  const data = Buffer.alloc(100); // Adjust size based on instruction
  // TODO: Add proper encoding when we have the IDL

  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Close position instruction
 */
export function closePositionInstruction(
  sessionWallet: PublicKey,
  positionId: bigint
): TransactionInstruction {
  const [vaultPDA] = getVaultMetadataPDA(sessionWallet);
  const [positionPDA] = getPositionPDA(sessionWallet, positionId);

  const data = Buffer.alloc(16);
  // TODO: Add proper encoding
  data.writeBigUInt64LE(positionId, 8);

  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: positionPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Update position TVL instruction
 */
export function updatePositionTVLInstruction(
  sessionWallet: PublicKey,
  positionId: bigint,
  newTVL: bigint,
  feesClaimed: bigint,
  totalCompounded: bigint
): TransactionInstruction {
  const [positionPDA] = getPositionPDA(sessionWallet, positionId);

  const data = Buffer.alloc(40);
  // TODO: Add proper encoding

  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: sessionWallet, isSigner: true, isWritable: true },
      { pubkey: positionPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * High-level API for creating a vault
 */
export async function createVault(
  connection: Connection,
  mainWallet: WalletContextState,
  sessionWalletKeypair: Keypair,
  referrer?: PublicKey
): Promise<{ signature: string; sessionWallet: PublicKey; vaultPDA: PublicKey }> {
  if (!mainWallet.publicKey || !mainWallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const referrerPubkey = referrer || mainWallet.publicKey; // Use main wallet as referrer if none provided

  const instruction = createVaultInstruction(
    mainWallet.publicKey,
    sessionWalletKeypair.publicKey,
    referrerPubkey
  );

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = mainWallet.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // Sign with session wallet first
  transaction.partialSign(sessionWalletKeypair);

  // Then sign with main wallet
  const signed = await mainWallet.signTransaction(transaction);

  // Send transaction
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature);

  const [vaultPDA] = getVaultMetadataPDA(sessionWalletKeypair.publicKey);

  return {
    signature,
    sessionWallet: sessionWalletKeypair.publicKey,
    vaultPDA,
  };
}

/**
 * Fetch vault metadata from chain
 */
export async function fetchVaultMetadata(
  connection: Connection,
  sessionWallet: PublicKey
): Promise<any | null> {
  const [vaultPDA] = getVaultMetadataPDA(sessionWallet);

  try {
    const accountInfo = await connection.getAccountInfo(vaultPDA);
    if (!accountInfo) return null;

    // TODO: Deserialize account data using the IDL
    // For now, return raw data
    return {
      address: vaultPDA.toBase58(),
      data: accountInfo.data,
    };
  } catch (error) {
    console.error('Error fetching vault metadata:', error);
    return null;
  }
}

/**
 * Fetch position from chain
 */
export async function fetchPosition(
  connection: Connection,
  sessionWallet: PublicKey,
  positionId: bigint
): Promise<any | null> {
  const [positionPDA] = getPositionPDA(sessionWallet, positionId);

  try {
    const accountInfo = await connection.getAccountInfo(positionPDA);
    if (!accountInfo) return null;

    // TODO: Deserialize account data
    return {
      address: positionPDA.toBase58(),
      positionId,
      data: accountInfo.data,
    };
  } catch (error) {
    console.error('Error fetching position:', error);
    return null;
  }
}
