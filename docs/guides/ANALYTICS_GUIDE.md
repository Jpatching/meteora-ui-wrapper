# Analytics & Fee System Guide

This guide covers the analytics tracking system and platform fee implementation for the Meteora UI Wrapper.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Analytics Dashboard](#analytics-dashboard)
- [Platform Fees](#platform-fees)
- [Transaction Tracking](#transaction-tracking)
- [Testing on Devnet](#testing-on-devnet)
- [FAQ](#faq)

## Overview

The Meteora UI Wrapper now includes a comprehensive analytics system that tracks all user transactions and provides detailed insights into pool launches, token creation, and platform usage. The system also supports optional platform fees to monetize the service.

### Key Features

✅ **Transaction History** - Automatically track all blockchain transactions
✅ **Analytics Dashboard** - View comprehensive statistics and metrics
✅ **Platform Fees** - Configurable SOL-based fees on transactions
✅ **Local Storage** - Client-side data persistence with export/import
✅ **Transaction Details** - Drill down into individual transaction data
✅ **Multi-Protocol Support** - Track DLMM, DAMM v1, DAMM v2, DBC, and Alpha Vault
✅ **Fee Transparency** - Clear disclosure of platform fees to users

## Features

### Analytics Dashboard

**Location:** `/analytics`

The analytics dashboard provides:

- **Summary Cards**
  - Total Launches: Number of transactions executed
  - Success Rate: Percentage of successful transactions
  - Pools Created: Count of pools across all protocols
  - Fees Paid: Total platform fees in SOL

- **Protocol Breakdown**
  - Distribution of transactions by protocol (DLMM, DAMM v1, DAMM v2, DBC, Alpha Vault)

- **Transaction History**
  - Filterable list of all user transactions
  - Search by signature, pool address, token address
  - Filter by protocol, status, or action
  - Click to view on Solscan explorer

- **Export/Import**
  - Export transaction history as JSON
  - Import previously exported data

### Transaction Details Page

**Location:** `/analytics/[signature]`

Individual transaction pages show:

- Transaction metadata (signature, network, timestamp, status)
- Created resources (pool, token, config, vault addresses)
- Platform fee information
- Transaction parameters (full JSON view)
- Error details (if failed)
- Links to Solscan and Meteora.ag

### Fee Disclosure Component

Appears on all protocol forms showing:
- Platform fee amount in SOL
- Fee transparency before transaction submission
- Only visible when fees are enabled

## Architecture

### Components

```
src/
├── types/transactions.ts              # Transaction type definitions
├── lib/
│   ├── transactionStore.ts            # localStorage CRUD operations
│   └── fees.ts                        # Fee configuration & collection
├── contexts/
│   └── TransactionHistoryContext.tsx  # Global transaction state
├── components/ui/
│   └── FeeDisclosure.tsx              # Fee transparency component
└── app/
    └── analytics/
        ├── page.tsx                   # Analytics dashboard
        └── [signature]/
            └── page.tsx               # Transaction details page
```

### Data Flow

1. **User submits form** → Form calls SDK hook (e.g., `useDLMM().createPool()`)
2. **SDK hook** → Adds platform fee instruction (if enabled)
3. **Transaction sent** → Blockchain confirms transaction
4. **Transaction tracked** → `addTransaction()` saves to localStorage
5. **Analytics updated** → Dashboard shows new transaction immediately

### Storage

- **localStorage** - Stores up to 1000 most recent transactions
- **Export/Import** - JSON format for data portability
- **Per-wallet tracking** - Transactions associated with wallet address

## Getting Started

### 1. Configure Environment Variables

Edit `.env.local`:

```bash
# Enable or disable platform fees
NEXT_PUBLIC_ENABLE_FEES=false

# Platform wallet receiving fees (required if fees enabled)
NEXT_PUBLIC_FEE_WALLET=YourWalletAddress11111111111111111111111111

# Fee amount in lamports (100000000 = 0.1 SOL)
NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS=100000000

# Enable analytics features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 2. Enable Fees (Optional)

To enable platform fees:

1. Set `NEXT_PUBLIC_ENABLE_FEES=true`
2. Add your platform wallet address to `NEXT_PUBLIC_FEE_WALLET`
3. Adjust `NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS` if desired
4. Restart the dev server

### 3. Test Transaction Tracking

1. Connect your wallet to devnet
2. Navigate to any protocol form (e.g., `/dlmm/create-pool`)
3. Fill out the form and submit a transaction
4. After confirmation, visit `/analytics` to see the tracked transaction

## Analytics Dashboard

### Accessing the Dashboard

Navigate to the Analytics section in the sidebar or visit `/analytics`.

### Summary Metrics

**Total Launches**
- Count of all transactions (successful, failed, and pending)
- Tracks pool creation, liquidity operations, and other actions

**Success Rate**
- Percentage calculated as: `(successful / total) * 100`
- Excludes pending transactions

**Pools Created**
- Count of transactions that resulted in pool creation
- Includes DLMM, DAMM v1, DAMM v2, and DBC pools

**Fees Paid**
- Total platform fees paid in SOL
- Sum of all `platformFee` fields from transactions

### Filtering Transactions

**By Protocol:**
- DLMM
- DAMM v1
- DAMM v2
- DBC
- Alpha Vault
- Settings

**By Status:**
- Success
- Failed
- Pending

**Search:**
- Transaction signature
- Pool address
- Token address
- Custom label/tag

### Exporting Data

Click "Export History" to download your transaction data as JSON.

Format:
```json
{
  "version": "1.0.0",
  "exportDate": "2025-11-01T12:00:00.000Z",
  "walletAddress": "...",
  "transactions": [...]
}
```

## Platform Fees

### Fee Configuration

**Default Fee:** 0.1 SOL (100,000,000 lamports)

**How It Works:**
1. When fees are enabled, a `SystemProgram.transfer` instruction is added to each transaction
2. The instruction transfers SOL from the user's wallet to the platform wallet
3. The fee is collected atomically with the main transaction
4. If the transaction fails, the fee is not charged

### Fee Disclosure

The `FeeDisclosure` component shows users the fee before they submit:

```tsx
<FeeDisclosure variant="default" />
```

**Variants:**
- `default` - Card with fee amount and description
- `compact` - Inline text display
- `detailed` - Full breakdown with recipient info

### Integrating Fees into SDK Hooks

Example from `useDLMM.ts`:

```typescript
import { getPlatformFeeInstruction } from '@/lib/fees';

// Inside function
const feeInstruction = await getPlatformFeeInstruction(publicKey);
let platformFeePaid = 0;

if (feeInstruction) {
  transaction.instructions.unshift(feeInstruction);
  // Extract fee amount
  platformFeePaid = Number(feeInstruction.data.readBigInt64LE(4));
}

// After confirmation
addTransaction({
  signature,
  walletAddress: publicKey.toBase58(),
  network,
  protocol: 'dlmm',
  action: 'dlmm-create-pool',
  status: 'success',
  params,
  poolAddress: poolAddress.toString(),
  platformFee: platformFeePaid,
});
```

### Token-Based Fees (Future)

The system supports token-based fees via configuration:

```bash
NEXT_PUBLIC_FEE_TOKEN_MINT=TokenMintAddress111111111111111111111
NEXT_PUBLIC_FEE_TOKEN_AMOUNT=1000000
```

This enables scenarios like:
- Charging users in a platform token
- Creating buy pressure on the platform token
- Discounts for token holders

## Transaction Tracking

### Automatic Tracking

All SDK hooks in `src/lib/meteora/` are integrated with the transaction tracking system:

- ✅ `useDLMM` - DLMM pool operations
- ⏳ `useDAMMv1` - DAMM v1 operations (pending)
- ⏳ `useDAMMv2` - DAMM v2 operations (pending)
- ⏳ `useDBC` - DBC operations (pending)
- ⏳ `useAlphaVault` - Alpha Vault operations (pending)

### Transaction Record Structure

```typescript
{
  id: "unique-id",
  signature: "transaction-signature",
  walletAddress: "user-wallet",
  timestamp: 1699000000000,
  network: "devnet",
  protocol: "dlmm",
  action: "dlmm-create-pool",
  status: "success",
  params: { /* form inputs */ },
  poolAddress: "pool-address",
  tokenAddress: "token-address",
  platformFee: 100000000,
  error: undefined
}
```

### Manual Transaction Tracking

Use the context directly:

```typescript
import { useTransactionHistory } from '@/contexts/TransactionHistoryContext';

const { addTransaction } = useTransactionHistory();

addTransaction({
  signature: 'tx-sig',
  walletAddress: publicKey.toBase58(),
  network: 'devnet',
  protocol: 'dlmm',
  action: 'dlmm-create-pool',
  status: 'success',
  params: { /* your params */ },
  poolAddress: 'pool-address',
});
```

## Testing on Devnet

### Prerequisites

1. Solana wallet with devnet SOL
2. Network set to devnet (via network switcher)
3. Dev server running: `npm run dev`

### Test Plan

**1. Test Transaction Tracking**

- [ ] Create a DLMM pool
- [ ] Verify transaction appears in `/analytics`
- [ ] Check transaction details page
- [ ] Verify all metadata is correct (signature, pool address, status)

**2. Test Analytics Calculations**

- [ ] Create multiple transactions
- [ ] Verify total launches count
- [ ] Check success rate calculation
- [ ] Confirm pools created count

**3. Test Filtering**

- [ ] Filter by protocol
- [ ] Filter by status
- [ ] Search by signature
- [ ] Clear filters

**4. Test Export/Import**

- [ ] Export transaction history
- [ ] Clear localStorage
- [ ] Import previously exported data
- [ ] Verify all transactions restored

**5. Test Fee System (if enabled)**

- [ ] Enable fees in `.env.local`
- [ ] Set platform wallet address
- [ ] Submit transaction
- [ ] Verify fee was deducted
- [ ] Check fee shows in analytics

### Devnet Testing Checklist

```bash
# 1. Ensure devnet configuration
SOLANA_NETWORK=devnet

# 2. Get devnet SOL
# Use Solana CLI or web faucet
solana airdrop 2

# 3. Start dev server
npm run dev

# 4. Connect wallet to devnet
# Use network switcher in header

# 5. Test each protocol
- DLMM: Create Pool
- DAMM v2: Create Balanced Pool
- Alpha Vault: Create Vault

# 6. Check analytics
# Visit /analytics after each transaction

# 7. Verify on Solscan
# Click transaction links to verify on-chain
```

## FAQ

### Q: Where is transaction data stored?

**A:** Transaction data is stored in the browser's localStorage under the key `meteora-transactions`. It persists across sessions but is cleared if you clear browser data.

### Q: How many transactions can be stored?

**A:** The system stores up to 1000 transactions. When this limit is reached, older transactions are automatically removed.

### Q: Can I use the analytics without paying fees?

**A:** Yes! Fees are completely optional. Set `NEXT_PUBLIC_ENABLE_FEES=false` to disable all platform fees while still using analytics.

### Q: What happens if a transaction fails?

**A:** Failed transactions are still tracked with `status: 'failed'` and include error messages. Platform fees are not charged for failed transactions.

### Q: Can I track transactions from multiple wallets?

**A:** Yes. Each transaction is associated with a wallet address. You can switch wallets and see different transaction histories.

### Q: How do I reset my transaction history?

**A:** You can export your data first (for backup), then clear localStorage or use browser dev tools to delete the `meteora-transactions` key.

### Q: Can I customize the fee amount?

**A:** Yes. Adjust `NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS` in `.env.local`. The default is 0.1 SOL (100000000 lamports).

### Q: How do I set up token-based fees?

**A:** Set `NEXT_PUBLIC_FEE_TOKEN_MINT` and `NEXT_PUBLIC_FEE_TOKEN_AMOUNT` in `.env.local`. The system will use token fees instead of SOL fees.

### Q: Are transactions tracked automatically?

**A:** Yes, for integrated SDK hooks (currently `useDLMM`). Other hooks will be integrated in upcoming updates.

### Q: Can I export data for multiple wallets?

**A:** Currently, export only includes the connected wallet's transactions. To export multiple wallets, export each wallet separately.

## Next Steps

1. **Complete SDK Integration** - Add transaction tracking to all remaining SDK hooks
2. **Enhanced Analytics** - Add charts, graphs, and advanced metrics
3. **On-Chain Data** - Fetch real-time pool data (TVL, volume, APY)
4. **Multi-Wallet** - Support tracking across multiple wallets
5. **Cloud Sync** - Optional cloud storage for cross-device access

---

**Need Help?** Check the main `README.md` or project documentation.
