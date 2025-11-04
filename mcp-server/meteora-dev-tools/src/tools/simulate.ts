/**
 * Transaction Simulation Tool
 *
 * Simulates transactions on Solana devnet/mainnet without sending them.
 */

import { Connection, Transaction } from '@solana/web3.js';

export interface SimulationResult {
  success: boolean;
  logs: string[];
  unitsConsumed: number;
  error?: string;
}

const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

export async function simulateTransaction(
  transactionBase64: string,
  network: string = 'devnet'
): Promise<SimulationResult> {
  try {
    const endpoint = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS.devnet;
    const connection = new Connection(endpoint, 'confirmed');

    // Decode transaction
    const buffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(buffer);

    // Simulate
    const simulation = await connection.simulateTransaction(transaction);

    return {
      success: simulation.value.err === null,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed || 0,
      error: simulation.value.err ? JSON.stringify(simulation.value.err) : undefined,
    };
  } catch (error) {
    throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
