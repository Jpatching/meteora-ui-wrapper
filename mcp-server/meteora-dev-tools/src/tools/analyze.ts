/**
 * Transaction Analysis Tool
 *
 * Provides detailed analysis of transaction instructions.
 */

import { Transaction } from '@solana/web3.js';

export interface InstructionAnalysis {
  index: number;
  programId: string;
  programName: string;
  accounts: string[];
  dataPreview: string;
}

export interface AnalysisResult {
  instructionCount: number;
  instructions: InstructionAnalysis[];
  summary: {
    systemTransfers: number;
    programInvocations: Record<string, number>;
    uniqueAccounts: number;
  };
}

const PROGRAM_NAMES: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  // Add Meteora program IDs as discovered
};

export async function analyzeTransactionInstructions(
  transactionBase64: string,
  verbose: boolean = false
): Promise<AnalysisResult> {
  try {
    const buffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(buffer);

    const instructions = transaction.instructions;
    const programCounts: Record<string, number> = {};
    const accountSet = new Set<string>();
    let systemTransfers = 0;

    const instructionDetails: InstructionAnalysis[] = instructions.map((ix, index) => {
      const programId = ix.programId.toBase58();
      const programName = PROGRAM_NAMES[programId] || 'Unknown Program';

      // Track program invocations
      programCounts[programName] = (programCounts[programName] || 0) + 1;

      // Track system transfers
      if (programId === '11111111111111111111111111111111' && ix.data[0] === 2) {
        systemTransfers++;
      }

      // Track accounts
      ix.keys.forEach(key => accountSet.add(key.pubkey.toBase58()));

      const accounts = verbose
        ? ix.keys.map(k => k.pubkey.toBase58())
        : ix.keys.map(k => k.pubkey.toBase58().slice(0, 8) + '...');

      const dataPreview = ix.data.slice(0, 16).toString('hex') + (ix.data.length > 16 ? '...' : '');

      return {
        index,
        programId,
        programName,
        accounts,
        dataPreview,
      };
    });

    return {
      instructionCount: instructions.length,
      instructions: instructionDetails,
      summary: {
        systemTransfers,
        programInvocations: programCounts,
        uniqueAccounts: accountSet.size,
      },
    };
  } catch (error) {
    throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
