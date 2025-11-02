---
description: Add a new Meteora protocol action with full integration
---

# Add New Meteora Protocol Action

You are tasked with adding a new protocol action to the Meteora UI Wrapper. Follow this comprehensive workflow to ensure complete integration with atomic fees, analytics, and referral tracking.

## User Input Required

Ask the user for the following information:

1. **Protocol**: Which protocol (dlmm, damm-v1, damm-v2, dbc, alpha-vault)?
2. **Action Name**: What is the action called (e.g., "add-liquidity", "swap", "claim-fees")?
3. **Display Name**: Human-readable name for the sidebar (e.g., "Add Liquidity")?
4. **Parameters**: What parameters does this action accept? (list them with types)
5. **SDK Method**: What Meteora SDK method should be called?
6. **Multi-Transaction**: Does this action involve multiple transactions? (important for fee atomicity)

## Implementation Steps

### 1. Check Existing Implementation

First, check if the action page and hook implementation already exist:
- Page: `src/app/[protocol]/[action]/page.tsx`
- Hook: `src/lib/meteora/use[Protocol].ts`

If they already exist, skip to step 4 (fee integration verification).

### 2. Create/Update Hook Function (src/lib/meteora/use[Protocol].ts)

Add the new function to the appropriate hook file following this **ATOMIC FEE PATTERN**:

```typescript
const [actionName] = async (params: ActionParams) => {
  if (!publicKey || !connection) {
    throw new Error('Wallet not connected');
  }

  // Import fee distribution if not already imported
  const { getFeeDistributionInstructions, validateFeeBalance } =
    await import('@/lib/feeDistribution');
  const { resolveReferrerWallet } = await import('@/lib/referrals');
  const { confirmTransactionWithRetry } = await import('@/lib/transactionUtils');
  const { addTransaction } = transactionStore;

  // 1. Validate fee balance
  const referrerWallet = resolveReferrerWallet();
  await validateFeeBalance(connection, publicKey, 'sol');

  // 2. Get fee instructions BEFORE building main transaction
  const feeInstructions = await getFeeDistributionInstructions(
    publicKey,
    referrerWallet || undefined
  );

  // 3. Build transaction with Meteora SDK
  const mainTx = await SDKMethod(...params);

  // 4. ATOMIC: Prepend fee instructions to FIRST transaction
  // CRITICAL: Fees MUST be in the same transaction to prevent loss on failure
  feeInstructions.reverse().forEach((instruction) => {
    mainTx.instructions.unshift(instruction);
  });

  // 5. Send transaction (single atomic transaction)
  const signature = await sendTransaction(mainTx, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  // 6. Confirm with retry logic
  await confirmTransactionWithRetry(
    connection,
    signature,
    'confirmed',
    60000
  );

  // 7. Track referral earnings
  if (referrerWallet && feeBreakdown.referral.lamports > 0) {
    const { recordEarning } = await import('@/lib/referrals');
    recordEarning(
      feeBreakdown.referral.lamports,
      publicKey.toBase58(),
      signature
    );
  }

  // 8. Track in analytics
  addTransaction({
    signature,
    walletAddress: publicKey.toBase58(),
    network,
    protocol: '[protocol]',
    action: '[protocol]-[action]',
    status: 'success',
    params,
    platformFee: feeBreakdown.total.lamports,
  });

  return signature;
};
```

**IMPORTANT FOR MULTI-TRANSACTION ACTIONS:**

If the action requires multiple transactions (e.g., initialize then seed), fees should ONLY be prepended to the FIRST transaction:

```typescript
const [actionName] = async (params: ActionParams) => {
  // Phase 0: Fee payment (ATOMIC with first operation)
  const feeInstructions = await getFeeDistributionInstructions(publicKey);

  // Phase 1: First transaction WITH fees
  const tx1 = await SDKMethod1(...);
  feeInstructions.reverse().forEach((ix) => tx1.instructions.unshift(ix));
  const sig1 = await sendTransaction(tx1, connection);
  await confirmTransactionWithRetry(connection, sig1);

  // Phase 2: Second transaction WITHOUT fees
  const tx2 = await SDKMethod2(...);
  const sig2 = await sendTransaction(tx2, connection);
  await confirmTransactionWithRetry(connection, sig2);

  // Track both signatures
  return [sig1, sig2];
};
```

### 3. Create Form Page (src/app/[protocol]/[action]/page.tsx)

Create a new page component following this pattern:

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@/components/ui';
import { FeeDisclosure } from '@/components/config/FeeDisclosure';
import { use[Protocol] } from '@/lib/meteora/use[Protocol]';
import toast from 'react-hot-toast';

export default function [ActionName]Page() {
  const { publicKey } = useWallet();
  const { [actionName] } = use[Protocol]();
  const [formData, setFormData] = useState({
    // Initialize form fields
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Processing transaction...');

    try {
      const signature = await [actionName](formData);

      toast.success(
        <div>
          <div>Success!</div>
          <a
            href={`https://solscan.io/tx/${signature}?cluster=${network}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            View transaction
          </a>
        </div>,
        { id: loadingToast, duration: 10000 }
      );

      // Reset form
      setFormData({ /* reset */ });
    } catch (error: any) {
      console.error('[ActionName] error:', error);
      toast.error(error.message || 'Transaction failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">[Display Name]</h1>

        <Card>
          <CardHeader>
            <CardTitle>[Action Details]</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form fields */}

              <FeeDisclosure />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!publicKey}
              >
                {!publicKey ? 'Connect Wallet' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
```

### 4. Verify Atomic Fee Integration

Check that the implementation follows the atomic fee pattern:
- [ ] Fee instructions are obtained BEFORE building transaction
- [ ] Fee instructions are prepended to the SAME transaction (not separate)
- [ ] For multi-transaction actions, fees are ONLY in the first transaction
- [ ] Transaction confirmation uses `confirmTransactionWithRetry`
- [ ] Referral tracking is integrated
- [ ] Analytics tracking is integrated
- [ ] FeeDisclosure component is on the form

### 5. Update Sidebar Navigation

Add the new action to `src/components/layout/Sidebar.tsx`:

```typescript
{
  label: '[Display Name]',
  href: '/[protocol]/[action]',
  icon: <ActivityIcon className="w-4 h-4" />
}
```

### 6. Update Type Definitions (if needed)

Add parameter types to `src/types/meteora.ts`:

```typescript
export interface [ActionName]Params {
  // Define parameters
}
```

### 7. Testing Checklist

Before marking complete, verify:
- [ ] Form renders correctly
- [ ] Wallet connection check works
- [ ] All form fields have validation
- [ ] Fee disclosure shows correct amounts
- [ ] Submitting creates a SINGLE transaction (check devtools network tab)
- [ ] Transaction includes fee instructions
- [ ] Success shows Solscan link
- [ ] Error handling works
- [ ] Referral tracking works (if referral code present)
- [ ] Transaction appears in analytics dashboard
- [ ] Can be tested on devnet

## Example Usage

User: "Add the swap action for DBC protocol"

Your response:
1. Ask for parameters (token amounts, slippage, etc.)
2. Identify SDK method (e.g., `DBC.swap()`)
3. Add function to `src/lib/meteora/useDBC.ts` with atomic fees
4. Create `src/app/dbc/swap/page.tsx`
5. Update sidebar
6. Verify all checklist items
7. Provide testing instructions

## Common Pitfalls to Avoid

❌ **DON'T:**
- Pay fees in a separate transaction
- Use basic `connection.confirmTransaction()` instead of retry logic
- Forget to track in analytics
- Skip FeeDisclosure component
- Miss referral tracking

✅ **DO:**
- Prepend fees to the same transaction atomically
- Use `confirmTransactionWithRetry` for all confirmations
- Add full analytics tracking
- Include FeeDisclosure on all forms
- Test with and without referral codes

## Notes

- Reference implementation: `src/lib/meteora/useDLMM.ts` createPool() function (lines 254-453)
- Architecture docs: `docs/core/ARCHITECTURE.md`
- Fee distribution code: `src/lib/feeDistribution.ts`
- Transaction utilities: `src/lib/transactionUtils.ts`
