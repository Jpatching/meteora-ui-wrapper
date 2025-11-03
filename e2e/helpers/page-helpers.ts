/**
 * Page interaction helpers for E2E tests
 * Provides reusable functions for common page interactions and assertions
 */

import { expect, Page } from '@playwright/test';

/**
 * Fill the DLMM Create Pool form
 */
export async function fillCreatePoolForm(
  page: Page,
  config: {
    createNew: boolean;
    tokenName?: string;
    tokenSymbol?: string;
    tokenUri?: string;
    tokenDecimals?: string;
    tokenSupply?: string;
    baseMint?: string;
    quoteMint: string;
    binStep: string;
    feeBps?: string;
  }
) {
  // Toggle create new token checkbox
  const createNewCheckbox = page.locator('input[type="checkbox"]').first();
  const isChecked = await createNewCheckbox.isChecked();

  if (config.createNew && !isChecked) {
    await createNewCheckbox.check();
  } else if (!config.createNew && isChecked) {
    await createNewCheckbox.uncheck();
  }

  // Fill token creation fields if creating new token
  if (config.createNew) {
    await page.fill('input[name="tokenName"], input[placeholder*="Token Name"]', config.tokenName || '');
    await page.fill('input[name="tokenSymbol"], input[placeholder*="Symbol"]', config.tokenSymbol || '');
    await page.fill('input[name="tokenUri"], input[placeholder*="URI"]', config.tokenUri || '');

    if (config.tokenDecimals) {
      await page.fill('input[name="tokenDecimals"]', config.tokenDecimals);
    }
    if (config.tokenSupply) {
      await page.fill('input[name="tokenSupply"]', config.tokenSupply);
    }
  } else {
    // Fill existing token mint
    await page.fill('input[name="baseMint"], input[placeholder*="Base Token Mint"]', config.baseMint || '');
  }

  // Fill pool configuration
  await page.fill('input[name="quoteMint"], select[name="quoteMint"]', config.quoteMint);
  await page.fill('input[name="binStep"], select[name="binStep"]', config.binStep);

  if (config.feeBps) {
    await page.fill('input[name="feeBps"]', config.feeBps);
  }
}

/**
 * Fill the Seed Liquidity (LFG) form
 */
export async function fillSeedLFGForm(
  page: Page,
  config: {
    baseMint: string;
    quoteMint: string;
    minPrice: string;
    maxPrice: string;
    curvature: string;
    seedAmount: string;
  }
) {
  await page.fill('input[name="baseMint"], input[placeholder*="Base Token Mint"]', config.baseMint);
  await page.fill('input[name="quoteMint"]', config.quoteMint);
  await page.fill('input[name="minPrice"]', config.minPrice);
  await page.fill('input[name="maxPrice"]', config.maxPrice);
  await page.fill('input[name="curvature"]', config.curvature);
  await page.fill('input[name="seedAmount"]', config.seedAmount);
}

/**
 * Fill the Seed Liquidity (Single Bin) form
 */
export async function fillSeedSingleForm(
  page: Page,
  config: {
    baseMint: string;
    quoteMint: string;
    price: string;
    priceRounding: string;
    seedAmount: string;
  }
) {
  await page.fill('input[name="baseMint"], input[placeholder*="Base Token Mint"]', config.baseMint);
  await page.fill('input[name="quoteMint"]', config.quoteMint);
  await page.fill('input[name="price"]', config.price);
  await page.selectOption('select[name="priceRounding"]', config.priceRounding);
  await page.fill('input[name="seedAmount"]', config.seedAmount);
}

/**
 * Fill the Set Pool Status form
 */
export async function fillPoolStatusForm(
  page: Page,
  config: {
    poolAddress: string;
    status: 'enabled' | 'disabled';
  }
) {
  await page.fill('input[name="poolAddress"]', config.poolAddress);
  await page.selectOption('select[name="status"]', config.status);
}

/**
 * Wait for a success toast to appear and extract transaction signature
 */
export async function waitForSuccessToast(
  page: Page,
  timeout = 120000
): Promise<void> {
  await page.waitForSelector(
    'text=/success|Success|created|Created/i',
    { timeout }
  );
}

/**
 * Extract transaction signature from page
 * Looks for Solscan links or transaction signatures in the DOM
 */
export async function extractTransactionSignature(page: Page): Promise<string | null> {
  try {
    // Look for Solscan transaction link
    const txLink = page.locator('a[href*="solscan.io/tx"]').first();
    if (await txLink.count() > 0) {
      const href = await txLink.getAttribute('href');
      if (href) {
        const match = href.match(/tx\/([^?]+)/);
        if (match) {
          return match[1];
        }
      }
    }

    // Look for transaction signature in text (monospace font typically used)
    const signature = await page.locator('.font-mono, [data-testid="signature"]').first().textContent();
    if (signature && signature.length > 50) {
      return signature.trim();
    }

    return null;
  } catch (error) {
    console.error('Error extracting transaction signature:', error);
    return null;
  }
}

/**
 * Extract created token/pool address from page
 */
export async function extractCreatedAddress(
  page: Page,
  type: 'token' | 'pool'
): Promise<string | null> {
  try {
    // Look for Solscan account/token link
    const accountLink = page.locator(`a[href*="solscan.io/${type === 'token' ? 'token' : 'account'}"]`).first();
    if (await accountLink.count() > 0) {
      const href = await accountLink.getAttribute('href');
      if (href) {
        const match = href.match(new RegExp(`${type === 'token' ? 'token' : 'account'}/([^?]+)`));
        if (match) {
          return match[1];
        }
      }
    }

    // Look for address in text
    const addressElement = page.locator(`[data-testid="${type}-address"]`).first();
    if (await addressElement.count() > 0) {
      const address = await addressElement.textContent();
      if (address && address.length > 30) {
        return address.trim();
      }
    }

    return null;
  } catch (error) {
    console.error(`Error extracting ${type} address:`, error);
    return null;
  }
}

/**
 * Verify wallet is connected
 */
export async function verifyWalletConnected(page: Page): Promise<boolean> {
  try {
    const walletButton = page.locator('button:has-text("Connect Wallet"), [data-testid="wallet-button"]').first();
    const text = await walletButton.textContent();
    return !text?.includes('Connect');
  } catch (error) {
    return false;
  }
}

/**
 * Check for error messages on page
 */
export async function checkForErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  // Check for error toasts
  const errorToasts = page.locator('text=/error|Error|failed|Failed/i');
  const count = await errorToasts.count();

  for (let i = 0; i < count; i++) {
    const text = await errorToasts.nth(i).textContent();
    if (text) {
      errors.push(text.trim());
    }
  }

  // Check for error text in page
  const errorElements = page.locator('.text-error, .text-red-500, [data-testid="error"]');
  const errorCount = await errorElements.count();

  for (let i = 0; i < errorCount; i++) {
    const text = await errorElements.nth(i).textContent();
    if (text) {
      errors.push(text.trim());
    }
  }

  return errors;
}

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingComplete(page: Page, timeout = 30000): Promise<void> {
  await page.waitForSelector(
    'text=/loading|Loading|processing|Processing/i',
    { state: 'hidden', timeout }
  ).catch(() => {
    // Ignore if loading text never appears
  });
}

/**
 * Submit form and wait for response
 */
export async function submitFormAndWait(
  page: Page,
  buttonText: string,
  timeout = 120000
): Promise<void> {
  await page.click(`button:has-text("${buttonText}")`);
  await waitForLoadingComplete(page, timeout);
}
