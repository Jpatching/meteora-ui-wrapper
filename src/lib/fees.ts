/**
 * Platform fee configuration and on-chain fee collection
 * Supports flat SOL fees or token-based fees
 */

import { PublicKey, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

/**
 * Validate if a string is a valid Solana PublicKey
 */
function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fee configuration from environment variables
 */
export interface FeeConfig {
  enabled: boolean;
  feeWallet: PublicKey | null;
  feeLamports: number; // Flat fee in lamports (e.g., 0.1 SOL = 100000000)
  feeTokenMint: PublicKey | null; // Optional: Token mint for token-based fees
  feeTokenAmount: number; // Amount of tokens if using token fees
}

/**
 * Load fee configuration from environment variables
 */
export function loadFeeConfig(): FeeConfig {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_FEES === 'true';

  const feeWalletStr = process.env.NEXT_PUBLIC_FEE_WALLET;
  const feeWallet = feeWalletStr && isValidPublicKey(feeWalletStr)
    ? new PublicKey(feeWalletStr)
    : null;

  const feeLamports = process.env.NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS
    ? parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS)
    : 100_000_000; // Default 0.1 SOL

  const feeTokenMintStr = process.env.NEXT_PUBLIC_FEE_TOKEN_MINT;
  const feeTokenMint = feeTokenMintStr && isValidPublicKey(feeTokenMintStr)
    ? new PublicKey(feeTokenMintStr)
    : null;

  const feeTokenAmount = process.env.NEXT_PUBLIC_FEE_TOKEN_AMOUNT
    ? parseInt(process.env.NEXT_PUBLIC_FEE_TOKEN_AMOUNT)
    : 0;

  return {
    enabled,
    feeWallet,
    feeLamports,
    feeTokenMint,
    feeTokenAmount,
  };
}

/**
 * Create SOL transfer instruction for platform fee
 */
export function createSOLFeeInstruction(
  payer: PublicKey,
  feeWallet: PublicKey,
  feeLamports: number
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: feeWallet,
    lamports: feeLamports,
  });
}

/**
 * Create SPL token transfer instruction for platform fee
 */
export async function createTokenFeeInstruction(
  payer: PublicKey,
  feeWallet: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: number
): Promise<TransactionInstruction> {
  // Get associated token accounts
  const payerTokenAccount = await getAssociatedTokenAddress(tokenMint, payer);
  const feeTokenAccount = await getAssociatedTokenAddress(tokenMint, feeWallet);

  // Create transfer instruction
  return createTransferInstruction(
    payerTokenAccount,
    feeTokenAccount,
    payer,
    tokenAmount,
    [],
    TOKEN_PROGRAM_ID
  );
}

/**
 * Get platform fee instruction based on configuration
 * Returns null if fees are disabled
 */
export async function getPlatformFeeInstruction(
  payer: PublicKey
): Promise<TransactionInstruction | null> {
  const config = loadFeeConfig();

  if (!config.enabled || !config.feeWallet) {
    return null;
  }

  // Use token fee if configured
  if (config.feeTokenMint && config.feeTokenAmount > 0) {
    return await createTokenFeeInstruction(
      payer,
      config.feeWallet,
      config.feeTokenMint,
      config.feeTokenAmount
    );
  }

  // Otherwise use SOL fee
  return createSOLFeeInstruction(payer, config.feeWallet, config.feeLamports);
}

/**
 * Format fee amount for display
 */
export function formatFeeAmount(config: FeeConfig): string {
  if (!config.enabled) return 'No fee';

  if (config.feeTokenMint) {
    return `${config.feeTokenAmount} tokens`;
  }

  const sol = config.feeLamports / LAMPORTS_PER_SOL;
  return `${sol} SOL`;
}

/**
 * Get fee breakdown for display
 */
export function getFeeBreakdown(config: FeeConfig): {
  platformFee: string;
  networkFee: string;
  total: string;
} {
  const platformFee = formatFeeAmount(config);
  const networkFee = '~0.005 SOL'; // Estimated transaction fee

  let total = networkFee;
  if (config.enabled && !config.feeTokenMint) {
    const platformSol = config.feeLamports / LAMPORTS_PER_SOL;
    const totalSol = platformSol + 0.005;
    total = `~${totalSol} SOL`;
  }

  return {
    platformFee,
    networkFee,
    total,
  };
}

/**
 * Validate user has sufficient balance for fee
 */
export async function validateFeeBalance(
  connection: any,
  payer: PublicKey,
  config: FeeConfig
): Promise<{ valid: boolean; message?: string }> {
  if (!config.enabled) {
    return { valid: true };
  }

  try {
    // Check SOL balance
    const balance = await connection.getBalance(payer);
    const requiredLamports = config.feeLamports + 5000; // Fee + network fee buffer

    if (balance < requiredLamports) {
      const required = requiredLamports / LAMPORTS_PER_SOL;
      const current = balance / LAMPORTS_PER_SOL;
      return {
        valid: false,
        message: `Insufficient SOL balance. Required: ${required} SOL, Current: ${current} SOL`,
      };
    }

    // TODO: Check token balance if using token fees
    if (config.feeTokenMint && config.feeTokenAmount > 0) {
      // Implementation would check token account balance
      // For now, assume sufficient
    }

    return { valid: true };
  } catch (error) {
    console.error('Failed to validate fee balance:', error);
    return {
      valid: false,
      message: 'Failed to check balance. Please try again.',
    };
  }
}

/**
 * Get example fee wallet addresses (for documentation)
 */
export const EXAMPLE_FEE_WALLETS = {
  devnet: 'DevFeeWa11et1111111111111111111111111111111',
  mainnet: 'MainFeeWa11et111111111111111111111111111111',
} as const;
