/**
 * Fee Atomicity Validation Tool
 *
 * Validates that fee instructions are prepended to the transaction atomically.
 * Critical for preventing fee loss when main transaction fails.
 */

import { Transaction, SystemProgram } from '@solana/web3.js';

export interface FeeAtomicityResult {
  isAtomic: boolean;
  feeInstructionsCount: number;
  feeInstructionsFirst: boolean;
  issues: string[];
  recommendations: string[];
  details: {
    totalInstructions: number;
    systemTransferIndices: number[];
    firstNonFeeIndex: number | null;
  };
}

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

export async function validateFeeAtomicity(
  transactionBase64: string,
  expectedFeeCount: number = 3
): Promise<FeeAtomicityResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Decode transaction
    const buffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(buffer);

    const instructions = transaction.instructions;
    const totalInstructions = instructions.length;

    // Identify System Program transfer instructions
    const systemTransferIndices: number[] = [];
    let firstNonFeeIndex: number | null = null;

    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      const programId = instruction.programId.toBase58();

      // Check if this is a System Program transfer
      if (programId === SYSTEM_PROGRAM_ID) {
        // Decode instruction data to verify it's a transfer (instruction type 2)
        const data = instruction.data;
        if (data.length >= 4 && data[0] === 2) {
          systemTransferIndices.push(i);
        }
      } else if (firstNonFeeIndex === null) {
        firstNonFeeIndex = i;
      }
    }

    const feeInstructionsCount = systemTransferIndices.length;
    const feeInstructionsFirst = systemTransferIndices.length > 0 && systemTransferIndices[0] === 0;

    // Validation checks

    // Check 1: Do fee instructions exist?
    if (feeInstructionsCount === 0) {
      issues.push('No fee transfer instructions found in transaction');
      recommendations.push('Add fee distribution instructions using getFeeDistributionInstructions()');
    }

    // Check 2: Are fees at the beginning?
    if (feeInstructionsCount > 0 && !feeInstructionsFirst) {
      issues.push(`Fee instructions start at index ${systemTransferIndices[0]}, not at the beginning`);
      recommendations.push('Prepend fee instructions to transaction using .unshift() after .reverse()');
    }

    // Check 3: Are fees contiguous?
    if (feeInstructionsCount > 1) {
      const areContiguous = systemTransferIndices.every((idx, i) => {
        if (i === 0) return true;
        return idx === systemTransferIndices[i - 1] + 1;
      });

      if (!areContiguous) {
        issues.push('Fee instructions are not contiguous (other instructions in between)');
        recommendations.push('Ensure all fee instructions are prepended together atomically');
      }
    }

    // Check 4: Correct fee count?
    if (feeInstructionsCount > 0 && feeInstructionsCount !== expectedFeeCount) {
      const warningMsg = `Found ${feeInstructionsCount} fee instructions, expected ${expectedFeeCount}`;

      if (feeInstructionsCount < expectedFeeCount) {
        issues.push(warningMsg);
        if (expectedFeeCount === 3 && feeInstructionsCount === 2) {
          recommendations.push('Missing referral fee transfer. Ensure referral code is being used.');
        }
      } else {
        // More than expected - could be intentional
        recommendations.push(`${warningMsg}. Verify this is intentional.`);
      }
    }

    // Check 5: Are there fee instructions elsewhere in the transaction?
    const feeInstructionsAfterMain = systemTransferIndices.filter(idx => {
      return firstNonFeeIndex !== null && idx > firstNonFeeIndex;
    });

    if (feeInstructionsAfterMain.length > 0) {
      issues.push(`Found ${feeInstructionsAfterMain.length} fee instructions after main operation`);
      recommendations.push('All fee instructions should be at the beginning, not at the end');
    }

    // Overall atomicity determination
    const isAtomic =
      feeInstructionsCount > 0 &&
      feeInstructionsFirst &&
      issues.length === 0;

    // Success recommendations
    if (isAtomic) {
      recommendations.push('✓ Fee instructions are correctly prepended atomically');
      recommendations.push('✓ Transaction follows atomic fee pattern');
    }

    return {
      isAtomic,
      feeInstructionsCount,
      feeInstructionsFirst,
      issues,
      recommendations,
      details: {
        totalInstructions,
        systemTransferIndices,
        firstNonFeeIndex,
      },
    };
  } catch (error) {
    throw new Error(`Failed to validate fee atomicity: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Example usage:
 *
 * const transaction = new Transaction();
 * // ... build transaction with SDK ...
 *
 * // Add fee instructions (CORRECT - atomic)
 * const feeInstructions = await getFeeDistributionInstructions(publicKey);
 * feeInstructions.reverse().forEach(ix => transaction.instructions.unshift(ix));
 *
 * // Validate
 * const serialized = transaction.serialize({requireAllSignatures: false});
 * const base64 = serialized.toString('base64');
 *
 * const result = await validateFeeAtomicity(base64);
 *
 * if (!result.isAtomic) {
 *   console.error('Issues:', result.issues);
 *   console.log('Recommendations:', result.recommendations);
 * }
 */
