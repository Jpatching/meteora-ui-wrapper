/**
 * E2E Test: DLMM Create Pool with New Token
 *
 * This test verifies the complete flow of creating a new SPL token
 * and DLMM pool on devnet, including blockchain verification.
 *
 * Prerequisites:
 * - .env.test file with TEST_WALLET_PRIVATE_KEY and TEST_WALLET_ADDRESS
 * - Test wallet funded with ~10 SOL on devnet
 * - Dev server running on localhost:3000
 */

import { test, expect } from '@playwright/test';
import {
  loadTestWallet,
  ensureSufficientBalance,
  injectTestWalletScript,
} from '../fixtures/test-wallet';
import {
  TEST_TOKEN_CONFIG,
  TEST_POOL_CONFIG,
  getSolscanTxUrl,
  getSolscanTokenUrl,
  getSolscanAccountUrl,
} from '../fixtures/test-data';
import {
  verifyTransactionSuccess,
  getTokenMintInfo,
  verifyPoolExists,
} from '../helpers/solana-helpers';
import {
  fillCreatePoolForm,
  waitForSuccessToast,
  extractTransactionSignature,
  extractCreatedAddress,
  checkForErrors,
} from '../helpers/page-helpers';

test.describe('DLMM Create Pool - New Token', () => {
  let testWallet: any;
  let createdTokenMint: string | null = null;
  let createdPoolAddress: string | null = null;
  let transactionSignature: string | null = null;

  test.beforeAll(async () => {
    // Load and verify test wallet
    testWallet = loadTestWallet();
    console.log(`Using test wallet: ${testWallet.publicKey.toString()}`);

    // Check wallet balance
    await ensureSufficientBalance(testWallet, 5);
  });

  test('should create new SPL token and DLMM pool on devnet', async ({ page }) => {
    console.log('\n🧪 Starting DLMM Create Pool (New Token) test...\n');

    // 1. Navigate to create pool page
    console.log('Step 1: Navigating to /dlmm/create-pool');
    await page.goto('/dlmm/create-pool');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // 2. Inject test wallet (simulate connected wallet)
    console.log('Step 2: Injecting test wallet');
    await page.addInitScript(injectTestWalletScript(testWallet.publicKey.toString()));

    // 3. Verify page loaded correctly
    await expect(page.locator('h1')).toContainText(/create.*pool/i);

    // 4. Fill the form with test data
    console.log('Step 3: Filling create pool form');
    console.log(`  Token Name: ${TEST_TOKEN_CONFIG.name}`);
    console.log(`  Token Symbol: ${TEST_TOKEN_CONFIG.symbol}`);
    console.log(`  Bin Step: ${TEST_POOL_CONFIG.binStep}`);

    await fillCreatePoolForm(page, {
      createNew: true,
      ...TEST_TOKEN_CONFIG,
      ...TEST_POOL_CONFIG,
    });

    // 5. Submit the form
    console.log('Step 4: Submitting form');
    await page.click('button:has-text("Create"), button:has-text("Submit")');

    // 6. Wait for loading state
    console.log('Step 5: Waiting for transaction processing...');
    await page.waitForSelector(
      'text=/creating|processing|loading/i',
      { timeout: 10000 }
    ).catch(() => {
      console.log('  (No loading indicator found, continuing...)');
    });

    // 7. Wait for success toast (with generous timeout for blockchain)
    console.log('Step 6: Waiting for success confirmation (up to 2 minutes)...');
    try {
      await waitForSuccessToast(page, 120000);
      console.log('  ✓ Success toast appeared!');
    } catch (error) {
      // Check for errors before failing
      const errors = await checkForErrors(page);
      if (errors.length > 0) {
        console.error('  ✗ Errors found on page:');
        errors.forEach(err => console.error(`    - ${err}`));
      }
      throw new Error('Transaction did not complete successfully');
    }

    // 8. Extract transaction signature
    console.log('Step 7: Extracting transaction details');
    transactionSignature = await extractTransactionSignature(page);
    if (transactionSignature) {
      console.log(`  Transaction: ${transactionSignature}`);
      console.log(`  View: ${getSolscanTxUrl(transactionSignature)}`);
    } else {
      console.warn('  Warning: Could not extract transaction signature from page');
    }

    // 9. Extract created token address
    createdTokenMint = await extractCreatedAddress(page, 'token');
    if (createdTokenMint) {
      console.log(`  Token Mint: ${createdTokenMint}`);
      console.log(`  View: ${getSolscanTokenUrl(createdTokenMint)}`);
    }

    // 10. Extract created pool address
    createdPoolAddress = await extractCreatedAddress(page, 'pool');
    if (createdPoolAddress) {
      console.log(`  Pool Address: ${createdPoolAddress}`);
      console.log(`  View: ${getSolscanAccountUrl(createdPoolAddress)}`);
    }

    // 11. Verify on blockchain
    if (transactionSignature) {
      console.log('\nStep 8: Verifying on devnet blockchain...');
      const txSuccess = await verifyTransactionSuccess(transactionSignature, 60000);
      expect(txSuccess).toBe(true);
      console.log('  ✓ Transaction confirmed on devnet!');
    }

    // 12. Verify token was created
    if (createdTokenMint) {
      console.log('Step 9: Verifying token metadata on devnet...');
      const tokenInfo = await getTokenMintInfo(createdTokenMint);
      expect(tokenInfo).not.toBeNull();

      if (tokenInfo) {
        console.log('  ✓ Token mint verified!');
        console.log(`    Decimals: ${tokenInfo.decimals}`);
        console.log(`    Supply: ${tokenInfo.supply}`);

        // Verify token properties match what we created
        expect(tokenInfo.decimals).toBe(Number(TEST_TOKEN_CONFIG.decimals));
      }
    }

    // 13. Verify pool was created
    if (createdPoolAddress) {
      console.log('Step 10: Verifying pool account on devnet...');
      const poolExists = await verifyPoolExists(createdPoolAddress);
      expect(poolExists).toBe(true);
      console.log('  ✓ Pool account verified!');
    }

    // 14. Verify no errors on page
    const errors = await checkForErrors(page);
    expect(errors).toHaveLength(0);

    console.log('\n✅ Test completed successfully!\n');
  });

  test('should store transaction in local storage', async ({ page }) => {
    console.log('\n🧪 Verifying transaction storage...\n');

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check if transaction appears in localStorage
    const transactions = await page.evaluate(() => {
      const stored = localStorage.getItem('meteora-transactions');
      return stored ? JSON.parse(stored) : [];
    });

    console.log(`  Found ${transactions.length} stored transaction(s)`);

    // Verify at least one transaction exists
    expect(transactions.length).toBeGreaterThan(0);

    // Find our transaction
    const ourTx = transactions.find((tx: any) =>
      tx.protocol === 'dlmm' &&
      tx.action === 'create-pool' &&
      (transactionSignature ? tx.signature === transactionSignature : true)
    );

    if (ourTx) {
      console.log('  ✓ Transaction found in storage');
      console.log(`    Protocol: ${ourTx.protocol}`);
      console.log(`    Action: ${ourTx.action}`);
      console.log(`    Status: ${ourTx.status}`);
      expect(ourTx.status).toBe('success');
    }

    console.log('\n✅ Storage verification complete!\n');
  });

  test.afterAll(async () => {
    // Log summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Token Created: ${createdTokenMint || 'N/A'}`);
    console.log(`Pool Created: ${createdPoolAddress || 'N/A'}`);
    console.log(`Transaction: ${transactionSignature || 'N/A'}`);

    if (createdTokenMint) {
      console.log(`\n🔗 View Token: ${getSolscanTokenUrl(createdTokenMint)}`);
    }
    if (createdPoolAddress) {
      console.log(`🔗 View Pool: ${getSolscanAccountUrl(createdPoolAddress)}`);
    }
    if (transactionSignature) {
      console.log(`🔗 View Transaction: ${getSolscanTxUrl(transactionSignature)}`);
    }
    console.log('');
  });
});
