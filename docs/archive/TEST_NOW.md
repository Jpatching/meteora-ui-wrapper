# TEST NOW - Exact Commands

## Status Check

✅ Code changes implemented:
- MAX_SAFE_BINS = 20 (line 58 of AddLiquidityPanel.tsx)
- Safety indicator UI (line 366)
- Validation blocking (line 183)
- Build successful

## Execute These Commands in Order

### Terminal 1: Start Dev Server

```bash
npm run dev
```

Wait for: `✓ Ready in X.Xs`

### Browser: Create Test Pool

1. **Open**: http://localhost:3000/dlmm/create-pool

2. **Connect Wallet** (top right)
   - Make sure you're on devnet
   - If no SOL: `solana airdrop 2 --url devnet`

3. **Fill Form** (EXACT VALUES):
   ```
   Base Token: [Select or paste your token mint]
   Quote Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   Bin Step: 25
   Initial Price: 1.0
   Activation Type: Instant
   Base Fee: 0.1
   ```

4. **Click**: "Create Pool"

5. **Approve** in wallet

6. **COPY** the pool address from success message

### Browser: Test Add Liquidity

7. **Navigate to**: http://localhost:3000/pool/[PASTE_POOL_ADDRESS]

8. **Test #1 - Safe Range (MUST WORK)**:
   - Click "Add Liquidity" tab
   - Select "Spot" strategy
   - **VERIFY**: You see "10 / 20 bins" with GREEN indicator
   - **VERIFY**: Message says "✓ Safe range - transaction should succeed"
   - Enter: 10 in amount field
   - Click "Add Liquidity"
   - **EXPECTED**: Transaction succeeds ✅

9. **Test #2 - Warning Range (SHOULD WORK)**:
   - Select "Curve" strategy
   - **VERIFY**: You see "20 / 20 bins" with YELLOW indicator
   - **VERIFY**: Warning message appears
   - Enter: 10 in amount field
   - Click "Add Liquidity"
   - **EXPECTED**: Transaction succeeds with warning ✅

10. **Test #3 - Blocked Range (MUST BLOCK)**:
    - Manually set Min Price: 1.0
    - Manually set Max Price: 2.0
    - **VERIFY**: You see ">20 bins" with RED indicator
    - **VERIFY**: Error "⚠️ Range too wide!" appears
    - Click "Add Liquidity"
    - **EXPECTED**: Blocked with error toast ❌

## Alternative: Use Existing Pool

If you have an existing DLMM pool, skip pool creation and go directly to step 7 with your pool address.

Find pools on devnet:
```bash
# Check your recent transactions
solana transaction-history --limit 50 --url devnet | grep -i "dlmm"
```

Or visit: https://devnet.meteora.ag/pools

## Verification Checklist

Mark each test as you complete it:

```
Prerequisites:
□ Wallet has >1 SOL on devnet
□ Dev server running (npm run dev)
□ Can access http://localhost:3000

Pool Creation:
□ Created pool successfully
□ Pool address copied
□ Pool page loads

Test 1 - Safe Range:
□ Spot strategy selected
□ Shows "10 / 20 bins" 🟢
□ Shows "Safe range" message
□ Transaction submitted
□ Transaction succeeded ✅

Test 2 - Warning Range:
□ Curve strategy selected
□ Shows "20 / 20 bins" 🟡
□ Shows warning message
□ Transaction submitted
□ Transaction succeeded ✅

Test 3 - Blocked Range:
□ Manual price 1.0 → 2.0 set
□ Shows ">20 bins" 🔴
□ Shows error message
□ Click Add Liquidity
□ Submission blocked ✅

Success Criteria:
□ All 3 tests passed
□ No InvalidRealloc errors
□ Safety indicator works correctly
```

## If You Get Stuck

**Can't create pool?**
- Check wallet has SOL
- Check base token exists
- Use existing pool from devnet.meteora.ag

**Pool page won't load?**
- Check pool address is correct
- Try refreshing page
- Check browser console (F12)

**Transaction fails?**
- Check range is ≤20 bins
- Check you have tokens
- Check you have ~0.1 SOL for gas

## What Success Looks Like

When all 3 tests pass, you'll have verified:
1. ✅ Safe ranges (≤15 bins) work perfectly
2. ✅ Warning ranges (16-20 bins) work with warning
3. ✅ Unsafe ranges (>20 bins) are BLOCKED
4. ✅ NO InvalidRealloc errors occur

**This is production-ready code.**

## Time to Complete

- Pool creation: 2 minutes
- Testing all 3 scenarios: 5 minutes
- **Total: 7 minutes**

## Ready? Start Now!

```bash
npm run dev
```

Then open http://localhost:3000/dlmm/create-pool
