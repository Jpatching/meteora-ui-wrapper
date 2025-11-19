# Create Test Pool - UI Method (Recommended)

## Quick Setup (5 minutes)

### Step 1: Start the Dev Server

```bash
npm run dev
```

Open: `http://localhost:3000`

### Step 2: Create DLMM Pool via UI

1. Navigate to: `http://localhost:3000/dlmm/create-pool`

2. Connect your wallet (make sure you're on devnet)

3. Use these **SAFE** settings:

```
Base Token: [Your token or create new]
Quote Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC devnet)

Bin Step: 25 (0.25%)  ← IMPORTANT: Wider steps = safer
Initial Price: 1.0
Activation Type: Instant
Base Fee: 0.1%
```

4. Click "Create Pool"

5. Approve transaction in wallet

6. **Copy the pool address** from the success message

### Step 3: Test Add Liquidity

1. Navigate to: `http://localhost:3000/pool/[POOL_ADDRESS]`

2. Click "Add Liquidity" tab

3. You'll see the **new safety features**:

```
Strategy: [Spot] [Bid-Ask] [Curve]
  ↓
Price Range: 1.0 to 1.025
  ↓
Range Size: 10 / 20 bins [=======     ] 🟢
✓ Safe range - transaction should succeed
```

4. Select "Spot" strategy (10 bins - safest)

5. Enter amount: 10-50 tokens

6. Click "Add Liquidity"

7. Approve in wallet

8. **Success!** ✅

---

## What to Test

### ✅ Safe Range (Should Work)

- Select "Spot" → 10 bins → 🟢 Green
- Submit → Should succeed

### ⚠️ Warning Range (Should Work with Warning)

- Select "Curve" → 20 bins → 🟡 Yellow
- See warning message
- Submit → Should still work

### ❌ Blocked Range (Should Prevent Submission)

- Manually adjust to price 1.0 → 2.0
- See indicator: >20 bins → 🔴 Red
- See error: "Range too wide!"
- Submit → Should be **blocked**

---

## Why This Works

### The Problem (Before)
- Users could select ranges with 50-100 bins
- Wide ranges create large position accounts
- Large accounts exceed Solana's 10KB realloc limit
- Result: `InvalidRealloc` error ❌

### The Solution (Now)
- **20 bin hard limit** enforced in UI
- **Visual feedback** shows safety status in real-time
- **Validation blocking** prevents unsafe submissions
- **Smart presets** auto-set safe ranges

---

## Troubleshooting

**Q: I don't have test tokens**

A: Click "Need test tokens?" on the pool page to use the devnet faucet

**Q: Insufficient SOL**

A: Run: `solana airdrop 2 --url devnet`

**Q: Can't see pool**

A: Make sure:
- Wallet is connected to devnet
- Pool address is correct
- RPC is responding (try refreshing)

**Q: Transaction still fails**

A: Check:
- Range is <20 bins (see safety indicator)
- You have enough tokens
- You have ~0.1 SOL for gas

---

## Alternative: Use Existing Pool

If you have an existing DLMM pool on devnet, just navigate to:

```
http://localhost:3000/pool/[YOUR_POOL_ADDRESS]
```

The safety features work with any pool!

---

## Success Criteria

You've successfully tested when:

✅ Pool loads correctly
✅ Safety indicator shows real-time feedback
✅ Strategy presets adjust range automatically
✅ Manual adjustment updates indicator
✅ Ranges >20 bins show error and are blocked
✅ Ranges ≤20 bins allow submission
✅ Transaction succeeds with safe range
✅ Bins populate in the chart after adding liquidity

---

## Next: Full Testing

See `TESTING_GUIDE.md` for comprehensive testing checklist and edge cases.

---

## Commands Reference

```bash
# Start UI
npm run dev

# Check Solana config
solana config get

# Switch to devnet
solana config set --url devnet

# Get SOL airdrop
solana airdrop 2 --url devnet

# Check balance
solana balance --url devnet
```

That's it! Much simpler than scripting. 🚀
