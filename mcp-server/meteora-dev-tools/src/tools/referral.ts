/**
 * Referral Split Testing Tool
 *
 * Validates referral fee distribution mathematics.
 */

export interface ReferralSplitResult {
  valid: boolean;
  distribution: {
    referral: { lamports: number; sol: number; percentage: number };
    buyback: { lamports: number; sol: number; percentage: number };
    treasury: { lamports: number; sol: number; percentage: number };
    total: { lamports: number; sol: number };
  };
  errors: string[];
  warnings: string[];
}

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function testReferralSplit(
  totalFeeLamports: number,
  referralPercentage: number,
  buybackPercentage: number,
  treasuryPercentage: number
): Promise<ReferralSplitResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation checks

  // Check 1: Percentages add up to 100
  const totalPercentage = referralPercentage + buybackPercentage + treasuryPercentage;
  if (totalPercentage !== 100) {
    errors.push(`Percentages don't add up to 100% (got ${totalPercentage}%)`);
  }

  // Check 2: No negative percentages
  if (referralPercentage < 0 || buybackPercentage < 0 || treasuryPercentage < 0) {
    errors.push('Percentages cannot be negative');
  }

  // Check 3: Positive fee amount
  if (totalFeeLamports <= 0) {
    errors.push('Total fee must be positive');
  }

  // Calculate distribution
  const referralLamports = Math.floor((totalFeeLamports * referralPercentage) / 100);
  const buybackLamports = Math.floor((totalFeeLamports * buybackPercentage) / 100);
  const treasuryLamports = Math.floor((totalFeeLamports * treasuryPercentage) / 100);

  const distributedTotal = referralLamports + buybackLamports + treasuryLamports;

  // Check 4: No rounding errors (all lamports distributed)
  if (distributedTotal !== totalFeeLamports) {
    const diff = totalFeeLamports - distributedTotal;
    warnings.push(`Rounding error: ${diff} lamports unaccounted for (${(diff / LAMPORTS_PER_SOL).toFixed(9)} SOL)`);
  }

  // Check 5: All amounts are whole numbers
  if (!Number.isInteger(referralLamports) || !Number.isInteger(buybackLamports) || !Number.isInteger(treasuryLamports)) {
    errors.push('Internal error: lamport amounts must be integers');
  }

  const distribution = {
    referral: {
      lamports: referralLamports,
      sol: referralLamports / LAMPORTS_PER_SOL,
      percentage: referralPercentage,
    },
    buyback: {
      lamports: buybackLamports,
      sol: buybackLamports / LAMPORTS_PER_SOL,
      percentage: buybackPercentage,
    },
    treasury: {
      lamports: treasuryLamports,
      sol: treasuryLamports / LAMPORTS_PER_SOL,
      percentage: treasuryPercentage,
    },
    total: {
      lamports: distributedTotal,
      sol: distributedTotal / LAMPORTS_PER_SOL,
    },
  };

  return {
    valid: errors.length === 0,
    distribution,
    errors,
    warnings,
  };
}
