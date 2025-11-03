# DLMM Testing Guide - Final Version

## ✅ All Issues Fixed

1. ✅ Pool existence checks added
2. ✅ Balance validation improved
3. ✅ Error messages enhanced (3012, 3001, WalletSendTransactionError)
4. ✅ Seed amount validation fixed (handles both UI amounts and lamports)
5. ✅ SDK verified working correctly

---

## 💰 Your Current Setup

**Main Wallet:** `85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs`
- Balance: 18.68 SOL ✅

**Test Wallet:** `FdL16sUaKHS559QTKrFY2yDocpPTXUfJRd4RLv7XoxP9`
- Balance: 7.00 SOL ✅

**Your Token:** `EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa`
- Balance: 1,000,000,000 tokens ✅
- Explorer: https://solscan.io/token/EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa?cluster=devnet

**Your Pool:** `6Mso3VW2RfpzfD9K2H78Bq28qZugCEsB9DrccckZEuEJ`
- Status: Active ✅
- Explorer: https://explorer.solana.com/address/6Mso3VW2RfpzfD9K2H78Bq28qZugCEsB9DrccckZEuEJ?cluster=devnet

---

## 🧪 Test 1: Seed Liquidity (LFG Strategy)

**URL:** http://localhost:3000/dlmm/seed-lfg

### **Form Values** (copy-paste exactly):

```
Pool Address: (leave empty - auto-derives)

Base Token:
EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa

Quote Token (SOL):
So11111111111111111111111111111111111111112

Min Price (SOL per token):
0.001

Max Price (SOL per token):
0.01

Curvature:
0.6

Seed Amount (UI amount, in tokens):
50

Position Owner: (leave empty)
Fee Owner: (leave empty)
Lock Release Point: 0
```

### **Alternative: If you want to specify lamports directly:**

```
Seed Amount (in lamports):
50000000000
```

**Both will work now!** The validation automatically detects:
- Small numbers (like "50") → treats as UI amount → multiplies by 1e9
- Large numbers (like "50000000000") → treats as lamports → uses directly

### **Expected Result:**
- ✅ Pre-flight checks pass
- ✅ Phase 1: Position owner token prove
- ✅ Phase 2: Initialize bin arrays (2-3 bins for 0.001-0.01 range)
- ✅ Phase 3: Add liquidity
- ✅ Multiple transaction signatures
- ✅ Success toast with Solscan links

### **Cost:**
- ~0.3-0.4 SOL (mostly refundable rent)

---

## 🧪 Test 2: Seed Liquidity (Single Bin)

**URL:** http://localhost:3000/dlmm/seed-single-bin

### **Form Values:**

```
Pool Address: (leave empty)

Base Token:
EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa

Quote Token:
So11111111111111111111111111111111111111112

Price:
0.005

Price Rounding: Up

Seed Amount (UI amount):
25

Position Owner: (leave empty)
Fee Owner: (leave empty)
Lock Release Point: 0
```

### **Expected Result:**
- ✅ Pre-flight checks pass
- ✅ Single transaction
- ✅ Position created at exact price (0.005 SOL)
- ✅ Success toast

### **Cost:**
- ~0.04 SOL (mostly refundable rent)

---

## 🧪 Test 3: Set Pool Status

**URL:** http://localhost:3000/dlmm/set-status

### **Form Values:**

```
Pool Address:
6Mso3VW2RfpzfD9K2H78Bq28qZugCEsB9DrccckZEuEJ

Status: disabled
```

**Then test enabling:**
```
Status: enabled
```

### **Expected Result:**
- ✅ Pre-flight checks verify:
  - You have enough SOL (0.01 minimum)
  - Activation point has passed (if applicable)
  - You are the pool creator
- ✅ Pool status changes
- ✅ Success toast

### **Important:**
You MUST use the wallet that created this pool. If you created the pool with your main wallet (85hJ...), you must connect with that wallet to change status.

### **Cost:**
- ~0.006 SOL (non-refundable fees)

---

## ❌ Common Errors & Solutions

### **1. "Invalid Seed amount: Assertion failed"**
**Old behavior:** Tried to multiply already-lamports by 1e9 again
**Fixed:** Now auto-detects UI amounts vs lamports

**Solutions:**
- Use "50" for 50 tokens (UI amount)
- Use "50000000000" for 50 tokens in lamports
- Both work now!

### **2. "Pool does not exist"**
**Cause:** Wrong base/quote token addresses or order

**Solution:**
```
Base Token (your token): EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa
Quote Token (SOL):       So11111111111111111111111111111111111111112
```

Never reverse these!

### **3. "Insufficient funds (Error 3012)"**
**Cause:** Either not enough SOL OR price range too wide

**Solutions:**
1. Check SOL balance (need 0.5+ for LFG, 0.3+ for single bin)
2. Use narrower price range (0.001-0.01 instead of 1-3)
3. Fund wallet: `solana airdrop 1 [your-address] --url devnet`

### **4. "Only the pool creator can change pool status"**
**Cause:** Wrong wallet connected

**Solution:**
Connect with the same wallet that created the pool

### **5. "Pool not yet activated"**
**Cause:** Activation point in the future

**Solution:**
Wait until activation time passes (error now shows exact time remaining)

---

## 📊 Price Range Guide

**❌ Bad Ranges (Too Wide - causes Error 3012):**
- 1-3 SOL (requires dozens of bins!)
- 0.1-10 SOL (too many bins)
- 0.001-1 SOL (1000x range - too wide)

**✅ Good Ranges (Optimal):**
- 0.001-0.01 SOL (10x range) ← **RECOMMENDED**
- 0.01-0.1 SOL (10x range)
- 0.0001-0.001 SOL (10x range)

**Rule of Thumb:**
- Keep range within **10-20x multiplier**
- For new tokens, start with smaller ranges
- You can always add more liquidity later in different ranges

---

## 🎯 Testing Checklist

Before testing each operation:

- [ ] Wallet connected
- [ ] Network set to "devnet"
- [ ] Sufficient SOL balance (check in wallet)
- [ ] Have base tokens (if seeding liquidity)
- [ ] Using correct token addresses (EQ6P... for base, So11... for quote)
- [ ] Price range is realistic (0.001-0.01 recommended)
- [ ] Seed amount is valid (use "50" or "50000000000", both work)

---

## 📈 PNL Analytics

After seeding liquidity, check the Analytics page!

**URL:** http://localhost:3000/analytics

You already have a full PNL system built:
- Portfolio overview with total value & PNL
- Individual position cards
- APR calculations (daily, weekly, monthly, annualized)
- Impermanent loss tracking
- Health score for each position
- Fee earnings tracking

**What it needs:**
- Real-time price feeds (Jupiter API for mainnet, pool prices for devnet)
- See `PNL_ANALYTICS_GUIDE.md` for full details!

---

## 🚀 Ready to Test!

1. **Start with LFG seeding** using the values above
2. **Then try single bin** seeding
3. **Finally test pool status** toggle

All error messages are now super helpful and will guide you if anything goes wrong!

### **Example Success Flow:**

```
1. Go to /dlmm/seed-lfg
2. Paste token addresses:
   - Base: EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa
   - Quote: So11111111111111111111111111111111111111112
3. Set price range: 0.001 - 0.01
4. Set curvature: 0.6
5. Set seed amount: 50 (or 50000000000)
6. Click "Seed Liquidity"
7. Wait for 3 phases to complete
8. See success toast with transaction links!
9. Check Analytics page to see your position
```

---

## 💡 Pro Tips

1. **Start small:** Use small amounts first to test (5-10 tokens)
2. **Check explorer:** Always verify transactions on Solscan
3. **Monitor rent:** Most SOL is refundable when you close positions
4. **Track positions:** Analytics page shows all your active positions
5. **Price wisely:** Use realistic price ranges for new tokens
6. **Test sequentially:** Do one operation at a time, verify success before next

---

## 📝 Files to Reference

- **Testing Guide:** `DLMM_TESTING_GUIDE.md` (original guide)
- **PNL Analytics:** `PNL_ANALYTICS_GUIDE.md` (analytics implementation)
- **This Guide:** `TESTING_GUIDE_FINAL.md` (you are here!)

---

## 🎉 You're All Set!

Everything is fixed and ready to go:
- ✅ SDK verified working
- ✅ Pool exists and is active
- ✅ Error handling comprehensive
- ✅ Balance checks in place
- ✅ Seed amount validation fixed
- ✅ PNL analytics ready (needs price feeds)

**Just paste the values above and test!** 🚀
