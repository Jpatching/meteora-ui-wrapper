---
description: Add transaction tracking and analytics to a protocol action
---

# Add Analytics Integration

You are tasked with adding comprehensive transaction tracking and analytics to a Meteora protocol action. This ensures all user transactions are recorded in the analytics dashboard.

## What is Analytics Integration?

The Meteora UI Wrapper has a built-in analytics system that:
- Tracks all transactions in localStorage
- Provides a searchable transaction history
- Calculates earnings and statistics
- Allows export/import of transaction data
- Integrates with referral tracking

## Implementation Steps

### 1. Verify Transaction Store Import

Check that the hook file imports the transaction store:

```typescript
import { transactionStore } from '@/lib/transactionStore';
```

### 2. Add Transaction Tracking to Function

After a successful transaction confirmation, add tracking:

```typescript
const yourFunction = async (params) => {
  // ... transaction building and sending ...

  const signature = await sendTransaction(tx, connection);
  await confirmTransactionWithRetry(connection, signature);

  // ADD THIS: Track transaction
  const { addTransaction } = transactionStore;

  addTransaction({
    signature,                                    // Transaction signature
    walletAddress: publicKey.toBase58(),         // User's wallet
    network,                                      // Current network
    protocol: '[protocol]',                       // e.g., 'dlmm', 'damm-v2'
    action: '[protocol]-[action-name]',          // e.g., 'dlmm-create-pool'
    status: 'success',                            // 'success' | 'failed' | 'pending'
    params,                                       // Form parameters used
    poolAddress: pool?.toString(),               // (optional) Pool address if created
    tokenAddress: tokenMint?.toString(),         // (optional) Token address
    platformFee: feeBreakdown.total.lamports,   // Fee paid in lamports
    label: '[Optional user-friendly label]',     // (optional) Display label
  });

  return signature;
};
```

### 3. Track Failed Transactions

For better analytics, track failures too:

```typescript
try {
  const signature = await sendTransaction(tx, connection);
  await confirmTransactionWithRetry(connection, signature);

  // Success tracking
  addTransaction({
    signature,
    walletAddress: publicKey.toBase58(),
    network,
    protocol: 'dlmm',
    action: 'dlmm-seed-lfg',
    status: 'success',
    params,
    poolAddress: pool.toString(),
    platformFee: feeBreakdown.total.lamports,
  });

  return signature;
} catch (error) {
  // Failure tracking (if signature exists)
  if (error.signature) {
    addTransaction({
      signature: error.signature,
      walletAddress: publicKey.toBase58(),
      network,
      protocol: 'dlmm',
      action: 'dlmm-seed-lfg',
      status: 'failed',
      params,
      platformFee: 0,
    });
  }

  throw error;
}
```

### 4. Add FeeDisclosure Component to Form

The form should display fee information to users:

```typescript
import { FeeDisclosure } from '@/components/config/FeeDisclosure';

export default function YourPage() {
  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      {/* ADD THIS: Fee disclosure */}
      <FeeDisclosure />

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### 5. Verify Referral Tracking Integration

Ensure referral earnings are tracked alongside analytics:

```typescript
// After successful transaction
if (referrerWallet && feeBreakdown.referral.lamports > 0) {
  const { recordEarning } = await import('@/lib/referrals');
  recordEarning(
    feeBreakdown.referral.lamports,
    publicKey.toBase58(),
    signature
  );
}
```

## Transaction Record Schema

The full `TransactionRecord` interface:

```typescript
interface TransactionRecord {
  id: string;                    // Auto-generated UUID
  signature: string;             // Transaction signature (required)
  timestamp: number;             // Unix timestamp (auto-generated)
  walletAddress: string;         // User wallet address (required)
  network: string;               // Network: localnet/devnet/mainnet-beta (required)
  protocol: 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc' | 'alpha-vault' | 'settings'; // (required)
  action: string;                // Action identifier (required)
  status: 'pending' | 'success' | 'failed'; // Transaction status (required)
  params: any;                   // Original parameters (required)
  poolAddress?: string;          // Pool address (optional)
  tokenAddress?: string;         // Token address (optional)
  platformFee?: number;          // Fee paid in lamports (optional)
  label?: string;                // User-friendly label (optional)
}
```

## Protocol and Action Naming Convention

Use consistent naming:

### DLMM Protocol
- `protocol: 'dlmm'`
- Actions:
  - `'dlmm-create-pool'`
  - `'dlmm-seed-lfg'`
  - `'dlmm-seed-single'`
  - `'dlmm-set-status'`

### DAMMv2 Protocol
- `protocol: 'damm-v2'`
- Actions:
  - `'damm-v2-create-balanced'`
  - `'damm-v2-create-one-sided'`
  - `'damm-v2-add-liquidity'`
  - `'damm-v2-remove-liquidity'`
  - `'damm-v2-split-position'`
  - `'damm-v2-claim-fees'`
  - `'damm-v2-close-position'`

### DAMMv1 Protocol
- `protocol: 'damm-v1'`
- Actions:
  - `'damm-v1-create-pool'`
  - `'damm-v1-lock-liquidity'`
  - `'damm-v1-create-stake2earn'`
  - `'damm-v1-lock-stake2earn'`

### DBC Protocol
- `protocol: 'dbc'`
- Actions:
  - `'dbc-create-config'`
  - `'dbc-create-pool'`
  - `'dbc-swap'`
  - `'dbc-claim-fees'`
  - `'dbc-migrate-v1'`
  - `'dbc-migrate-v2'`
  - `'dbc-transfer-creator'`

### Alpha Vault Protocol
- `protocol: 'alpha-vault'`
- Actions:
  - `'alpha-vault-create'`

### Settings
- `protocol: 'settings'`
- Actions:
  - `'settings-generate-keypair'`
  - `'settings-airdrop'`

## Multi-Transaction Tracking

For actions that create multiple transactions, track each one:

```typescript
// Transaction 1
const sig1 = await sendTransaction(tx1, connection);
await confirmTransactionWithRetry(connection, sig1);

addTransaction({
  signature: sig1,
  walletAddress: publicKey.toBase58(),
  network,
  protocol: 'dlmm',
  action: 'dlmm-seed-lfg',
  status: 'success',
  params,
  poolAddress: pool.toString(),
  platformFee: feeBreakdown.total.lamports, // Fees only on first tx
  label: 'Initialize Pool',
});

// Transaction 2
const sig2 = await sendTransaction(tx2, connection);
await confirmTransactionWithRetry(connection, sig2);

addTransaction({
  signature: sig2,
  walletAddress: publicKey.toBase58(),
  network,
  protocol: 'dlmm',
  action: 'dlmm-seed-lfg',
  status: 'success',
  params,
  poolAddress: pool.toString(),
  platformFee: 0, // No fees on second tx
  label: 'Seed Liquidity',
});
```

## Analytics Dashboard Integration

Tracked transactions automatically appear in:
- **Analytics Dashboard** (`/analytics`)
  - Searchable by signature, wallet, protocol, action
  - Filterable by network and status
  - Sortable by date
  - Displays fee totals

- **Transaction History Context**
  - Accessible via `useTransactionHistory()` hook
  - Provides real-time transaction list
  - Calculates statistics

## Validation Checklist

After adding analytics, verify:
- [ ] `transactionStore` is imported
- [ ] `addTransaction()` is called after successful transaction
- [ ] All required fields are provided (signature, walletAddress, network, protocol, action, status, params)
- [ ] Optional fields are included when available (poolAddress, tokenAddress, platformFee)
- [ ] Failed transactions are tracked (if signature available)
- [ ] Multi-transaction operations track each transaction separately
- [ ] FeeDisclosure component is on the form
- [ ] Referral tracking is integrated
- [ ] Transaction appears in `/analytics` dashboard after execution

## Testing

1. **Submit a transaction** using the form
2. **Check transaction appears** in `/analytics` dashboard
3. **Verify all fields** are populated correctly
4. **Test search/filter** functionality on analytics page
5. **Export transaction data** and verify format
6. **Test with referral code** to ensure earnings tracked

## Example Usage

**User:** "Add analytics to the DBC swap action"

**Your workflow:**
1. Read `src/lib/meteora/useDBC.ts`
2. Find `swap()` function
3. Add transactionStore import if missing
4. Add `addTransaction()` call after successful transaction:
   ```typescript
   addTransaction({
     signature,
     walletAddress: publicKey.toBase58(),
     network,
     protocol: 'dbc',
     action: 'dbc-swap',
     status: 'success',
     params,
     poolAddress: params.pool,
     tokenAddress: params.inputMint,
     platformFee: feeBreakdown.total.lamports,
   });
   ```
5. Read `src/app/dbc/swap/page.tsx`
6. Add `<FeeDisclosure />` component to form
7. Test on devnet
8. Verify appears in analytics dashboard

## Common Mistakes to Avoid

❌ Not importing transactionStore
❌ Missing required fields (signature, walletAddress, etc.)
❌ Using wrong protocol/action naming convention
❌ Forgetting to track failed transactions
❌ Not tracking each transaction in multi-tx operations
❌ Missing FeeDisclosure on form
❌ Not testing analytics dashboard after implementation

✅ Import transactionStore
✅ Provide all required fields
✅ Use consistent naming convention
✅ Track both success and failure
✅ Track each transaction separately
✅ Include FeeDisclosure
✅ Test end-to-end

## Reference Files

- **Transaction Store:** `src/lib/transactionStore.ts`
- **FeeDisclosure Component:** `src/components/config/FeeDisclosure.tsx`
- **Analytics Dashboard:** `src/app/analytics/page.tsx`
- **Transaction History Context:** `src/contexts/TransactionHistoryContext.tsx`
- **Reference Implementation:** `src/lib/meteora/useDLMM.ts` (createPool function)

## Analytics Features

The analytics system provides:
- **Transaction History** - All transactions per wallet
- **Search** - Find by signature, address, pool
- **Filter** - By protocol, action, status, network
- **Statistics** - Total transactions, fees paid, success rate
- **Export/Import** - JSON format for backup/migration
- **Referral Earnings** - Integrated with referral system
- **Per-Wallet Storage** - localStorage (max 1000 transactions)

## Additional Integration Points

### Toast Notifications
Show transaction link in success toast:
```typescript
toast.success(
  <div>
    <div>Transaction successful!</div>
    <a
      href={`https://solscan.io/tx/${signature}?cluster=${network}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline"
    >
      View on Solscan
    </a>
  </div>,
  { duration: 10000 }
);
```

### Loading States
Track transaction during confirmation:
```typescript
const loadingToast = toast.loading('Confirming transaction...');
// ... transaction logic ...
toast.success('Success!', { id: loadingToast });
```
