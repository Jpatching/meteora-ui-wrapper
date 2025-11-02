# Complete Form Testing Checklist

## Overview

**Total Forms:** 25 protocol forms + 2 settings pages
**Fee Wallet:** `2eAbDjukYeWWcqwavW1rd7Ue5FgEqqwtqEWJoCajGLyW7xt2VbnUmBEx1eLYTW15XZ3RmeFbSLkezLUdTkz81PLu`
**Network:** Devnet
**Platform Fee:** 0.1 SOL (100,000,000 lamports)

---

## Pre-Testing Setup

### 1. Environment Configuration

✅ Verify `.env.local`:
```env
NEXT_PUBLIC_ENABLE_FEES=true
NEXT_PUBLIC_FEE_WALLET=2eAbDjukYeWWcqwavW1rd7Ue5FgEqqwtqEWJoCajGLyW7xt2VbnUmBEx1eLYTW15XZ3RmeFbSLkezLUdTkz81PLu
NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS=100000000
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REFERRALS=false
```

### 2. Wallet Setup

- [ ] Wallet connected to devnet
- [ ] Wallet has sufficient SOL (minimum 5 SOL recommended)
- [ ] Network switcher shows "devnet"
- [ ] Fee wallet address is correct

### 3. Dev Server

- [ ] Server running on http://localhost:3000
- [ ] No compilation errors in terminal
- [ ] All pages load without errors

---

## Testing Template

For each form, verify:

1. **Page Loads:**
   - [ ] Page renders without errors
   - [ ] Sidebar highlights correct item
   - [ ] Form fields display correctly

2. **Fee Disclosure:**
   - [ ] FeeDisclosure component visible
   - [ ] Shows "0.1000 SOL" fee
   - [ ] Has orange/warning styling

3. **Form Validation:**
   - [ ] Required fields marked
   - [ ] Helper text displays
   - [ ] Invalid inputs show errors

4. **Transaction:**
   - [ ] Can submit transaction
   - [ ] Wallet popup appears
   - [ ] Transaction confirms
   - [ ] Success toast appears

5. **Fee Collection:**
   - [ ] Fee deducted from wallet (~0.1 SOL)
   - [ ] Fee received in fee wallet
   - [ ] Transaction visible on Solscan

6. **Analytics:**
   - [ ] Transaction appears in analytics
   - [ ] All metadata correct
   - [ ] Transaction details page works

---

## DLMM Protocol (4 Forms)

### 1. DLMM Create Pool (`/dlmm/create-pool`)

**Status:** 🟢 **Has FeeDisclosure** | ✅ **SDK Integrated**

**Test Data:**
```
Token Name: Test Token DLMM
Token Symbol: TDLMM
Token URI: https://example.com/metadata.json
Token Decimals: 9
Token Supply: 1000000000
Quote Mint: So11111111111111111111111111111111111111112
Bin Step: 25
Fee (BPS): 1
Initial Price: 0.0001
Activation Type: 1
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can create token + pool
- [ ] Fee collected (0.1 SOL)
- [ ] Pool address returned
- [ ] Token address returned
- [ ] Transaction in analytics
- [ ] Solscan link works

**Expected Fees:** ~0.1 SOL platform + ~0.005 SOL gas
**Expected Output:** Pool address, Token address

---

### 2. DLMM Seed Liquidity (LFG) (`/dlmm/seed-lfg`)

**Status:** 🟢 **Has FeeDisclosure** | ⚠️ **SDK Not Fully Integrated**

**Prerequisites:** Existing DLMM pool

**Test Data:**
```
Pool Address: [from previous test]
Base Mint: [token from previous test]
Quote Mint: So11111111111111111111111111111111111111112
Min Price: 0.0001
Max Price: 0.001
Curvature: 0.5
Seed Amount: 1000000000
Position Owner: [your wallet]
Fee Owner: [your wallet]
Lock Release Point: 0
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can seed liquidity
- [ ] Fee collected (0.1 SOL)
- [ ] Position created
- [ ] Transaction in analytics

**Expected Fees:** ~0.1 SOL platform + ~0.01 SOL gas
**Note:** May need to add transaction tracking to SDK hook

---

### 3. DLMM Seed Liquidity (Single) (`/dlmm/seed-single`)

**Status:** 🟢 **Has FeeDisclosure** | ⚠️ **SDK Not Fully Integrated**

**Prerequisites:** Existing DLMM pool

**Test Data:**
```
Pool Address: [from create pool test]
Base Mint: [token from create pool]
Quote Mint: So11111111111111111111111111111111111111112
Active Bin: 100
Amount: 1000000000
Bin Range: 10
Position Owner: [your wallet]
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can seed liquidity
- [ ] Fee collected (0.1 SOL)
- [ ] Position created
- [ ] Transaction in analytics

**Expected Fees:** ~0.1 SOL platform + ~0.01 SOL gas

---

### 4. DLMM Set Pool Status (`/dlmm/set-status`)

**Status:** ⚠️ **No FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Prerequisites:** Existing DLMM pool (created by you)

**Test Data:**
```
Pool Address: [from create pool test]
New Status: 1 (Active)
```

**Checklist:**
- [ ] Page loads successfully
- [ ] Can change pool status
- [ ] Transaction confirms
- [ ] Status updated on-chain

**Expected Fees:** ~0.005 SOL gas only (no platform fee expected)
**Note:** May not charge platform fee for status changes

---

## DAMM v2 Protocol (7 Forms)

### 5. DAMM v2 Create Balanced Pool (`/damm-v2/create-balanced`)

**Status:** 🟢 **Has FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Test Data:**
```
Token A Mint: [existing token or create new]
Token B Mint: So11111111111111111111111111111111111111112
Token A Amount: 1000000000
Token B Amount: 100000000
Fee Rate: 300 (0.3%)
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can create balanced pool
- [ ] Fee collected (0.1 SOL)
- [ ] Pool address returned
- [ ] Transaction in analytics

**Expected Fees:** ~0.1 SOL platform + ~0.01 SOL gas

---

### 6. DAMM v2 Create One-Sided Pool (`/damm-v2/create-one-sided`)

**Status:** 🟢 **Has FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Test Data:**
```
Base Token Mint: [existing token]
Quote Token Mint: So11111111111111111111111111111111111111112
Amount: 1000000000
Fee Rate: 300
Price: 0.0001
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can create one-sided pool
- [ ] Fee collected (0.1 SOL)
- [ ] Pool address returned
- [ ] Transaction in analytics

**Expected Fees:** ~0.1 SOL platform + ~0.01 SOL gas

---

### 7-11. DAMM v2 Other Operations

These forms require existing DAMM v2 pools/positions:

- **Add Liquidity** (`/damm-v2/add-liquidity`) - ⚠️ No FeeDisclosure
- **Remove Liquidity** (`/damm-v2/remove-liquidity`) - ⚠️ No FeeDisclosure
- **Split Position** (`/damm-v2/split-position`) - ⚠️ No FeeDisclosure
- **Claim Fees** (`/damm-v2/claim-fees`) - ⚠️ No FeeDisclosure
- **Close Position** (`/damm-v2/close-position`) - ⚠️ No FeeDisclosure

**Note:** These may not charge platform fees as they're liquidity management operations.

---

## DAMM v1 Protocol (4 Forms)

### 12. DAMM v1 Create Pool (`/damm-v1/create-pool`)

**Status:** ⚠️ **No FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Test Data:**
```
Token A Mint: [existing token]
Token B Mint: So11111111111111111111111111111111111111112
Token A Amount: 1000000000
Token B Amount: 100000000
Fee Rate: 300
```

**Checklist:**
- [ ] Page loads successfully
- [ ] Can create DAMM v1 pool
- [ ] Pool address returned
- [ ] Transaction confirms

**Expected Fees:** ~0.005-0.01 SOL gas
**Note:** Need to add FeeDisclosure and transaction tracking

---

### 13-15. DAMM v1 Other Operations

- **Lock Liquidity** (`/damm-v1/lock-liquidity`)
- **Create Stake2Earn** (`/damm-v1/create-stake2earn`)
- **Lock (Stake2Earn)** (`/damm-v1/lock-stake2earn`)

**Note:** These require existing DAMM v1 pools.

---

## DBC Protocol (7 Forms)

### 16. DBC Create Config (`/dbc/create-config`)

**Status:** ⚠️ **No FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Test Data:**
```
Index: 0
Protocol Fee BPS: 30
Fund Fee BPS: 70
Token A Fee BPS: 0
Token B Fee BPS: 0
```

**Checklist:**
- [ ] Page loads successfully
- [ ] Can create config
- [ ] Config address returned
- [ ] Transaction confirms

**Expected Fees:** ~0.005 SOL gas
**Note:** May not charge platform fee for config creation

---

### 17. DBC Create Pool (`/dbc/create-pool`)

**Status:** ⚠️ **No FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Prerequisites:** DBC config created

**Test Data:**
```
Config Address: [from create config]
Token A Mint: [existing token]
Token B Mint: So11111111111111111111111111111111111111112
Token A Amount: 1000000000
Token B Amount: 100000000
```

**Checklist:**
- [ ] Page loads successfully
- [ ] Can create DBC pool
- [ ] Pool address returned
- [ ] Transaction confirms

**Expected Fees:** ~0.01 SOL gas
**Note:** Should add FeeDisclosure and transaction tracking

---

### 18-22. DBC Other Operations

- **Swap** (`/dbc/swap`) - ⚠️ No FeeDisclosure
- **Claim Fees** (`/dbc/claim-fees`) - ⚠️ No FeeDisclosure
- **Migrate to DAMM v1** (`/dbc/migrate-v1`) - ⚠️ No FeeDisclosure
- **Migrate to DAMM v2** (`/dbc/migrate-v2`) - ⚠️ No FeeDisclosure
- **Transfer Creator** (`/dbc/transfer-creator`) - ⚠️ No FeeDisclosure

**Note:** Operations vs creations - may not charge platform fees.

---

## Alpha Vault Protocol (1 Form)

### 23. Alpha Vault Create (`/alpha-vault/create`)

**Status:** 🟢 **Has FeeDisclosure** | ⚠️ **SDK Not Integrated**

**Test Data:**
```
Pool Address: [existing DLMM pool]
Quote Token Mint: So11111111111111111111111111111111111111112
Initial Deposit: 100000000
Treasury: [your wallet]
```

**Checklist:**
- [ ] Page loads successfully
- [ ] FeeDisclosure shows 0.1 SOL
- [ ] Can create vault
- [ ] Fee collected (0.1 SOL)
- [ ] Vault address returned
- [ ] Transaction in analytics

**Expected Fees:** ~0.1 SOL platform + ~0.01 SOL gas

---

## Settings (2 Forms)

### 24. Generate Keypair (`/settings/keypair`)

**Status:** ✅ **Utility** | No fees

**Checklist:**
- [ ] Page loads successfully
- [ ] Can generate keypair
- [ ] Public key displays
- [ ] Private key displays (blurred)
- [ ] Can copy both keys
- [ ] Warning messages display

**Expected Fees:** None (client-side only)

---

### 25. Airdrop SOL (`/settings/airdrop`)

**Status:** ✅ **Utility** | No fees

**Checklist:**
- [ ] Page loads successfully
- [ ] Can request airdrop
- [ ] SOL received in wallet
- [ ] Success message displays
- [ ] Works on devnet only

**Expected Fees:** None (devnet faucet)

---

## Summary Statistics

### Fee Disclosure Status

| Protocol | Total Forms | Has FeeDisclosure | Missing FeeDisclosure |
|----------|-------------|-------------------|------------------------|
| DLMM | 4 | 3 | 1 |
| DAMM v2 | 7 | 2 | 5 |
| DAMM v1 | 4 | 0 | 4 |
| DBC | 7 | 0 | 7 |
| Alpha Vault | 1 | 1 | 0 |
| Settings | 2 | 0 | 0 (N/A) |
| **Total** | **25** | **6** | **17** |

### SDK Integration Status

| Protocol | Total Forms | Fully Integrated | Needs Integration |
|----------|-------------|------------------|-------------------|
| DLMM | 4 | 1 | 3 |
| DAMM v2 | 7 | 0 | 7 |
| DAMM v1 | 4 | 0 | 4 |
| DBC | 7 | 0 | 7 |
| Alpha Vault | 1 | 0 | 1 |
| **Total** | **23** | **1** | **22** |

**Note:** Settings forms don't need SDK integration (utility functions only).

---

## Testing Priority

### High Priority (Create Operations)

These should charge platform fees:

1. ✅ DLMM Create Pool - **READY FOR TESTING**
2. 🔧 DLMM Seed LFG - **ADD TRACKING**
3. 🔧 DLMM Seed Single - **ADD TRACKING**
4. 🔧 DAMM v2 Create Balanced - **ADD FEE + TRACKING**
5. 🔧 DAMM v2 Create One-Sided - **ADD FEE + TRACKING**
6. 🔧 DAMM v1 Create Pool - **ADD FEE + TRACKING**
7. 🔧 DBC Create Pool - **ADD FEE + TRACKING**
8. 🔧 Alpha Vault Create - **ADD TRACKING**

### Medium Priority (Management Operations)

May or may not charge fees:

- DAMM v2 Add/Remove Liquidity
- DAMM v1 Lock operations
- DBC Swap
- DLMM Set Status

### Low Priority (Admin/Utility)

No fees expected:

- Claim Fees operations
- Close Position
- Transfer Creator
- Settings pages

---

## Recommended Testing Order

1. **Phase 1: Verify Single Form**
   - Test DLMM Create Pool thoroughly
   - Verify fee collection
   - Verify analytics tracking
   - Confirm everything works end-to-end

2. **Phase 2: Add Tracking to High Priority**
   - Add transaction tracking to remaining create operations
   - Test each one individually
   - Verify fees collected and tracked

3. **Phase 3: Test Management Operations**
   - Test liquidity management
   - Test swaps and migrations
   - Verify these work without platform fees

4. **Phase 4: Full Suite**
   - Test all 25 forms
   - Document any issues
   - Create bug reports

---

## Test Results Template

```markdown
# Form Testing Results - [Date]

## Summary
- **Forms Tested:** X/25
- **Passed:** X
- **Failed:** X
- **Pending:** X

## Detailed Results

### DLMM Create Pool
- Status: ✅ PASS / ❌ FAIL
- Fee Collected: Yes/No
- Analytics: Yes/No
- Issues: None / [describe]

### [Form Name]
...

## Fees Collected
- Total Transactions: X
- Total Fees: X SOL
- Fee Wallet Balance: X SOL

## Issues Found
1. [Issue description]
2. [Issue description]

## Screenshots
[Attach relevant screenshots]
```

---

## Quick Test Commands

### Check Form Compilation
```bash
# List all forms
find src/app -name "page.tsx" -type f | wc -l

# Check for FeeDisclosure imports
grep -r "FeeDisclosure" src/app --include="*.tsx" | wc -l

# Check for useTransaction imports
grep -r "useTransactionHistory" src/app --include="*.tsx" | wc -l
```

### Monitor Fee Wallet
```bash
# Check balance on Solscan
open "https://solscan.io/account/2eAbDjukYeWWcqwavW1rd7Ue5FgEqqwtqEWJoCajGLyW7xt2VbnUmBEx1eLYTW15XZ3RmeFbSLkezLUdTkz81PLu?cluster=devnet"
```

### Check Analytics
```bash
# Open analytics page
open "http://localhost:3000/analytics"
```

---

## Next Steps After Testing

1. **Document all issues found**
2. **Prioritize fixes**:
   - Critical: Forms that don't work at all
   - High: Missing fee collection
   - Medium: Missing analytics tracking
   - Low: UI/UX improvements

3. **Add missing features**:
   - FeeDisclosure to all create operations
   - Transaction tracking to all SDK hooks
   - Referral input to key forms

4. **Create final report**:
   - List all working forms
   - List all fees collected
   - Total SOL earned during testing
   - Any bugs or issues
   - Recommendations for production

---

**Testing Started:** __________
**Testing Completed:** __________
**Tested By:** __________
**Total Fees Collected:** ________ SOL
**Forms Passing:** ____/25
