---
description: Test a protocol action on devnet with validation
---

# Test Protocol Action

You are tasked with comprehensively testing a Meteora protocol action to ensure it works correctly on devnet before production use.

## Testing Workflow

### 1. Pre-Test Setup Checklist

Before testing, verify:
- [ ] Devnet SOL available in test wallet (use `/settings/airdrop` or `solana airdrop 2`)
- [ ] Test tokens available if needed (for pool operations)
- [ ] Network selector set to "Devnet"
- [ ] Wallet adapter connected
- [ ] Browser console open for debugging

### 2. Code Review Checklist

Read the implementation and verify:

#### Atomic Fee Integration
- [ ] Fees are prepended to the SAME transaction (not separate)
- [ ] For multi-tx operations, fees are ONLY on first transaction
- [ ] No separate `feeTx` or `feeSig` variables exist
- [ ] Fee instructions use `.unshift()` after `.reverse()`

#### Transaction Handling
- [ ] Uses `sendTransaction` from wallet adapter
- [ ] Uses `confirmTransactionWithRetry` (not basic confirmation)
- [ ] Has proper error handling with try/catch
- [ ] Returns transaction signature

#### Analytics Integration
- [ ] Imports `transactionStore`
- [ ] Calls `addTransaction()` after success
- [ ] All required fields provided (signature, walletAddress, network, protocol, action, status, params)
- [ ] Optional fields included when available

#### Referral Integration
- [ ] Calls `resolveReferrerWallet()` to check for referral
- [ ] Calls `recordEarning()` if referral exists
- [ ] Passes referrerWallet to `getFeeDistributionInstructions`

#### UI/Form
- [ ] FeeDisclosure component is present
- [ ] Form has validation for required fields
- [ ] Wallet connection check before submission
- [ ] Loading states during transaction
- [ ] Toast notifications for success/failure
- [ ] Success shows Solscan link

### 3. Functional Testing

#### Test Case 1: Happy Path
1. Fill out form with valid data
2. Submit transaction
3. Verify:
   - [ ] Loading toast appears
   - [ ] Transaction is submitted
   - [ ] Only ONE transaction sent (check network tab)
   - [ ] Confirmation succeeds
   - [ ] Success toast appears with Solscan link
   - [ ] Form resets or stays appropriately

#### Test Case 2: Atomic Fee Validation
1. Submit transaction
2. Check Solscan transaction details
3. Verify:
   - [ ] Transaction contains fee transfer instructions
   - [ ] Fee transfers are at the BEGINNING of the transaction
   - [ ] Main operation instructions follow fees
   - [ ] All instructions are in ONE transaction

#### Test Case 3: Transaction Tracking
1. Submit transaction
2. Navigate to `/analytics` dashboard
3. Verify:
   - [ ] Transaction appears in history
   - [ ] Correct signature displayed
   - [ ] Correct protocol and action
   - [ ] Correct network (Devnet)
   - [ ] Status shows "success"
   - [ ] Fee amount is correct
   - [ ] Pool/token addresses populated (if applicable)

#### Test Case 4: Referral Tracking
1. Add referral code to URL: `?ref=ABCD1234`
2. Submit transaction
3. Verify:
   - [ ] Referral code detected (check console logs)
   - [ ] Fee split includes referral portion
   - [ ] Referrer wallet receives fee
   - [ ] Earnings tracked in referral system

#### Test Case 5: Error Handling - Insufficient Balance
1. Use wallet with insufficient SOL
2. Submit transaction
3. Verify:
   - [ ] Error is caught and displayed
   - [ ] User-friendly error message
   - [ ] No fees charged (transaction didn't execute)
   - [ ] Form remains filled for retry

#### Test Case 6: Error Handling - Invalid Parameters
1. Submit form with invalid data (if validation allows)
2. Verify:
   - [ ] Transaction fails gracefully
   - [ ] Error message explains issue
   - [ ] No partial state changes

#### Test Case 7: Network Switching
1. Submit transaction on devnet
2. Switch to mainnet-beta
3. Verify:
   - [ ] Network context updates
   - [ ] RPC endpoint changes
   - [ ] Transaction history filters by network

### 4. Multi-Transaction Actions (if applicable)

For actions like seedLiquidityLFG that involve multiple transactions:

1. Submit transaction
2. Monitor network tab
3. Verify:
   - [ ] Correct number of transactions (e.g., 2 for LFG)
   - [ ] Fees ONLY in first transaction
   - [ ] Second transaction has no fees
   - [ ] Both transactions tracked separately in analytics
   - [ ] Both transactions succeed or both fail (atomicity within phases)

### 5. Fee Distribution Validation

Check fee split on Solscan:
- [ ] Total fee matches expected (e.g., 0.1 SOL)
- [ ] If referral code: 10% to referrer
- [ ] 45% to buyback wallet
- [ ] 45% to treasury wallet
- [ ] Percentages add up to 100%

### 6. Browser Debugging

Check browser console for:
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] Transaction logging (if enabled)
- [ ] Proper state updates

### 7. Responsive Design

Test on different screen sizes:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Form remains usable
- [ ] Sidebar collapses appropriately

## Test Data Examples

### DLMM Create Pool
```
Token A: So11111111111111111111111111111111111111112 (Wrapped SOL)
Token B: [Create a test token or use existing devnet token]
Bin Step: 100
Initial Price: 1.0
Active Bin ID: 8388608
```

### DAMM v2 Add Liquidity
```
Pool: [Existing devnet pool address]
Token A Amount: 0.1 SOL
Token B Amount: 0.1 TOKEN
```

### DBC Swap
```
Pool: [Existing devnet DBC pool]
Input Amount: 0.01 SOL
Minimum Output: 0.009
Slippage: 1%
```

## Automated Test Script (Optional)

For repeated testing, create a script:

```typescript
// test-protocol.ts
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

async function testAction() {
  const connection = new Connection('https://api.devnet.solana.com');
  const testWallet = Keypair.fromSecretKey(/* test key */);

  // 1. Check balance
  const balance = await connection.getBalance(testWallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  // 2. Execute action
  // ... call your hook function ...

  // 3. Verify transaction
  const signature = await executeAction(...);
  const tx = await connection.getTransaction(signature);

  // 4. Check fee instructions
  const feeInstructions = tx.transaction.message.instructions.slice(0, 3);
  console.log('Fee instructions:', feeInstructions);

  // 5. Validate
  assert(feeInstructions.length === 3, 'Should have 3 fee transfers');
}
```

## Common Issues and Solutions

### Issue: "Transaction simulation failed"
**Solution:**
- Check balance is sufficient
- Verify token accounts exist
- Check pool state is valid
- Review transaction instructions order

### Issue: "Blockhash not found"
**Solution:**
- Transaction took too long
- Use `confirmTransactionWithRetry` which handles this
- Check network connection

### Issue: "Fees not in transaction"
**Solution:**
- Verify `getFeeDistributionInstructions` is called
- Check instructions are prepended (unshift)
- Ensure fees aren't in separate transaction

### Issue: "Transaction not in analytics"
**Solution:**
- Check `addTransaction` is called
- Verify signature is correct
- Check localStorage quota
- Ensure network matches

## Testing Output Format

After testing, provide a summary:

```markdown
## Test Results: [Protocol] [Action]

**Test Date:** 2025-11-02
**Network:** Devnet
**Tester:** [Your name]

### ✅ Passing Tests
- Happy path submission
- Atomic fee integration
- Transaction tracking
- Referral tracking
- Error handling (insufficient balance)
- Error handling (invalid params)
- Network switching
- Fee distribution (correct percentages)
- Browser console (no errors)

### ❌ Failing Tests
- [None]

### ⚠️ Warnings
- [Any minor issues or improvements needed]

### Transaction Details
- **Signature:** `abc123...xyz789`
- **Solscan:** https://solscan.io/tx/abc123...xyz789?cluster=devnet
- **Fee Paid:** 0.1 SOL
- **Referral:** 10% to [wallet]
- **Analytics:** Tracked successfully

### Performance
- **Transaction Time:** 2.3 seconds
- **Confirmation:** 1.8 seconds
- **UI Response:** Instant

### Recommendations
- [Any suggested improvements]

**Status:** ✅ **READY FOR PRODUCTION**
```

## Integration with MCP Server (Advanced)

If the MCP server is available, use these tools:

```typescript
// Simulate transaction without sending
await mcp.simulate_transaction(txBuffer);

// Validate fee atomicity
await mcp.validate_fee_atomicity(txBuffer);

// Estimate compute units
await mcp.estimate_compute_units(txBuffer);

// Test referral split
await mcp.test_referral_split(feeAmount, referralPercentage);
```

## Continuous Testing

For ongoing development:
1. Test each protocol action after changes
2. Regression test after fee/analytics updates
3. Test on devnet before mainnet deployment
4. Keep test wallets funded
5. Document known issues

## Reference Files

- **Devnet Testing Guide:** `docs/guides/DEVNET_TESTING_GUIDE.md`
- **Form Testing Checklist:** `docs/testing/COMPLETE_FORM_TESTING_CHECKLIST.md`
- **DLMM Testing:** `docs/testing/DLMM_TESTING.md`
- **Analytics Guide:** `docs/guides/ANALYTICS_GUIDE.md`

## Safety Reminders

⚠️ **NEVER:**
- Test on mainnet with real funds during development
- Share private keys from test wallets publicly
- Skip fee atomicity validation
- Deploy without devnet testing

✅ **ALWAYS:**
- Test on devnet first
- Verify fee atomicity
- Check analytics tracking
- Test with and without referrals
- Review Solscan transactions
- Clear localStorage between test runs (if needed)
