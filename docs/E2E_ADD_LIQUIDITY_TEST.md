# End-to-End Add Liquidity Test

This guide walks through testing the complete add liquidity flow using your Solana keypair.

## Prerequisites

### 1. Solana Keypair
Ensure you have a keypair at `~/.config/solana/id.json`:
```bash
# Check if you have a keypair
ls -la ~/.config/solana/id.json

# If not, create one
solana-keygen new --outfile ~/.config/solana/id.json
```

### 2. Devnet SOL
You need at least 0.5 SOL on devnet:
```bash
# Check your address
solana address

# Airdrop devnet SOL (run 2-3 times)
solana airdrop 2 --url devnet
solana airdrop 2 --url devnet

# Check balance
solana balance --url devnet
```

### 3. Test Pool
You need a DLMM pool on devnet. Either:

**Option A: Create a new pool**
```bash
cd backend
npm run seed-devnet
```

**Option B: Use existing pool**
If you already have a pool address, export it:
```bash
export TEST_POOL_ADDRESS=<your-pool-address>
```

## Running the Test

### Step 1: Check for Available Pools
```bash
npm run test:find-pools
```

This will search for known devnet DLMM pools.

### Step 2: Run Add Liquidity Test
```bash
# Set pool address (if you have one)
export TEST_POOL_ADDRESS=<pool-address>

# Run the test
npm run test:add-liquidity
```

## What the Test Does

The test script (`scripts/test-add-liquidity-e2e.ts`) performs:

1. ✅ **Loads keypair** from `~/.config/solana/id.json`
2. ✅ **Connects to devnet** and checks SOL balance
3. ✅ **Loads DLMM pool** using Meteora SDK
4. ✅ **Fetches pool state** (tokens, bin step, active bin)
5. ✅ **Calculates price range** (±5 bins around active)
6. ✅ **Prepares liquidity amounts** (0.1 SOL, single-sided)
7. ✅ **Builds transaction** using SDK's `initializePositionAndAddLiquidityByStrategy()`
8. ✅ **Simulates transaction** to check for errors
9. ✅ **Sends transaction** to devnet (waits 5 seconds for confirmation)
10. ✅ **Confirms transaction** on-chain
11. ✅ **Verifies position** was created successfully

## Expected Output

```bash
🧪 E2E Test: Add Liquidity to DLMM Pool

════════════════════════════════════════════════════════════

📝 Step 1: Loading keypair...
✅ Wallet: <your-wallet-address>

🌐 Step 2: Connecting to devnet...
✅ Connected! Balance: 2.5000 SOL

🏊 Step 3: Loading DLMM pool...
Pool Address: <pool-address>
✅ Pool loaded successfully!

📊 Step 4: Fetching pool data...
  Token X: So11111111111111111111111111111111111111112
  Token Y: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
  Bin Step: 25 basis points
  Active Bin ID: 12345

🎯 Step 5: Calculating price range...
  Min Bin ID: 12340
  Max Bin ID: 12350
  Range: 11 bins

💰 Step 6: Preparing liquidity amounts...
  Token X Amount: 100000000 (0.1 SOL)
  Token Y Amount: 0 (0 USDC)
  Strategy: Spot

🔨 Step 7: Building transaction...
  Using SDK method: initializePositionAndAddLiquidityByStrategy()
✅ Transaction built successfully!
  Position Pubkey: <position-address>
  Transaction size: 1234 bytes

🧪 Step 8: Simulating transaction...
✅ Simulation successful!
  Compute units used: 150000

📤 Step 9: Sending transaction...
  ⚠️  This will cost real devnet SOL and create an on-chain transaction
  Press Ctrl+C to cancel, or wait 5 seconds to proceed...
✅ Transaction sent!
  Signature: <tx-signature>
  Explorer: https://explorer.solana.com/tx/<tx-signature>?cluster=devnet

⏳ Step 10: Confirming transaction...
✅ Transaction confirmed!

🔍 Step 11: Verifying position...
✅ Verification complete!
  User positions: 1

📊 Latest Position Details:
  Address: <position-address>
  Owner: <your-wallet-address>
  Active Bins: 11

════════════════════════════════════════════════════════════
✅ TEST COMPLETE!
════════════════════════════════════════════════════════════

📝 Summary:
  Pool: <pool-address>
  Transaction: <tx-signature>
  Strategy: Spot
  Amount: 0.1 SOL
  Bin Range: 12340 to 12350

🔗 View on Explorer:
  https://explorer.solana.com/tx/<tx-signature>?cluster=devnet

✨ Next steps:
  1. Check the transaction on Solana Explorer
  2. Verify liquidity was added to the pool
  3. Test the UI at http://localhost:3000/pool/<pool-address>
```

## Verification Checklist

After running the test, verify:

### ✅ On-Chain Verification
- [ ] Transaction confirmed on Solana Explorer
- [ ] Position account created
- [ ] Token accounts debited correctly
- [ ] Liquidity added to pool bins
- [ ] No duplicate instruction errors
- [ ] Compute units within budget

### ✅ UI Verification
1. Start frontend: `npm run dev`
2. Navigate to pool page: `http://localhost:3000/pool/<pool-address>`
3. Check:
   - [ ] Pool data loads correctly
   - [ ] Liquidity distribution shows your position
   - [ ] User positions panel displays your position
   - [ ] Chart shows liquidity bars in correct bins
   - [ ] Position details match transaction

### ✅ Transaction Details
Check the transaction on Explorer for:
- [ ] No errors in logs
- [ ] All instructions executed successfully
- [ ] Correct token transfers
- [ ] Position account initialized
- [ ] Liquidity distributed across bins

## Troubleshooting

### Error: "Insufficient SOL balance"
```bash
solana airdrop 2 --url devnet
```

### Error: "No TEST_POOL_ADDRESS provided"
```bash
# Create a pool first
cd backend && npm run seed-devnet

# Or use an existing pool
export TEST_POOL_ADDRESS=<pool-address>
```

### Error: "Failed to load pool"
- Check pool address is correct
- Verify pool exists on devnet
- Ensure you're using `--url devnet`

### Error: "Transaction contains duplicate instruction"
This indicates a bug in the SDK call. Check:
- Are you calling `initializePositionAndAddLiquidityByStrategy` multiple times?
- Are token accounts already created?
- Are compute budget instructions duplicated?

### Error: "Simulation failed"
Check the simulation logs for details:
- Insufficient token balance?
- Invalid bin range?
- Pool state changed?

## Customizing the Test

Edit `scripts/test-add-liquidity-e2e.ts` to customize:

```typescript
// Test parameters
const TEST_AMOUNT_SOL = 0.5; // Increase amount
const TEST_AMOUNT_USDC = 100; // Add USDC (dual-sided)
const STRATEGY: StrategyType = 'Curve'; // Change strategy

// Price range
const minBinId = activeBinId - 20; // Wider range
const maxBinId = activeBinId + 20;
```

## Next Steps

Once the test passes:
1. ✅ Test UI interactions at `http://localhost:3000/pool/<pool-address>`
2. ✅ Test removing liquidity
3. ✅ Test claiming fees
4. ✅ Test adjusting price ranges
5. ✅ Test different strategies (Spot, Curve, BidAsk)

## References

- [Meteora DLMM SDK Docs](https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions)
- [Add Liquidity Guide](https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/add-liquidity)
- [Position Management](https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/position-management)
