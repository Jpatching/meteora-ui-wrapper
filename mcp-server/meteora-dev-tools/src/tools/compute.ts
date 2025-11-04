/**
 * Compute Unit Estimation Tool
 *
 * Estimates compute units required for transaction execution.
 */

import { Connection, Transaction } from '@solana/web3.js';

export interface ComputeEstimate {
  estimatedUnits: number;
  maxUnits: number;
  percentageUsed: number;
  withinBudget: boolean;
  recommendation: string;
}

const MAX_COMPUTE_UNITS = 1_400_000;
const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

export async function estimateComputeUnits(
  transactionBase64: string,
  network: string = 'devnet'
): Promise<ComputeEstimate> {
  try {
    const endpoint = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS.devnet;
    const connection = new Connection(endpoint, 'confirmed');

    // Decode and simulate
    const buffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(buffer);

    const simulation = await connection.simulateTransaction(transaction);
    const estimatedUnits = simulation.value.unitsConsumed || 0;

    const percentageUsed = (estimatedUnits / MAX_COMPUTE_UNITS) * 100;
    const withinBudget = estimatedUnits <= MAX_COMPUTE_UNITS;

    let recommendation: string;
    if (percentageUsed < 50) {
      recommendation = 'Excellent - plenty of compute budget remaining';
    } else if (percentageUsed < 75) {
      recommendation = 'Good - acceptable compute usage';
    } else if (percentageUsed < 90) {
      recommendation = 'Warning - consider optimizing transaction';
    } else if (withinBudget) {
      recommendation = 'Critical - very close to limit, high risk of failure';
    } else {
      recommendation = 'ERROR - transaction exceeds compute budget and will fail';
    }

    return {
      estimatedUnits,
      maxUnits: MAX_COMPUTE_UNITS,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      withinBudget,
      recommendation,
    };
  } catch (error) {
    throw new Error(`Compute estimation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
