# E2E Tests for DLMM Operations

End-to-end tests for verifying DLMM protocol operations on Solana devnet using Playwright.

## Prerequisites

### 1. Test Wallet Setup

You need a Solana wallet with devnet SOL for testing:

```bash
# Generate a new keypair for testing
solana-keygen new --outfile ~/.config/solana/test-wallet.json

# Get the wallet address
solana address -k ~/.config/solana/test-wallet.json

# Fund it with devnet SOL (run multiple times for ~10 SOL)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

Alternatively, use the web faucet: https://faucet.solana.com/

###2. Environment Configuration

Create `.env.test` file in the project root:

```bash
# Test wallet configuration
TEST_WALLET_PRIVATE_KEY=[1,2,3,...]  # Your keypair secret as array
TEST_WALLET_ADDRESS=YourDevnetWalletAddress

# RPC endpoint (optional, defaults to public devnet)
TEST_RPC_ENDPOINT=https://api.devnet.solana.com
```

**To get your private key in array format:**

```bash
# If using solana-keygen
cat ~/.config/solana/test-wallet.json

# Copy the entire array [1,2,3,...] to TEST_WALLET_PRIVATE_KEY
```

**⚠️ IMPORTANT:** Never commit `.env.test` to git! It's already in `.gitignore`.

### 3. Install Dependencies

```bash
# Install Playwright and browsers
npm install
npx playwright install chromium
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run with UI Mode (Recommended for debugging)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See tests running in real-time
- Step through tests
- Inspect page state
- Debug failures

### Run Specific Test File

```bash
npx playwright test e2e/dlmm/01-create-pool-new-token.spec.ts
```

### View Test Report

```bash
npm run test:e2e:report
```

Opens an HTML report showing test results, screenshots, and videos.

## Test Structure

```
e2e/
├── fixtures/
│   ├── test-wallet.ts       # Test wallet utilities
│   └── test-data.ts          # Test data and constants
├── helpers/
│   ├── solana-helpers.ts     # Blockchain verification functions
│   └── page-helpers.ts       # Page interaction utilities
└── dlmm/
    ├── 01-create-pool-new-token.spec.ts       # Create pool + token
    ├── 02-create-pool-existing-token.spec.ts  # Create pool (existing token)
    ├── 03-seed-liquidity-lfg.spec.ts          # Seed with LFG strategy
    ├── 04-seed-liquidity-single.spec.ts       # Seed single bin
    └── 05-set-pool-status.spec.ts             # Enable/disable pool
```

## What Each Test Verifies

### On-Page Verification
- ✅ Form accepts inputs correctly
- ✅ Wallet connection required
- ✅ Loading states display
- ✅ Success toasts appear
- ✅ Transaction links generated
- ✅ No error messages

### Blockchain Verification
- ✅ Transaction confirmed on devnet
- ✅ Token metadata created (for new tokens)
- ✅ Pool account exists
- ✅ Pool configuration correct
- ✅ Liquidity positions created
- ✅ Pool status updated

## Test Configuration

Edit `playwright.config.ts` to customize:

```typescript
export default defineConfig({
  timeout: 180000,      // 3 minutes per test
  workers: 1,           // Run sequentially
  retries: 1,           // Retry failed tests once
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Troubleshooting

### Test Wallet Balance Too Low

```bash
# Check balance
solana balance YOUR_WALLET_ADDRESS --url devnet

# Get more SOL (may need to wait between requests)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Transaction Timeout

Devnet can be slow. Try:
1. Using a premium RPC endpoint (Helius, Alchemy)
2. Increasing timeout in test file
3. Running test again (devnet is sometimes flaky)

### Wallet Not Connecting

The tests use a mock wallet adapter. If having issues:
1. Verify `.env.test` is configured correctly
2. Check TEST_WALLET_PRIVATE_KEY format: `[1,2,3,...]`
3. Ensure no browser extensions are interfering

### RPC Rate Limits

If seeing rate limit errors:
1. Use premium RPC endpoint in `.env.test`
2. Add delays between tests
3. Reduce parallel execution (already set to 1)

### Tests Fail in CI

For CI/CD:
1. Store TEST_WALLET_PRIVATE_KEY in GitHub Secrets
2. Use premium RPC endpoint
3. Consider skipping E2E tests on some runs
4. Increase retries for flaky devnet

## Manual Testing

You can use the same test data for manual testing:

1. Run dev server: `npm run dev`
2. Open http://localhost:3000/dlmm/create-pool
3. Use test data from `e2e/fixtures/test-data.ts`:
   - Token Name: `Test Token XXXXXX`
   - Token Symbol: `TSTXXXX`
   - Bin Step: `25`
   - etc.
4. Verify transactions on Solscan:
   - https://solscan.io?cluster=devnet

## Best Practices

1. **Run tests sequentially** - Avoid parallel execution to prevent blockchain race conditions
2. **Monitor wallet balance** - Keep ~10 SOL in test wallet
3. **Use unique identifiers** - Tests generate unique token symbols to avoid conflicts
4. **Check test reports** - Review HTML reports after runs
5. **Verify on Solscan** - Always check devnet state matches expectations

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        env:
          TEST_WALLET_PRIVATE_KEY: ${{ secrets.TEST_WALLET_PRIVATE_KEY }}
          TEST_WALLET_ADDRESS: ${{ secrets.TEST_WALLET_ADDRESS }}
          TEST_RPC_ENDPOINT: ${{ secrets.DEVNET_RPC_ENDPOINT }}
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Solana Devnet Faucet](https://faucet.solana.com/)
- [Solscan Devnet Explorer](https://solscan.io?cluster=devnet)
- [Meteora DLMM Docs](https://docs.meteora.ag/dlmm)

## Support

If you encounter issues:
1. Check this README
2. Review test output and screenshots
3. Verify devnet status (sometimes unstable)
4. Check Solscan for transaction details
5. Review Playwright traces in HTML report
