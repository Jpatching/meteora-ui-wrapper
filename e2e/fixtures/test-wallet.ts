/**
 * Test wallet utilities for E2E tests
 * Provides functions to load and use a test wallet for devnet transactions
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TEST_WALLET_CONFIG, DEVNET_RPC } from './test-data';

/**
 * Load test wallet from environment variables
 * Expects TEST_WALLET_PRIVATE_KEY in format: [1,2,3,...]
 */
export function loadTestWallet(): Keypair {
  if (!TEST_WALLET_CONFIG.privateKey) {
    throw new Error(
      'TEST_WALLET_PRIVATE_KEY not found in environment. ' +
      'Please create a .env.test file with your devnet wallet private key.'
    );
  }

  try {
    const secretKey = JSON.parse(TEST_WALLET_CONFIG.privateKey);
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse TEST_WALLET_PRIVATE_KEY. ` +
      `Expected format: [1,2,3,...]. Error: ${message}`
    );
  }
}

/**
 * Get test wallet balance on devnet
 */
export async function getTestWalletBalance(wallet: Keypair): Promise<number> {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Check if test wallet has sufficient balance
 * Throws error if balance is too low
 */
export async function ensureSufficientBalance(
  wallet: Keypair,
  minBalance = 5
): Promise<void> {
  const balance = await getTestWalletBalance(wallet);

  if (balance < minBalance) {
    throw new Error(
      `Test wallet balance too low: ${balance} SOL. ` +
      `Minimum required: ${minBalance} SOL. ` +
      `Please fund your devnet wallet at https://faucet.solana.com/`
    );
  }

  console.log(`✓ Test wallet balance: ${balance.toFixed(2)} SOL`);
}

/**
 * Mock wallet adapter for Playwright tests
 * This will be injected into the page to simulate a connected wallet
 */
export interface MockWalletAdapter {
  publicKey: PublicKey;
  connected: boolean;
  autoApprove: boolean;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Create a mock wallet adapter that auto-approves transactions
 * This will be used to inject into the browser context
 */
export function createMockWalletAdapter(wallet: Keypair): MockWalletAdapter {
  return {
    publicKey: wallet.publicKey,
    connected: true,
    autoApprove: true,
    signTransaction: async (tx: any) => {
      // In real implementation, this would sign the transaction
      // For now, we'll let the actual wallet handle signing via the SDK
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs;
    },
    connect: async () => {
      console.log('Mock wallet connected');
    },
    disconnect: async () => {
      console.log('Mock wallet disconnected');
    },
  };
}

/**
 * Inject test wallet into page context
 * This function will be called in the browser to simulate a connected wallet
 */
export const injectTestWalletScript = (walletAddress: string) => `
  // Store the test wallet address
  window.__TEST_WALLET_ADDRESS__ = '${walletAddress}';

  // Mock the wallet adapter
  window.__MOCK_WALLET__ = {
    publicKey: { toString: () => '${walletAddress}' },
    connected: true,
    autoApprove: true,
  };

  console.log('Test wallet injected:', '${walletAddress}');
`;

/**
 * Wait for wallet to be connected in the page
 */
export async function waitForWalletConnection(page: any, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const walletButton = document.querySelector('[data-testid="wallet-button"]');
      return walletButton && !walletButton.textContent?.includes('Connect');
    },
    { timeout }
  );
}
