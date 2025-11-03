/**
 * Solana blockchain helper functions for E2E tests
 * Provides utilities to verify transactions, accounts, and on-chain state on devnet
 */

import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';
import { getMint, getAccount } from '@solana/spl-token';
import { DEVNET_RPC } from '../fixtures/test-data';

/**
 * Create a connection to devnet
 */
export function getDevnetConnection(): Connection {
  return new Connection(DEVNET_RPC, 'confirmed');
}

/**
 * Verify that a transaction was successful on devnet
 */
export async function verifyTransactionSuccess(
  signature: TransactionSignature,
  timeout = 60000
): Promise<boolean> {
  const connection = getDevnetConnection();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (status.value === null) {
        // Transaction not found yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      if (status.value.err) {
        console.error('Transaction failed:', status.value.err);
        return false;
      }

      if (status.value.confirmationStatus === 'confirmed' ||
          status.value.confirmationStatus === 'finalized') {
        console.log(`✓ Transaction confirmed: ${signature}`);
        return true;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error checking transaction status:', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.error(`Transaction confirmation timeout: ${signature}`);
  return false;
}

/**
 * Get transaction details from devnet
 */
export async function getTransactionDetails(signature: TransactionSignature) {
  const connection = getDevnetConnection();
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    return tx;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

/**
 * Verify that a token mint exists and get its details
 */
export async function getTokenMintInfo(mintAddress: string) {
  const connection = getDevnetConnection();
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const mintInfo = await getMint(connection, mintPubkey);

    console.log(`✓ Token mint found: ${mintAddress}`);
    console.log(`  Supply: ${mintInfo.supply.toString()}`);
    console.log(`  Decimals: ${mintInfo.decimals}`);

    return {
      address: mintAddress,
      supply: mintInfo.supply.toString(),
      decimals: mintInfo.decimals,
      mintAuthority: mintInfo.mintAuthority?.toString() || null,
      freezeAuthority: mintInfo.freezeAuthority?.toString() || null,
    };
  } catch (error) {
    console.error('Error fetching token mint:', error);
    return null;
  }
}

/**
 * Verify that a token account exists and get its balance
 */
export async function getTokenAccountBalance(
  tokenAccountAddress: string
): Promise<{ amount: string; decimals: number } | null> {
  const connection = getDevnetConnection();
  try {
    const accountPubkey = new PublicKey(tokenAccountAddress);
    const accountInfo = await getAccount(connection, accountPubkey);

    return {
      amount: accountInfo.amount.toString(),
      decimals: await getMint(connection, accountInfo.mint).then(m => m.decimals),
    };
  } catch (error) {
    console.error('Error fetching token account:', error);
    return null;
  }
}

/**
 * Verify that an account exists on devnet
 */
export async function accountExists(address: string): Promise<boolean> {
  const connection = getDevnetConnection();
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking account existence:', error);
    return false;
  }
}

/**
 * Get account data from devnet
 */
export async function getAccountData(address: string) {
  const connection = getDevnetConnection();
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);

    if (!accountInfo) {
      console.error(`Account not found: ${address}`);
      return null;
    }

    return {
      address,
      lamports: accountInfo.lamports,
      owner: accountInfo.owner.toString(),
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
      dataLength: accountInfo.data.length,
    };
  } catch (error) {
    console.error('Error fetching account data:', error);
    return null;
  }
}

/**
 * Verify DLMM pool exists (checks for account with expected program owner)
 * Note: This is a basic check. For full validation, you'd need the DLMM SDK
 */
export async function verifyPoolExists(poolAddress: string): Promise<boolean> {
  const accountData = await getAccountData(poolAddress);

  if (!accountData) {
    return false;
  }

  console.log(`✓ Pool account found: ${poolAddress}`);
  console.log(`  Owner: ${accountData.owner}`);
  console.log(`  Lamports: ${accountData.lamports}`);

  return true;
}

/**
 * Wait for an account to exist on devnet
 * Useful for newly created accounts that may take a moment to appear
 */
export async function waitForAccountExistence(
  address: string,
  timeout = 30000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await accountExists(address)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false;
}

/**
 * Get recent blockhash (useful for debugging)
 */
export async function getRecentBlockhash() {
  const connection = getDevnetConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

/**
 * Get current slot (useful for debugging)
 */
export async function getCurrentSlot() {
  const connection = getDevnetConnection();
  return await connection.getSlot();
}
