---
description: Audit and fix non-atomic fee payments in protocol hooks
---

# Fix Non-Atomic Fee Payments

You are tasked with identifying and fixing non-atomic fee payment patterns in the Meteora UI Wrapper. Non-atomic fees create a critical risk: if the main transaction fails, fees are already paid and lost.

## The Problem

**Bad Pattern (Non-Atomic):**
```typescript
// Phase 0: Pay fees in SEPARATE transaction ❌ WRONG
const feeTx = new Transaction().add(...feeInstructions);
const feeSig = await sendTransaction(feeTx, connection);
await confirmTransactionWithRetry(connection, feeSig);

// Phase 1: Main transaction (if this fails, fees are lost!)
const mainTx = await sdkMethod(...);
const mainSig = await sendTransaction(mainTx, connection);
```

**Good Pattern (Atomic):**
```typescript
// Build main transaction
const mainTx = await sdkMethod(...);

// Prepend fees to SAME transaction ✅ CORRECT
feeInstructions.reverse().forEach((instruction) => {
  mainTx.instructions.unshift(instruction);
});

// Send single atomic transaction
const signature = await sendTransaction(mainTx, connection);
```

## Audit Workflow

### 1. Identify Files to Audit

Search all SDK hook files for fee payment patterns:
- `src/lib/meteora/useDLMM.ts`
- `src/lib/meteora/useDAMMv2.ts`
- `src/lib/meteora/useDAMMv1.ts`
- `src/lib/meteora/useDBC.ts`
- `src/lib/meteora/useAlphaVault.ts`

### 2. Search for Non-Atomic Patterns

Look for these red flags:

**Pattern 1: Separate Fee Transaction**
```typescript
const feeTx = new Transaction()
const feeSig = await sendTransaction(feeTx, connection)
```

**Pattern 2: Fee Payment Before Main Transaction**
```typescript
// Phase 0: Fee payment
await getFeeDistributionInstructions(...)
const feeSig = await sendTransaction(...)

// Phase 1: Main operation
const mainTx = await sdkMethod(...)
```

**Pattern 3: Comments indicating separate phases**
```typescript
// Phase 0: Pay platform fee
// Phase 1: Initialize pool
```

### 3. For Each Non-Atomic Function Found

Document:
- File name
- Function name
- Line numbers
- Current pattern (separate or multi-phase)
- Whether it's multi-transaction or single-transaction

### 4. Apply the Fix

#### For Single-Transaction Operations:

**Before:**
```typescript
// ❌ Non-atomic - separate transactions
const { getFeeDistributionInstructions } = await import('@/lib/feeDistribution');
const feeInstructions = await getFeeDistributionInstructions(publicKey);

const feeTx = new Transaction().add(...feeInstructions);
const feeSig = await sendTransaction(feeTx, connection);
await confirmTransactionWithRetry(connection, feeSig, 'confirmed', 60000);

const mainTx = await DLMM.seedLiquidity(...);
const mainSig = await sendTransaction(mainTx, connection);
await confirmTransactionWithRetry(connection, mainSig, 'confirmed', 60000);
```

**After:**
```typescript
// ✅ Atomic - single transaction
const { getFeeDistributionInstructions } = await import('@/lib/feeDistribution');
const feeInstructions = await getFeeDistributionInstructions(publicKey, referrerWallet);

// Build main transaction
const mainTx = await DLMM.seedLiquidity(...);

// Prepend fee instructions atomically
feeInstructions.reverse().forEach((instruction) => {
  mainTx.instructions.unshift(instruction);
});

// Send single transaction
const signature = await sendTransaction(mainTx, connection, {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
});

await confirmTransactionWithRetry(connection, signature, 'confirmed', 60000);
```

#### For Multi-Transaction Operations:

**Before:**
```typescript
// ❌ Fees in separate transaction
const feeTx = new Transaction().add(...feeInstructions);
const feeSig = await sendTransaction(feeTx, connection);

// Phase 1
const tx1 = await sdkMethod1(...);
const sig1 = await sendTransaction(tx1, connection);

// Phase 2
const tx2 = await sdkMethod2(...);
const sig2 = await sendTransaction(tx2, connection);
```

**After:**
```typescript
// ✅ Fees atomic with FIRST transaction only
const feeInstructions = await getFeeDistributionInstructions(publicKey, referrerWallet);

// Phase 1: WITH fees (atomic)
const tx1 = await sdkMethod1(...);
feeInstructions.reverse().forEach((ix) => tx1.instructions.unshift(ix));
const sig1 = await sendTransaction(tx1, connection);
await confirmTransactionWithRetry(connection, sig1);

// Phase 2: WITHOUT fees
const tx2 = await sdkMethod2(...);
const sig2 = await sendTransaction(tx2, connection);
await confirmTransactionWithRetry(connection, sig2);
```

### 5. Update Analytics Tracking

Ensure the function tracks the transaction:
```typescript
const { addTransaction } = transactionStore;

addTransaction({
  signature,
  walletAddress: publicKey.toBase58(),
  network,
  protocol: 'dlmm', // or other protocol
  action: 'dlmm-seed-lfg', // or other action
  status: 'success',
  params,
  poolAddress: pool?.toString(),
  platformFee: feeBreakdown.total.lamports,
});
```

### 6. Update Referral Tracking

Ensure referral earnings are tracked:
```typescript
if (referrerWallet && feeBreakdown.referral.lamports > 0) {
  const { recordEarning } = await import('@/lib/referrals');
  recordEarning(
    feeBreakdown.referral.lamports,
    publicKey.toBase58(),
    signature
  );
}
```

## Known Issues to Fix

Based on the codebase audit, these functions have non-atomic fee payments:

### DLMM (src/lib/meteora/useDLMM.ts)

1. **seedLiquidityLFG()** - Lines 534-558
   - Currently pays fees in separate "Phase 0"
   - Fix: Prepend to first transaction

2. **seedLiquiditySingleBin()** - Lines 724-748
   - Currently pays fees in separate "Phase 0"
   - Fix: Prepend to first transaction

3. **setPoolStatus()** - Lines 826-851
   - Currently pays fees in separate transaction
   - Fix: Prepend to main transaction

### Other Protocols

DAMMv2, DAMMv1, DBC, and AlphaVault hooks may not have ANY fee integration yet. Check each file and add atomic fee integration following the pattern above.

## Validation Checklist

After fixing each function, verify:
- [ ] Fee instructions are generated BEFORE building transaction
- [ ] Fee instructions are prepended to the SAME transaction
- [ ] For multi-tx operations, fees are ONLY in the first transaction
- [ ] Uses `confirmTransactionWithRetry` for confirmation
- [ ] Analytics tracking is present
- [ ] Referral tracking is present
- [ ] No separate fee transaction variable (feeTx)
- [ ] No separate fee signature variable (feeSig)

## Testing

For each fixed function:
1. Test on devnet with a wallet that has funds
2. Monitor network traffic to confirm SINGLE transaction
3. Check transaction on Solscan to verify fee transfer is in same transaction
4. Test failure scenario (insufficient balance) to ensure fees aren't lost
5. Verify referral tracking works
6. Check analytics dashboard shows transaction

## Example Execution

**User:** "Fix all non-atomic fees in the DLMM hook"

**Your workflow:**
1. Read `src/lib/meteora/useDLMM.ts`
2. Search for "Phase 0" or "feeTx" patterns
3. Identify 3 functions: seedLiquidityLFG, seedLiquiditySingleBin, setPoolStatus
4. For each function:
   - Remove separate fee transaction
   - Prepend fees to main/first transaction
   - Ensure analytics and referral tracking
5. Verify all checklist items
6. Provide testing instructions

## Output Format

After fixing, provide a summary:

```markdown
## Fixed Non-Atomic Fee Payments

### File: src/lib/meteora/useDLMM.ts

#### 1. seedLiquidityLFG() (Lines 534-620)
- **Before:** Separate fee transaction in "Phase 0"
- **After:** Fees prepended to first transaction atomically
- **Changes:**
  - Removed separate feeTx and feeSig
  - Prepended fee instructions to Phase 1 transaction
  - Added analytics tracking
  - Added referral tracking

#### 2. seedLiquiditySingleBin() (Lines 724-810)
- **Before:** Separate fee transaction in "Phase 0"
- **After:** Fees prepended to main transaction atomically
- **Changes:** [similar to above]

#### 3. setPoolStatus() (Lines 826-900)
- **Before:** Separate fee transaction
- **After:** Fees prepended to main transaction atomically
- **Changes:** [similar to above]

### Testing Instructions
1. Test seedLiquidityLFG on devnet with pool [address]
2. Test seedLiquiditySingleBin on devnet with pool [address]
3. Test setPoolStatus on devnet with pool [address]
4. Verify each creates only ONE transaction
5. Verify fees are included in that transaction
```

## Reference Implementation

The **CORRECT** atomic fee pattern is demonstrated in:
- `src/lib/meteora/useDLMM.ts` - `createPool()` function (lines 254-453)

Study this implementation as the reference for all fixes.

## Important Notes

- **Never pay fees in a separate transaction** - this creates unrecoverable loss risk
- **Always prepend fees to the first meaningful transaction** - ensures atomicity
- **Single transactions get fees prepended directly** - straightforward
- **Multi-transaction operations get fees ONLY on first tx** - prevents double charging
- **Always use confirmTransactionWithRetry** - prevents race conditions and handles retries

## Common Mistakes to Avoid

❌ Adding fees to multiple transactions in a sequence
❌ Appending fees instead of prepending (fees should execute first)
❌ Forgetting to reverse() the fee instructions array before unshift
❌ Using basic connection.confirmTransaction() instead of retry logic
❌ Not tracking the transaction in analytics
❌ Not tracking referral earnings

✅ Prepend to first transaction only
✅ Reverse then unshift to prepend correctly
✅ Use confirmTransactionWithRetry everywhere
✅ Track in analytics
✅ Track referral earnings
