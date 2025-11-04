# Devnet Testing Guide

## Prerequisites

Before testing, ensure you have:

1. **Solana Wallet** (Phantom, Solflare, etc.) configured for devnet
2. **Devnet SOL** in your wallet (at least 2-3 SOL for testing)
   ```bash
   solana airdrop 2 --url devnet
   ```
3. **Dev server running** on http://localhost:3000
   ```bash
   npm run dev
   ```

## Configuration Setup

### Step 1: Add Your Fee Wallet

Edit `.env.local` and add your devnet wallet address:

```env
NEXT_PUBLIC_FEE_WALLET=YourDevnetWalletAddress123456789
```

⚠️ **Important:** Use a devnet wallet address, NOT mainnet!

### Step 2: Verify Configuration

Current settings in `.env.local`:
```env
NEXT_PUBLIC_ENABLE_FEES=true
NEXT_PUBLIC_FEE_WALLET=<your-wallet>
NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS=100000000  # 0.1 SOL
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Step 3: Restart Dev Server

After updating `.env.local`:
```bash
# Server will auto-reload, but if not:
# Ctrl+C to stop, then:
npm run dev
```

## Testing Phase 1: Basic Fee Collection & Analytics

### Test 1: Fee Disclosure Display

**Objective:** Verify FeeDisclosure component shows on forms

**Steps:**
1. Navigate to http://localhost:3000/dlmm/create-pool
2. ✅ Check that you see a fee disclosure card showing "0.1000 SOL"
3. ✅ Verify the card has orange/warning styling
4. ✅ Check other forms also show the disclosure:
   - `/dlmm/seed-lfg`
   - `/dlmm/seed-single`
   - `/damm-v2/create-balanced`
   - `/damm-v2/create-one-sided`
   - `/alpha-vault/create`

**Expected Result:** All forms display fee disclosure with 0.1 SOL amount

---

### Test 2: DLMM Pool Creation with Fee Collection

**Objective:** Create a test pool and verify fee is collected

**Steps:**

1. **Navigate to Create Pool**
   ```
   http://localhost:3000/dlmm/create-pool
   ```

2. **Connect Wallet**
   - Click "Connect Wallet" in header
   - Select your wallet (Phantom/Solflare)
   - Approve connection
   - ✅ Verify network switcher shows "devnet"

3. **Check Starting Balance**
   - Note your current SOL balance (e.g., 2.0000 SOL)

4. **Fill Out Form**

   **Token Creation:**
   - Token Name: `Test Token`
   - Token Symbol: `TEST`
   - Token URI: `https://example.com/metadata.json`
   - Token Decimals: `9`
   - Token Supply: `1000000000`

   **Pool Configuration:**
   - Quote Mint: `So11111111111111111111111111111111111111112` (SOL)
   - Bin Step: `25`
   - Fee (BPS): `1`
   - Initial Price: `0.0001`
   - Activation Type: `1`

5. **Submit Transaction**
   - Click "Create Pool" button
   - ✅ Verify fee disclosure is visible above submit button
   - Approve transaction in wallet
   - ✅ Wait for confirmation (30-60 seconds)

6. **Verify Fee Deduction**
   - Check new SOL balance
   - ✅ Confirm ~0.1 SOL was deducted (plus gas fees ~0.001 SOL)
   - Expected: `Old Balance - 0.101 ≈ New Balance`

7. **Check Fee Wallet**
   - Open Solscan: `https://solscan.io/account/<YOUR_FEE_WALLET>?cluster=devnet`
   - ✅ Verify 0.1 SOL was received
   - ✅ Check transaction shows transfer from your wallet

8. **Verify Success Toast**
   - ✅ See "Pool created successfully!" message
   - ✅ Click "View transaction on Solscan" link
   - ✅ Verify transaction on explorer

**Expected Result:**
- Pool created successfully
- 0.1 SOL fee collected to fee wallet
- Transaction visible on Solscan

---

### Test 3: Analytics Dashboard

**Objective:** Verify transaction appears in analytics with correct data

**Steps:**

1. **Navigate to Analytics**
   ```
   http://localhost:3000/analytics
   ```

2. **Check Summary Cards**
   - ✅ Total Launches shows `1`
   - ✅ Success Rate shows `100%`
   - ✅ Pools Created shows `1`
   - ✅ Fees Paid shows `0.10 SOL`

3. **Check Protocol Breakdown**
   - ✅ DLMM section shows count of `1`

4. **Check Transaction List**
   - ✅ See your transaction listed
   - ✅ Verify it shows:
     - Status: success (green badge)
     - Protocol: dlmm (purple badge)
     - Action: "dlmm create pool"
     - Time: "X seconds/minutes ago"
     - Pool address (truncated)
     - Platform Fee: 0.100 SOL

5. **Click Transaction to View Details**
   - Click the transaction card
   - ✅ Verify transaction details page loads
   - ✅ Check all fields are populated:
     - Signature
     - Network: devnet
     - Protocol: dlmm
     - Action: dlmm-create-pool
     - Wallet Address
     - Pool Address (full, with copy button)
     - Token Address (full, with copy button)
     - Platform Fee: 0.1000 SOL
     - Transaction Parameters (JSON)

6. **Test External Links**
   - ✅ Click "View on Solscan" → Opens Solscan in new tab
   - ✅ Click "View on Meteora" (if pool address present) → Opens Meteora

**Expected Result:** Analytics dashboard shows complete transaction data

---

### Test 4: Export/Import Functionality

**Objective:** Verify transaction data can be exported and imported

**Steps:**

1. **Export Data**
   - On analytics page, click "Export History" button
   - ✅ Verify JSON file downloads
   - ✅ Check filename format: `meteora-transactions-<wallet>-<date>.json`

2. **Verify Export Contents**
   - Open downloaded JSON file
   - ✅ Check structure:
     ```json
     {
       "version": "1.0.0",
       "exportDate": "2025-11-01T...",
       "walletAddress": "your-wallet",
       "transactions": [...]
     }
     ```
   - ✅ Verify your transaction is included with all fields

3. **Clear localStorage**
   - Open browser DevTools (F12)
   - Go to Application → Local Storage → http://localhost:3000
   - Delete `meteora-transactions` key
   - ✅ Refresh analytics page → should show "No transaction history"

4. **Import Data**
   - Click "Import History" (if available) or manually:
   - DevTools → Console → Run:
     ```javascript
     const data = /* paste your JSON here */;
     localStorage.setItem('meteora-transactions', JSON.stringify(data.transactions));
     location.reload();
     ```
   - ✅ Refresh page
   - ✅ Verify transactions are restored

**Expected Result:** Data exports and imports successfully

---

### Test 5: Multiple Transactions

**Objective:** Test analytics with multiple transactions

**Steps:**

1. Create 2-3 more pools using different configurations
2. ✅ Verify each transaction:
   - Fee is collected
   - Appears in analytics
   - Summary cards update correctly
   - Can filter/search transactions

3. **Test Filtering**
   - Filter by protocol → should show only that protocol
   - Filter by status → should show only that status
   - Search by signature → should find specific transaction
   - ✅ Verify "Clear Filters" button works

**Expected Result:** Multiple transactions tracked correctly with working filters

---

## Test Results Template

Copy this template to document your test results:

```markdown
# Devnet Testing Results - [Date]

## Test 1: Fee Disclosure Display
- [ ] Fee disclosure shows on all forms
- [ ] Amount displays correctly (0.1000 SOL)
- [ ] Styling is correct (warning colors)
- **Notes:**

## Test 2: Pool Creation with Fee
- [ ] Transaction submitted successfully
- [ ] Fee deducted from wallet (~0.1 SOL)
- [ ] Fee received in fee wallet
- [ ] Pool created on-chain
- **Transaction Signature:**
- **Pool Address:**
- **Notes:**

## Test 3: Analytics Dashboard
- [ ] Summary cards show correct counts
- [ ] Transaction appears in list
- [ ] Transaction details page works
- [ ] External links work (Solscan, Meteora)
- **Notes:**

## Test 4: Export/Import
- [ ] Export creates valid JSON file
- [ ] Data can be cleared from localStorage
- [ ] Import restores transactions
- **Notes:**

## Test 5: Multiple Transactions
- [ ] All transactions tracked
- [ ] Analytics updates correctly
- [ ] Filters work properly
- **Total Transactions Created:**
- **Total Fees Paid:**
- **Notes:**

## Issues Found
1.
2.
3.

## Screenshots
- Analytics Dashboard:
- Transaction Details:
- Fee Disclosure:

## Summary
- **Status:** ✅ PASS / ❌ FAIL
- **Tested By:**
- **Date:**
- **Environment:** Devnet
- **Wallet Used:**
```

---

## Common Issues & Solutions

### Issue: "Fee wallet address required"
**Solution:** Add your wallet address to `NEXT_PUBLIC_FEE_WALLET` in `.env.local`

### Issue: Fee disclosure doesn't appear
**Solution:**
- Check `NEXT_PUBLIC_ENABLE_FEES=true` in `.env.local`
- Restart dev server

### Issue: Transaction not appearing in analytics
**Solution:**
- Check console for errors
- Verify localStorage has `meteora-transactions` key
- Ensure wallet address matches connected wallet

### Issue: "Insufficient funds" error
**Solution:** Get more devnet SOL:
```bash
solana airdrop 2 --url devnet
```

### Issue: Transaction fails
**Solution:**
- Check you have enough SOL (need >0.1 + gas)
- Verify all form fields are filled correctly
- Check browser console for errors
- Try with higher compute budget

---

## Next Steps After Testing

Once Phase 1 testing is complete and successful:

1. ✅ Document test results
2. ✅ Take screenshots for reference
3. ✅ Note any issues or improvements needed
4. → Proceed to **Phase 2: Advanced Fee System**
   - 3-way fee split (referral/buyback/treasury)
   - Referral code system
   - Enhanced analytics

---

## Quick Test Checklist

- [ ] `.env.local` configured with fee wallet
- [ ] Dev server running
- [ ] Wallet connected to devnet
- [ ] Wallet has SOL (2+ SOL)
- [ ] Fee disclosure visible on forms
- [ ] Can create pool successfully
- [ ] Fee is collected to fee wallet
- [ ] Transaction appears in analytics
- [ ] Transaction details page works
- [ ] Export/import functionality works
- [ ] Filters and search work
- [ ] All external links work

**Ready to proceed to Phase 2:** ✅ / ❌

---

**Last Updated:** 2025-11-01
**Next Phase:** Advanced Fee Distribution & Referral System
