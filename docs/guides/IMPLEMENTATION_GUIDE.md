# Meteora Invent UI - Implementation Guide

## ✅ **What's Complete**

### Infrastructure (100% Complete)
- ✅ Dark mode theme with purple/blue gradients
- ✅ Wallet adapter integration (Phantom, Solflare, etc.)
- ✅ Network context and switching (localnet/devnet/mainnet)
- ✅ Complete UI component library (Card, Input, Select, Button, Badge, Tooltip)
- ✅ Main layout with sidebar navigation
- ✅ Header with wallet connect and network selector
- ✅ Type definitions for all 23 actions
- ✅ Workspace linking with @meteora-invent/studio
- ✅ Client-side SDK integration architecture
- ✅ Toast notifications system

### Example Implementation (1/23 forms)
- ✅ DLMM Create Pool - Fully functional form with all features

### Architecture Decisions

**Client-Side SDK Integration** (Recommended)
- Transactions built client-side using Meteora SDKs
- Signed with wallet adapter (more secure)
- No server-side keypairs needed
- Better for dApp security model

## 📋 **Remaining Work (22 Forms)**

### Batch 1: DLMM (3 forms)
- [ ] `/dlmm/seed-lfg` - Seed Liquidity LFG
- [ ] `/dlmm/seed-single` - Seed Liquidity Single Bin
- [ ] `/dlmm/set-status` - Set Pool Status

### Batch 2: DAMM v2 (7 forms)
- [ ] `/damm-v2/create-balanced` - Create Balanced Pool
- [ ] `/damm-v2/create-one-sided` - Create One-Sided Pool
- [ ] `/damm-v2/add-liquidity` - Add Liquidity
- [ ] `/damm-v2/remove-liquidity` - Remove Liquidity
- [ ] `/damm-v2/split-position` - Split Position
- [ ] `/damm-v2/claim-fees` - Claim Position Fees
- [ ] `/damm-v2/close-position` - Close Position

### Batch 3: DAMM v1 (4 forms)
- [ ] `/damm-v1/create-pool` - Create Pool
- [ ] `/damm-v1/lock-liquidity` - Lock Liquidity
- [ ] `/damm-v1/create-stake2earn` - Create Stake2Earn Farm
- [ ] `/damm-v1/lock-stake2earn` - Lock Liquidity (Stake2Earn)

### Batch 4: DBC (7 forms)
- [ ] `/dbc/create-config` - Create Config
- [ ] `/dbc/create-pool` - Create Pool
- [ ] `/dbc/swap` - Swap Tokens
- [ ] `/dbc/claim-fees` - Claim Trading Fees
- [ ] `/dbc/migrate-v1` - Migrate to DAMM v1
- [ ] `/dbc/migrate-v2` - Migrate to DAMM v2
- [ ] `/dbc/transfer-creator` - Transfer Pool Creator

### Batch 5: Alpha Vault & Settings (3 forms)
- [ ] `/alpha-vault/create` - Create Alpha Vault
- [ ] `/settings/keypair` - Generate Keypair
- [ ] `/settings/airdrop` - Airdrop SOL

## 🚀 **Quick Start: Building Remaining Forms**

### Pattern to Follow (Copy from DLMM Create Pool)

Each form needs:

1. **Page Component**: `src/app/[protocol]/[action]/page.tsx`
   ```typescript
   'use client';
   import { useState } from 'react';
   import { useWallet } from '@solana/wallet-adapter-react';
   import { MainLayout } from '@/components/layout';
   import { Card, Input, Button } from '@/components/ui';
   import toast from 'react-hot-toast';

   export default function ActionPage() {
     const { publicKey } = useWallet();
     const [loading, setLoading] = useState(false);
     const [formData, setFormData] = useState({/* fields */});

     const handleSubmit = async (e) => {
       e.preventDefault();
       if (!publicKey) {
         toast.error('Connect wallet first');
         return;
       }

       setLoading(true);
       // Call SDK hook or API
       toast.success('Success!');
       setLoading(false);
     };

     return (
       <MainLayout>
         <form onSubmit={handleSubmit}>
           {/* Form fields */}
         </form>
       </MainLayout>
     );
   }
   ```

2. **SDK Hook**: `src/lib/meteora/use[Protocol].ts`
   ```typescript
   export function useDLMM() {
     const { connection } = useConnection();
     const { publicKey, sendTransaction } = useWallet();

     const someAction = async (params) => {
       // Build transaction with Meteora SDK
       // Sign and send with wallet
       return { success: true, signature };
     };

     return { someAction };
   }
   ```

3. **Types**: Already defined in `src/types/meteora.ts`

### Form Field Patterns

**Common Fields:**
```tsx
<Input
  label="Amount"
  type="number"
  required
  value={formData.amount}
  onChange={(e) => setFormData({...formData, amount: e.target.value})}
  helperText="Description of what this field does"
/>

<Select label="Option" value={formData.option} onChange={...}>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</Select>

<Button variant="primary" size="lg" loading={loading} type="submit">
  Submit Action
</Button>
```

**Wallet Check:**
```tsx
{!publicKey && (
  <Card className="border-warning/20 bg-warning/5">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-warning">Connect your wallet first</p>
      </div>
    </CardContent>
  </Card>
)}
```

## 🔧 **SDK Integration Guide**

### Install Meteora SDKs (Already Available via Workspace)

The SDKs are available through `@meteora-invent/studio`:
- `@meteora-ag/dlmm`
- `@meteora-ag/dynamic-amm-sdk`
- `@meteora-ag/cp-amm-sdk`
- `@meteora-ag/dynamic-bonding-curve-sdk`
- `@meteora-ag/alpha-vault`

### Example: DLMM Create Pool Integration

```typescript
import DLMM from '@meteora-ag/dlmm';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export function useDLMM() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createPool = async (params) => {
    // Build transaction
    const tx = await DLMM.createCustomizablePermissionlessLbPair2(
      connection,
      new BN(params.binStep),
      new PublicKey(params.baseMint),
      new PublicKey(params.quoteMint),
      new BN(activateBinId),
      new BN(params.feeBps || 0),
      'slot', // activation type
      false, // hasAlphaVault
      publicKey, // fee payer
    );

    // Sign and send
    const signature = await sendTransaction(tx, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature);

    return { success: true, signature };
  };

  return { createPool };
}
```

### Usage in Form

```typescript
import { useDLMM } from '@/lib/meteora/useDLMM';

function DLMMCreatePoolPage() {
  const { createPool } = useDLMM();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createPool(formData);
    toast.success(`Pool created! ${result.signature}`);
  };
}
```

## 📝 **Field Reference by Action**

### DLMM Seed Liquidity LFG
- baseMint (address)
- quoteMint (select: SOL/USDC/USDT)
- initialPrice (number)
- baseAmount (number)
- quoteAmount (number)
- distribution (select: spot/curve/bid-ask)

### DLMM Seed Single Bin
- baseMint (address)
- quoteMint (select)
- binId (number)
- baseAmount (number)
- quoteAmount (number)

### DLMM Set Pool Status
- poolAddress (address)
- status (select: enabled/disabled)

### DAMM v2 Create Balanced
- baseMint or create token (toggle)
- quoteMint (select)
- baseAmount (number)
- quoteAmount (number)
- fee (select: 0.25%/0.3%/1%)

### DAMM v2 Add Liquidity
- poolAddress (address)
- baseAmount (number)
- quoteAmount (number)
- slippage (number, default: 1%)

... (See `src/types/meteora.ts` for complete field definitions)

## 🎨 **Styling Conventions**

### Page Layout
```tsx
<MainLayout>
  <div className="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 className="text-3xl font-bold gradient-text">Title</h1>
      <p className="text-foreground-secondary">Description</p>
    </div>

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cards with sections */}
    </form>
  </div>
</MainLayout>
```

### Card Sections
```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>What this section does</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Form fields */}
  </CardContent>
</Card>
```

### Info/Warning Cards
```tsx
<Card className="border-info/20 bg-info/5">
  <CardContent className="p-4">
    <div className="flex gap-3">
      <span className="text-2xl">💡</span>
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-info">Helpful Info:</p>
        <ul className="text-foreground-secondary space-y-1">
          <li>• Point 1</li>
          <li>• Point 2</li>
        </ul>
      </div>
    </div>
  </CardContent>
</Card>
```

## 🧪 **Testing Checklist**

For each form:
- [ ] Form renders without errors
- [ ] All fields have labels and helper text
- [ ] Validation works (required fields)
- [ ] Wallet check shows warning when disconnected
- [ ] Loading state shows during submission
- [ ] Toast notifications appear
- [ ] Transaction link displays on success (if applicable)
- [ ] Network selector updates correctly
- [ ] Mobile responsive

## 📚 **Resources**

- **Meteora Docs**: https://docs.meteora.ag/
- **DLMM SDK**: https://github.com/MeteoraAg/dlmm-sdk
- **DAMM SDK**: https://github.com/MeteoraAg/amm-sdk
- **Wallet Adapter**: https://github.com/anza-xyz/wallet-adapter

## 🎯 **Next Steps**

1. **Build All Forms** - Use the pattern above to create remaining 22 forms
2. **Implement SDK Calls** - Replace placeholders with real Meteora SDK calls
3. **Test on Devnet** - Connect wallet and test each action
4. **Add Config File Support** - Allow users to upload/edit config files
5. **Deploy** - Host on Vercel/Netlify

## 💡 **Pro Tips**

- **Copy-Paste Friendly**: Use DLMM create pool as your template
- **Work in Batches**: Complete one protocol at a time
- **Test Early**: Run dev server frequently to catch errors
- **Use Types**: Reference `src/types/meteora.ts` for all parameters
- **Help Text is Key**: Every field should explain what it does
- **Wallet First**: Always check wallet connection before actions
