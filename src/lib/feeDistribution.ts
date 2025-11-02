import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

/**
 * Fee Distribution Configuration
 *
 * Manages the 3-way split of platform fees:
 * - 10% to referrer (if referral code provided)
 * - 45% to buyback wallet (for token buybacks)
 * - 45% to treasury wallet (platform operations)
 */

export interface FeeDistributionConfig {
  enabled: boolean;
  totalFeeLamports: number;
  referralPercentage: number;
  buybackPercentage: number;
  treasuryPercentage: number;
  buybackWallet?: PublicKey;
  treasuryWallet?: PublicKey;
}

export interface FeeDistribution {
  referralAmount: number;
  buybackAmount: number;
  treasuryAmount: number;
  referralWallet?: PublicKey;
  buybackWallet?: PublicKey;
  treasuryWallet?: PublicKey;
}

/**
 * Load fee distribution configuration from environment variables
 */
export function loadFeeDistributionConfig(): FeeDistributionConfig {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_FEES === 'true';
  const referralPercentage = parseInt(process.env.NEXT_PUBLIC_REFERRAL_PERCENTAGE || '10', 10);
  const buybackPercentage = parseInt(process.env.NEXT_PUBLIC_BUYBACK_PERCENTAGE || '45', 10);
  const treasuryPercentage = parseInt(process.env.NEXT_PUBLIC_TREASURY_PERCENTAGE || '45', 10);
  const totalFeeLamports = parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS || '100000000', 10);

  // Validate percentages total 100%
  const total = referralPercentage + buybackPercentage + treasuryPercentage;
  if (total !== 100) {
    console.warn(
      `Fee distribution percentages do not total 100% (got ${total}%). Using default split.`
    );
  }

  let buybackWallet: PublicKey | undefined;
  let treasuryWallet: PublicKey | undefined;

  try {
    if (process.env.NEXT_PUBLIC_BUYBACK_WALLET) {
      buybackWallet = new PublicKey(process.env.NEXT_PUBLIC_BUYBACK_WALLET);
    }
  } catch (error) {
    console.error('Invalid NEXT_PUBLIC_BUYBACK_WALLET address');
  }

  try {
    if (process.env.NEXT_PUBLIC_TREASURY_WALLET) {
      treasuryWallet = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET);
    }
  } catch (error) {
    console.error('Invalid NEXT_PUBLIC_TREASURY_WALLET address');
  }

  return {
    enabled,
    totalFeeLamports,
    referralPercentage,
    buybackPercentage,
    treasuryPercentage,
    buybackWallet,
    treasuryWallet,
  };
}

/**
 * Calculate fee distribution amounts
 *
 * @param totalFeeLamports - Total fee in lamports
 * @param referralWallet - Optional referrer's wallet (if referral code used)
 * @returns Fee distribution breakdown
 */
export function calculateFeeDistribution(
  totalFeeLamports: number,
  referralWallet?: PublicKey
): FeeDistribution {
  const config = loadFeeDistributionConfig();

  // Calculate amounts based on percentages
  const referralAmount = referralWallet
    ? Math.floor((totalFeeLamports * config.referralPercentage) / 100)
    : 0;

  const buybackAmount = Math.floor((totalFeeLamports * config.buybackPercentage) / 100);
  const treasuryAmount = Math.floor((totalFeeLamports * config.treasuryPercentage) / 100);

  // If no referral, add referral amount to treasury
  const adjustedTreasuryAmount = referralWallet ? treasuryAmount : treasuryAmount + referralAmount;

  return {
    referralAmount: referralWallet ? referralAmount : 0,
    buybackAmount,
    treasuryAmount: adjustedTreasuryAmount,
    referralWallet: referralWallet,
    buybackWallet: config.buybackWallet,
    treasuryWallet: config.treasuryWallet,
  };
}

/**
 * Generate fee distribution instructions for a transaction
 *
 * Creates SystemProgram.transfer instructions for:
 * 1. Referral fee (if referral code provided)
 * 2. Buyback fee
 * 3. Treasury fee
 *
 * @param payer - User's wallet paying the fees
 * @param referralWallet - Optional referrer's wallet
 * @returns Array of transfer instructions
 */
export async function getFeeDistributionInstructions(
  payer: PublicKey,
  referralWallet?: PublicKey
): Promise<TransactionInstruction[]> {
  const config = loadFeeDistributionConfig();

  if (!config.enabled) {
    return [];
  }

  const distribution = calculateFeeDistribution(config.totalFeeLamports, referralWallet);
  const instructions: TransactionInstruction[] = [];

  // 1. Referral fee (if applicable)
  if (distribution.referralWallet && distribution.referralAmount > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: distribution.referralWallet,
        lamports: distribution.referralAmount,
      })
    );
  }

  // 2. Buyback fee
  if (distribution.buybackWallet && distribution.buybackAmount > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: distribution.buybackWallet,
        lamports: distribution.buybackAmount,
      })
    );
  }

  // 3. Treasury fee
  if (distribution.treasuryWallet && distribution.treasuryAmount > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: distribution.treasuryWallet,
        lamports: distribution.treasuryAmount,
      })
    );
  }

  // Fallback: If wallets not configured, use single fee wallet (legacy mode)
  if (instructions.length === 0) {
    const legacyFeeWallet = process.env.NEXT_PUBLIC_FEE_WALLET;
    if (legacyFeeWallet) {
      try {
        const feeWalletPubkey = new PublicKey(legacyFeeWallet);
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: feeWalletPubkey,
            lamports: config.totalFeeLamports,
          })
        );
      } catch (error) {
        console.error('Invalid legacy fee wallet address');
      }
    }
  }

  return instructions;
}

/**
 * Get fee breakdown for display purposes
 *
 * @param referralWallet - Optional referrer's wallet
 * @returns Human-readable fee breakdown
 */
export function getFeeBreakdown(referralWallet?: PublicKey) {
  const config = loadFeeDistributionConfig();
  const distribution = calculateFeeDistribution(config.totalFeeLamports, referralWallet);
  const LAMPORTS_PER_SOL = 1000000000;

  return {
    total: {
      lamports: config.totalFeeLamports,
      sol: config.totalFeeLamports / LAMPORTS_PER_SOL,
    },
    referral: {
      lamports: distribution.referralAmount,
      sol: distribution.referralAmount / LAMPORTS_PER_SOL,
      percentage: config.referralPercentage,
      active: !!referralWallet,
    },
    buyback: {
      lamports: distribution.buybackAmount,
      sol: distribution.buybackAmount / LAMPORTS_PER_SOL,
      percentage: config.buybackPercentage,
    },
    treasury: {
      lamports: distribution.treasuryAmount,
      sol: distribution.treasuryAmount / LAMPORTS_PER_SOL,
      percentage: referralWallet ? config.treasuryPercentage : config.treasuryPercentage + config.referralPercentage,
    },
  };
}

/**
 * Validate fee distribution configuration
 *
 * @returns Validation result with any errors
 */
export function validateFeeDistributionConfig(): { valid: boolean; errors: string[] } {
  const config = loadFeeDistributionConfig();
  const errors: string[] = [];

  // Check percentages total 100%
  const total = config.referralPercentage + config.buybackPercentage + config.treasuryPercentage;
  if (total !== 100) {
    errors.push(`Fee percentages must total 100% (currently ${total}%)`);
  }

  // Check individual percentages are valid
  if (config.referralPercentage < 0 || config.referralPercentage > 100) {
    errors.push(`Referral percentage must be between 0-100% (got ${config.referralPercentage}%)`);
  }

  if (config.buybackPercentage < 0 || config.buybackPercentage > 100) {
    errors.push(`Buyback percentage must be between 0-100% (got ${config.buybackPercentage}%)`);
  }

  if (config.treasuryPercentage < 0 || config.treasuryPercentage > 100) {
    errors.push(`Treasury percentage must be between 0-100% (got ${config.treasuryPercentage}%)`);
  }

  // Check total fee is reasonable
  if (config.totalFeeLamports < 0) {
    errors.push('Total fee cannot be negative');
  }

  if (config.totalFeeLamports > 1000000000) {
    // More than 1 SOL
    errors.push('Total fee seems unusually high (>1 SOL)');
  }

  // Warn if wallets not configured (will use legacy mode)
  if (config.enabled && !config.buybackWallet && !config.treasuryWallet) {
    const legacyWallet = process.env.NEXT_PUBLIC_FEE_WALLET;
    if (!legacyWallet) {
      errors.push('No fee wallets configured (need buyback/treasury OR legacy fee wallet)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
