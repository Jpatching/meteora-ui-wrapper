import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

/**
 * Playwright configuration for E2E testing of DLMM operations on devnet
 *
 * Key considerations:
 * - Sequential execution (workers: 1) to avoid blockchain race conditions
 * - Long timeouts (3 minutes) to handle blockchain confirmation times
 * - Single browser (chromium) for consistency
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially to avoid conflicts on blockchain
  fullyParallel: false,
  workers: 1,

  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Global timeout for each test (3 minutes for blockchain operations)
  timeout: 180000,

  // Expect timeout (30 seconds for assertions)
  expect: {
    timeout: 30000,
  },

  use: {
    // Base URL for the app
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 15000,
  },

  // Configure chromium browser
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Viewport size
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Start local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
