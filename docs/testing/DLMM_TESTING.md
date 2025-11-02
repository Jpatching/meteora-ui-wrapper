# DLMM Testing Guide

**Date**: October 31, 2025
**Status**: All 4 DLMM Functions Implemented ✅

This guide provides step-by-step instructions for testing all DLMM functions on Solana devnet.

---

## 🛠️ Prerequisites

Before testing, ensure you have:

1. **Wallet Extension Installed**
   - Phantom, Solflare, or another Solana wallet
   - Available at: https://phantom.app or https://solflare.com

2. **Devnet SOL**
   - Switch network to "Devnet" in the UI (top navigation)
   - Use the Settings → Airdrop feature to get test SOL
   - OR visit: https://faucet.solana.com

3. **Development Server Running**
   ```bash
   cd /home/jp/projects/meteora-invent/meteora-ui-wrapper
   pnpm run dev
   ```
   - Access at: http://localhost:3000

4. **Browser Console Open** (for viewing transaction details)
   - Chrome/Brave: F12 → Console tab
   - Firefox: F12 → Console tab

---

## 📋 Test Case 1: Create Pool with New Token

**Objective**: Create a DLMM pool with a brand new SPL token

### Steps:

1. **Navigate to Create Pool Page**
   - Go to: http://localhost:3000/dlmm/create-pool
   - Connect your wallet (click "Connect Wallet" in header)
   - Ensure network is set to "Devnet"

2. **Fill Out the Form**
   ```
   Token Creation:
   ✅ Select "Create New Token"

   Token Metadata:
   - Token Name: "Test Token"
   - Token Symbol: "TEST"
   - Token URI: "https://example.com/metadata.json"
   - Decimals: 9
   - Initial Supply: 1000000

   Pool Configuration:
   - Quote Mint: So11111111111111111111111111111111111111112 (SOL)
   - Bin Step: 25
   - Fee (bps): 1
   - Initial Price: 1.0
   - Activation Type: Slot (1)
   - Has Alpha Vault: No
   ```

3. **Submit Transaction**
   - Click "Create Pool" button
   - Approve transaction in wallet (may take 10-20 seconds)
   - Wait for confirmation toast

4. **Verify Success**
   - Check console for:
     - "Token created: [MINT_ADDRESS]"
     - "Pool created! [POOL_ADDRESS]"
     - Transaction signatures
   - Note down the **baseMint** and **poolAddress** for later tests

5. **Verify on Solscan** (Optional)
   - Go to: https://solscan.io/token/[MINT_ADDRESS]?cluster=devnet
   - Verify token metadata shows correctly
   - Check pool exists at https://solscan.io/account/[POOL_ADDRESS]?cluster=devnet

---

## 📋 Test Case 2: Create Pool with Existing Token

**Objective**: Create a DLMM pool using an existing token

### Steps:

1. **Use Token from Test Case 1** OR **Use Devnet USDC**
   ```
   Devnet USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
   ```

2. **Fill Out the Form**
   ```
   Token Creation:
   ✅ Select "Use Existing Token"

   Pool Configuration:
   - Base Mint: [MINT_ADDRESS_FROM_TEST_1]
   - Quote Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (USDC)
   - Bin Step: 50
   - Fee (bps): 5
   - Initial Price: 0.5
   ```

3. **Submit and Verify**
   - Same verification steps as Test Case 1
   - Should succeed faster (no token creation)

---

## 📋 Test Case 3: Seed Liquidity (Single Bin)

**Objective**: Add liquidity at a specific price point

### Prerequisites:
- Pool created from Test Case 1 or 2
- You own tokens of the baseMint

### Steps:

1. **Navigate to Seed Single Bin**
   - Go to: http://localhost:3000/dlmm/seed-single

2. **Fill Out the Form**
   ```
   Token Pair:
   - Base Token Mint: [YOUR_BASE_MINT]
   - Quote Token: So11111111111111111111111111111111111111112 (SOL)

   Price Configuration:
   - Price: 1.0
   - Price Rounding: up

   Liquidity Configuration:
   - Seed Amount: 100
   - Position Owner: [YOUR_WALLET_ADDRESS]
   - Fee Owner: [YOUR_WALLET_ADDRESS]
   - Lock Release Point: 0 (no lock)
   ```

3. **Submit Transaction**
   - Click "Seed Liquidity"
   - Approve transaction in wallet
   - Wait for confirmation (should be fast, ~5 seconds)

4. **Verify Success**
   - Console shows:
     - "Pool address: [POOL_ADDRESS]"
     - "Single bin seeding complete: [SIGNATURE]"
   - Check transaction on Solscan

---

## 📋 Test Case 4: Seed Liquidity (LFG Strategy)

**Objective**: Add liquidity across a price range with curve distribution

### Prerequisites:
- Pool created from Test Case 1 or 2
- You own tokens of the baseMint
- **Note**: This will execute multiple transactions (2-10+)

### Steps:

1. **Navigate to Seed LFG**
   - Go to: http://localhost:3000/dlmm/seed-lfg

2. **Fill Out the Form**
   ```
   Token Pair:
   - Base Token Mint: [YOUR_BASE_MINT]
   - Quote Token: So11111111111111111111111111111111111111112 (SOL)

   Price Range:
   - Min Price: 0.5
   - Max Price: 2.0
   - Curvature: 0.6 (concentration level)

   Liquidity Configuration:
   - Seed Amount: 500
   - Position Owner: [YOUR_WALLET_ADDRESS]
   - Fee Owner: [YOUR_WALLET_ADDRESS]
   - Lock Release Point: 0 (no lock)
   ```

3. **Submit Transaction**
   - Click "Seed Liquidity"
   - **Important**: You'll need to approve MULTIPLE transactions
   - Watch the console for progress:
     - Phase 1: Position owner token prove (optional)
     - Phase 2: Initialize bin arrays (parallel)
     - Phase 3: Add liquidity (sequential)

4. **Verify Success**
   - Console shows:
     - "LFG Seeding complete!"
     - "Pool address: [POOL_ADDRESS]"
     - Array of signatures
   - Toast shows: "Liquidity seeded successfully! X transaction(s) confirmed"

5. **Common Issues**
   - If a transaction fails mid-way, some bins may be initialized
   - Check console for which phase failed
   - You may need to retry with adjusted parameters

---

## 📋 Test Case 5: Set Pool Status

**Objective**: Enable or disable trading on a pool you created

### Prerequisites:
- Pool created from Test Case 1 or 2
- **You must be the pool creator** (same wallet that created it)

### Steps:

1. **Navigate to Set Pool Status**
   - Go to: http://localhost:3000/dlmm/set-status

2. **Fill Out the Form**
   ```
   Pool Configuration:
   - Pool Address: [POOL_ADDRESS_FROM_TEST_1]
   - Status: disabled (to test disabling)
   ```

3. **Submit Transaction**
   - Click "Set Pool Status"
   - Approve transaction in wallet
   - Wait for confirmation

4. **Verify Success**
   - Console shows:
     - "Pool status updated: disabled"
     - Transaction signature
   - Toast: "Pool disabled successfully!"

5. **Re-enable the Pool**
   - Change Status to "enabled"
   - Submit again
   - Verify pool is re-enabled

6. **Test Error Handling**
   - Try changing status on a pool you didn't create
   - Should see error: "Only the pool creator can change pool status"

---

## 🔍 Verification Checklist

After completing all tests, verify:

### Function-Level Checks

- [ ] **createPool (with new token)**
  - ✅ Token created with correct metadata
  - ✅ Pool created successfully
  - ✅ baseMint and poolAddress returned
  - ✅ Transaction confirmed on Solscan

- [ ] **createPool (with existing token)**
  - ✅ Pool created using existing mint
  - ✅ No token creation transaction
  - ✅ Faster execution than new token flow

- [ ] **seedLiquiditySingleBin**
  - ✅ Liquidity added at specific price
  - ✅ Single transaction executed
  - ✅ Position visible on chain

- [ ] **seedLiquidityLFG**
  - ✅ Multiple transactions executed
  - ✅ All phases complete successfully
  - ✅ Liquidity distributed across price range
  - ✅ All signatures logged

- [ ] **setPoolStatus**
  - ✅ Pool status changed successfully
  - ✅ Creator permission checked
  - ✅ Error shown for non-creators

### Error Handling Checks

- [ ] **Wallet Not Connected**
  - Try submitting without wallet → See "Wallet not connected" error

- [ ] **Invalid Public Keys**
  - Enter invalid address → See clear validation error

- [ ] **Negative/Invalid Numbers**
  - Enter negative seed amount → See validation error
  - Enter invalid price → See validation error

- [ ] **Missing Required Fields**
  - Leave required fields empty → See "field is required" error

---

## 🐛 Common Issues & Solutions

### Issue: "Insufficient SOL for transaction"
**Solution**: Request more devnet SOL from faucet or Settings → Airdrop

### Issue: "Account not found" when seeding liquidity
**Solution**: Pool may not exist. Verify pool address is correct and pool was created successfully.

### Issue: "Only pool creator can change status"
**Solution**: You're not the creator of this pool. Use a pool you created, or create a new one.

### Issue: LFG seeding fails on Phase 2
**Solution**:
- Reduce the price range (minPrice-maxPrice)
- Reduce seed amount
- Ensure you have enough tokens

### Issue: Transaction timeouts
**Solution**:
- Devnet can be slow. Wait longer.
- Refresh page and try again.
- Check Solana status: https://status.solana.com

---

## 📊 Expected Results Summary

| Function | Transactions | Time (devnet) | Success Criteria |
|----------|--------------|---------------|------------------|
| Create Pool (new token) | 2 | 15-30 sec | Token + Pool created |
| Create Pool (existing) | 1 | 5-15 sec | Pool created |
| Seed Single Bin | 1 | 5-10 sec | Position created |
| Seed LFG | 2-15 | 30-120 sec | Multiple positions |
| Set Pool Status | 1 | 5-10 sec | Status changed |

---

## 🎯 Success Criteria

**ALL functions working when:**

✅ All 5 test cases pass without errors
✅ Transactions confirmed on Solscan
✅ Console logs show expected output
✅ Error messages are clear and helpful
✅ No TypeScript compilation errors
✅ No runtime errors in browser console

---

## 📝 Reporting Issues

If you encounter issues during testing, provide:

1. **Function name** (e.g., "seedLiquidityLFG")
2. **Form data** you submitted
3. **Error message** from toast notification
4. **Console output** (copy full error stack)
5. **Transaction signature** (if transaction was sent)
6. **Network** (devnet/mainnet/localnet)

---

## 🚀 Next Steps After Testing

Once all functions work on devnet:

1. **Code Review** - Review the implemented code
2. **Write Unit Tests** - Add Jest/Vitest tests
3. **Test on Mainnet** - Use SMALL amounts first!
4. **Document Edge Cases** - Update this guide with any new findings
5. **Implement Remaining Protocols** - Apply same patterns to DAMM, DBC, etc.

---

**Testing Date**: __________
**Tester**: __________
**Results**: __________

---

**Happy Testing!** 🎉

If all tests pass, you have a fully functional DLMM integration using the official Meteora SDK!
