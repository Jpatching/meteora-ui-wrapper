import { Connection, TransactionSignature } from '@solana/web3.js';

/**
 * Configuration for transaction confirmation retry logic
 */
interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 16000, // 16 seconds
  commitment: 'confirmed',
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Confirm a transaction with automatic retry logic and exponential backoff
 *
 * This function handles:
 * - RPC rate limiting (429 errors)
 * - Network timeouts
 * - Temporary connection issues
 *
 * @param connection - Solana connection object
 * @param signature - Transaction signature to confirm
 * @param config - Optional retry configuration
 * @returns Promise that resolves when transaction is confirmed
 * @throws Error if transaction fails after all retries
 */
export async function confirmTransactionWithRetry(
  connection: Connection,
  signature: TransactionSignature,
  config: RetryConfig = {}
): Promise<void> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    commitment,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        attempt === 0
          ? `Confirming transaction: ${signature}`
          : `Retry ${attempt}/${maxRetries} for transaction: ${signature}`
      );

      // Attempt to confirm the transaction
      const result = await connection.confirmTransaction(signature, commitment);

      // Check if transaction failed on-chain
      if (result.value.err) {
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(result.value.err)}`
        );
      }

      console.log(`Transaction confirmed: ${signature}`);
      return; // Success!
    } catch (error: any) {
      lastError = error;

      // Check if this is a rate limiting error
      const isRateLimitError =
        error.message?.includes('429') ||
        error.message?.includes('Too many requests') ||
        error.message?.includes('rate limit');

      // Check if this is a timeout error
      const isTimeoutError =
        error.message?.includes('timeout') ||
        error.message?.includes('timed out') ||
        error.message?.includes('ETIMEDOUT');

      // Check if transaction blockhash expired (cannot be retried)
      const isBlockhashExpired =
        error.name === 'TransactionExpiredTimeoutError' ||
        error.message?.includes('TransactionExpiredTimeoutError') ||
        error.message?.includes('not confirmed in');

      // Check if this is a network error we should retry
      const isNetworkError =
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND');

      // Blockhash expired - transaction is dead, don't retry
      if (isBlockhashExpired) {
        console.error(`Transaction blockhash expired. Transaction was not included in a block.`);
        throw new Error(
          `Transaction blockhash expired before confirmation. The transaction may need to be resent with a fresh blockhash. Signature: ${signature}`
        );
      }

      const shouldRetry = isRateLimitError || isTimeoutError || isNetworkError;

      // If we've exhausted retries or it's not a retryable error, throw
      if (attempt >= maxRetries || !shouldRetry) {
        console.error(`Transaction confirmation failed after ${attempt + 1} attempts:`, error);
        throw error;
      }

      // Calculate backoff delay
      const delay = getBackoffDelay(attempt, baseDelay, maxDelay);

      console.warn(
        `Transaction confirmation attempt ${attempt + 1} failed (${
          isRateLimitError ? 'rate limit' : isTimeoutError ? 'timeout' : 'network error'
        }). Retrying in ${Math.round(delay / 1000)}s...`
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Transaction confirmation failed');
}

/**
 * Confirm multiple transactions sequentially with delays between them
 * This helps prevent RPC rate limiting and ensures proper state settlement
 *
 * @param connection - Solana connection object
 * @param signatures - Array of transaction signatures to confirm
 * @param config - Optional retry configuration
 * @param delayBetweenTx - Delay in milliseconds between transaction confirmations (default: 200ms)
 * @returns Promise that resolves when all transactions are confirmed
 */
export async function confirmTransactionsSequentially(
  connection: Connection,
  signatures: TransactionSignature[],
  config: RetryConfig = {},
  delayBetweenTx: number = 200
): Promise<void> {
  for (let i = 0; i < signatures.length; i++) {
    const signature = signatures[i];

    console.log(`Confirming transaction ${i + 1}/${signatures.length}: ${signature}`);

    await confirmTransactionWithRetry(connection, signature, config);

    // Add delay between transactions (except after the last one)
    if (i < signatures.length - 1) {
      console.log(`Waiting ${delayBetweenTx}ms before next transaction...`);
      await sleep(delayBetweenTx);
    }
  }

  console.log(`All ${signatures.length} transactions confirmed successfully`);
}

/**
 * Check the status of a transaction without waiting for confirmation
 * Useful for checking if a transaction succeeded after a confirmation timeout
 *
 * @param connection - Solana connection object
 * @param signature - Transaction signature to check
 * @returns Transaction status or null if not found
 */
export async function getTransactionStatus(
  connection: Connection,
  signature: TransactionSignature
): Promise<{ confirmed: boolean; err: any | null } | null> {
  try {
    const status = await connection.getSignatureStatus(signature);

    if (!status || !status.value) {
      return null;
    }

    return {
      confirmed: status.value.confirmationStatus === 'confirmed' ||
                status.value.confirmationStatus === 'finalized',
      err: status.value.err,
    };
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return null;
  }
}
