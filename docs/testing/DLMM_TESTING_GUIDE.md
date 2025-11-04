# DLMM Testing Guide - Devnet

## ✅ SDK Verification Complete

The DLMM SDK is working correctly! We verified:
- Pool derivation works properly
- DLMM instances can be created
- The SDK can interact with on-chain pools

## 🔍 Your Existing Pool

You already have a pool created on devnet:

**Pool Address:** `CrywvNhbyYr1UXbqaizY29wJYBassUekDZBiUazekgAh`
**Base Token:** `Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW`
**Quote Token:** `So11111111111111111111111111111111111111112` (SOL)

**Explorer Links:**
- Pool: https://explorer.solana.com/address/CrywvNhbyYr1UXbqaizY29wJYBassUekDZBiUazekgAh?cluster=devnet
- Base Token: https://explorer.solana.com/address/Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW?cluster=devnet

---

## 🧪 Test Seed Liquidity (LFG) - Using Existing Pool

**URL:** http://localhost:3000/dlmm/seed-lfg

### Form Values (Copy-Paste These):

```
Pool Address: (leave empty - will auto-derive from base/quote tokens)

Base Token (Your Token):
Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW

Quote Token (SOL):
So11111111111111111111111111111111111111112

Min Price (SOL per token):
0.001

Max Price (SOL per token):
0.01

Curvature:
0.6

Seed Amount (in base token, with 9 decimals):
50000000000

Position Owner: (leave empty)
Fee Owner: (leave empty)
Lock Release Point: 0
```

**Expected Result:**
- Pre-flight checks pass (balance, token balance, pool exists)
- Phase 1: Position owner token prove ✅
- Phase 2: Initialize bin arrays ✅
- Phase 3: Add liquidity ✅

---

## 🧪 Test Seed Liquidity (Single Bin) - Using Existing Pool

**URL:** http://localhost:3000/dlmm/seed-single-bin

### Form Values:

```
Pool Address: (leave empty)

Base Token:
Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW

Quote Token:
So11111111111111111111111111111111111111112

Price:
0.005

Price Rounding: Up

Seed Amount:
25000000000

Position Owner: (leave empty)
Fee Owner: (leave empty)
Lock Release Point: 0
```

---

## 🧪 Test Set Pool Status

**URL:** http://localhost:3000/dlmm/set-status

### Form Values:

```
Pool Address:
CrywvNhbyYr1UXbqaizY29wJYBassUekDZBiUazekgAh

Status: disabled (then try enabled)
```

**IMPORTANT:** You must use the wallet that created this pool!

---

## ❌ Common Error: "LB Pair account not found"

This error means:
1. ✅ Pool doesn't exist (we verified your pool DOES exist)
2. ❌ **You entered wrong base/quote token addresses**
3. ❌ **Token order is reversed (base vs quote)**

### Solution:

Always use:
- **Base Token** (your custom token): `Cpx9izEccDKLkJZ3aMbEjkTxrC8z8A2WRjsKT9WYvLDW`
- **Quote Token** (SOL): `So11111111111111111111111111111111111111112`

The app will derive the correct pool address from these tokens.

---

## 💰 Current Balances

**Test Wallet:** FdL16sUaKHS559QTKrFY2yDocpPTXUfJRd4RLv7XoxP9
- Balance: 7.00 SOL

**Your Wallet:** 85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs
- Balance: 18.74 SOL

---

## 📝 Before Testing Checklist

1. ✅ Wallet connected in app
2. ✅ Network set to "devnet"
3. ✅ You have base tokens in your wallet (check balance)
4. ✅ You have at least 0.5 SOL for LFG or 0.3 SOL for single bin
5. ✅ You're using the correct base/quote token addresses (see above)

---

## 🎯 What to Expect

### If Balance is Insufficient:
```
You'll see a clear error BEFORE the transaction:
"Insufficient SOL balance. You have X SOL but need at least Y SOL for:
  • Bin array rent (~0.2-0.3 SOL)
  • Position rent (~0.02 SOL)
  • Transaction fees (~0.01 SOL)
  • Platform fees (0.0007 SOL)
  • Buffer (0.1 SOL)
Please fund your wallet with more SOL and try again."
```

### If Pool Doesn't Exist:
```
"Pool does not exist at address [pool address]

This usually means:
  • The pool was not created yet
  • You're using the wrong base/quote token pair
  • The pool address is incorrect

Solutions:
  1. Create the pool first using "Create Pool" page
  2. Verify the base and quote token addresses are correct
  3. Check that the pool exists on Solana Explorer"
```

### If Tokens are Insufficient:
```
"Insufficient base token balance. You have X tokens but need Y tokens to seed liquidity.
Please acquire more base tokens and try again."
```

### If Success:
```
✅ "LFG seeding complete!"
- Shows transaction signatures
- Shows Solscan/SolanaFM links
- Updates transaction history
```

---

## 🐛 Troubleshooting

### "Cannot read properties of undefined (reading 'baseMint')"
- You didn't fill in all required fields
- Check you entered both base and quote token addresses

### "Invalid public key"
- Token address is malformed
- Copy-paste the addresses exactly as shown above

### "Simulation failed"
- Network congestion - wait and retry
- Or insufficient funds

### "Transaction failed on-chain: Error 3012"
- Insufficient SOL (should now be caught in pre-flight checks)
- Solution: Add more SOL to your wallet

---

## ✅ Testing Strategy

1. **First**: Try LFG seeding with the values above
   - This will test the full multi-phase flow
   - Verify all 3 phases complete
   - Check transaction explorer links work

2. **Second**: Try single bin seeding
   - Should be faster (single transaction)
   - Verify transaction completes
   - Check position created

3. **Third**: Try setting pool status
   - Must use pool creator wallet
   - Test disable → enable cycle
   - Verify authorization checks work

4. **Finally**: Check analytics page
   - Should show your positions
   - Should calculate PNL
   - Should not refresh infinitely ✅ (we fixed this!)

---

## 📊 Expected Costs

**LFG Seeding (0.001-0.01 range):**
- ~0.3-0.4 SOL total (mostly refundable rent)

**Single Bin Seeding:**
- ~0.04 SOL total (mostly refundable rent)

**Set Pool Status:**
- ~0.006 SOL (non-refundable fees)

---

## 🎉 Ready to Test!

Copy the values above and paste them into the forms. The app will now give you clear error messages if anything is wrong!
