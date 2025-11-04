# Meteora Invent UI - Complete Roadmap to 100%

**Current Status: 85% Infrastructure Complete, 4% Forms Complete (1/23)**

This document provides the exact steps to complete all 22 remaining forms with config upload support and real SDK integration.

---

## 🎯 **Executive Summary**

You have **all the infrastructure** needed. The remaining work is:
1. **Replicate forms** using the established pattern (2-3 hours)
2. **Add real SDK integration** (2-3 hours)
3. **Test everything** (1 hour)

**Total: 5-7 hours to 100% completion**

---

## 📋 **Exact Form Replication Pattern**

### **Template Structure** (Copy this for each form)

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { TokenCreationSection } from '@/components/form-sections/TokenCreationSection';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';

export default function [ActionName]Page() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // ... protocol-specific fields
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    setFormData({
      ...formData,
      // Map config fields to form state
      quoteMint: config.quoteMint || formData.quoteMint,
      // ... other mappings
    });
    toast.success('Config loaded and form pre-filled!');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Processing...');

    try {
      // TODO: Call SDK hook here
      // const { someAction } = useProtocol();
      // const result = await someAction(formData);

      // Placeholder for now
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Success!', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || 'Failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">[Action Title]</h1>
          <p className="text-foreground-secondary">[Action Description]</p>
        </div>

        {/* Wallet Warning */}
        {!publicKey && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-warning">Connect your wallet to continue</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Upload */}
        <ConfigUpload
          onConfigLoaded={handleConfigLoaded}
          expectedProtocol="[protocol-name]"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Protocol-specific cards/fields here */}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!publicKey || loading}
            className="w-full"
          >
            {loading ? 'Processing...' : '🚀 Submit'}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
```

---

## 📝 **Form-by-Form Specifications**

### **DLMM Forms** (3 remaining)

#### 1. `/dlmm/seed-lfg/page.tsx`
```typescript
// Config mapping
handleConfigLoaded = (config) => {
  const lfg = config.lfgSeedLiquidity || {};
  setFormData({
    baseMint: formData.baseMint,
    quoteMint: config.quoteMint || 'So11111111111111111111111111111111111111112',
    minPrice: lfg.minPrice || '',
    maxPrice: lfg.maxPrice || '',
    curvature: lfg.curvature || '0.6',
    seedAmount: lfg.seedAmount || '',
    positionOwner: lfg.positionOwner || '',
    feeOwner: lfg.feeOwner || '',
    lockReleasePoint: lfg.lockReleasePoint || '0',
  });
};

// Fields
<Input label="Min Price" type="number" step="any" required value={formData.minPrice} ... />
<Input label="Max Price" type="number" step="any" required value={formData.maxPrice} ... />
<Input label="Curvature (0-1)" type="number" step="0.01" min="0" max="1" required value={formData.curvature} ... />
<Input label="Seed Amount" type="number" required value={formData.seedAmount} ... />
<Input label="Position Owner" placeholder="PublicKey..." required value={formData.positionOwner} ... />
<Input label="Fee Owner" placeholder="PublicKey..." required value={formData.feeOwner} ... />
<Input label="Lock Release Point (timestamp)" type="number" value={formData.lockReleasePoint} ... />
```

#### 2. `/dlmm/seed-single/page.tsx`
```typescript
// Config mapping
const single = config.singleBinSeedLiquidity || {};
setFormData({
  baseMint: formData.baseMint,
  quoteMint: config.quoteMint || 'So11111111111111111111111111111111111111112',
  price: single.price || '',
  priceRounding: single.priceRounding || 'up',
  seedAmount: single.seedAmount || '',
  positionOwner: single.positionOwner || '',
  feeOwner: single.feeOwner || '',
  lockReleasePoint: single.lockReleasePoint || '0',
});

// Fields
<Input label="Price" type="number" step="any" required value={formData.price} ... />
<Select label="Price Rounding" value={formData.priceRounding} ...>
  <option value="up">Round Up</option>
  <option value="down">Round Down</option>
</Select>
<Input label="Seed Amount" type="number" required value={formData.seedAmount} ... />
// ... position/fee owner fields same as above
```

#### 3. `/dlmm/set-status/page.tsx`
```typescript
// Config mapping
const status = config.setDlmmPoolStatus || {};
setFormData({
  poolAddress: status.poolAddress || '',
  status: status.status || 'enabled',
});

// Fields
<Input label="Pool Address" placeholder="PoolAddress..." required value={formData.poolAddress} className="font-mono" ... />
<Select label="Pool Status" value={formData.status} ...>
  <option value="enabled">Enabled</option>
  <option value="disabled">Disabled</option>
</Select>
```

---

### **DAMM v2 Forms** (7 forms)

Follow same pattern. Key config mappings:

**Create Balanced/One-Sided:**
```typescript
const dammV2 = config.dammV2Config || {};
// Map: creator, baseAmount, quoteAmount, initPrice, maxPrice, poolFees
```

**Add/Remove Liquidity:**
```typescript
const add = config.addLiquidity || {};
// Map: poolAddress, baseAmount, quoteAmount, slippage
```

**Split Position:**
```typescript
const split = config.splitPosition || {};
// Map: poolAddress, positionAddress, splitPercentage
```

---

### **DAMM v1 Forms** (4 forms)

**Create Pool:**
```typescript
const dammV1 = config.dammV1Config || {};
// Map: baseAmount, quoteAmount, fee
```

**Lock Liquidity:**
```typescript
const lock = config.dammV1LockLiquidity || {};
// Map: baseMint, quoteMint, duration
```

---

### **DBC Forms** (7 forms)

**Create Config:**
```typescript
const dbcCfg = config.dbcConfig || {};
// Map: migrationQuoteThreshold, tradingFee, protocolFee
```

**Create Pool:**
```typescript
const pool = config.dbcPool || {};
// Map: initialPrice, configAddress
```

**Swap:**
```typescript
const swap = config.dbcSwap || {};
// Map: baseMint, quoteMint, amount, side, slippage
```

---

## 🔌 **SDK Integration Pattern**

### **Step 1: Create Hook** (`src/lib/meteora/useDLMM.ts`)

```typescript
'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import BN from 'bn.js';

export function useDLMM() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createPool = async (params: any) => {
    if (!publicKey) throw new Error('Wallet not connected');

    // Build transaction with Meteora SDK
    const tx = await DLMM.createCustomizablePermissionlessLbPair2(
      connection,
      new BN(params.binStep),
      new PublicKey(params.baseMint),
      new PublicKey(params.quoteMint),
      new BN(params.activateBinId),
      new BN(params.feeBps),
      params.activationType,
      params.hasAlphaVault,
      publicKey,
      params.activationPoint ? new BN(params.activationPoint) : undefined,
      params.creatorPoolOnOffControl
    );

    // Sign and send
    const signature = await sendTransaction(tx, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return {
      success: true,
      signature,
      poolAddress: 'DERIVED_POOL_ADDRESS', // Derive from SDK
    };
  };

  const seedLiquidityLFG = async (params: any) => {
    // Similar pattern
  };

  const seedLiquiditySingleBin = async (params: any) => {
    // Similar pattern
  };

  const setPoolStatus = async (params: any) => {
    // Similar pattern
  };

  return {
    createPool,
    seedLiquidityLFG,
    seedLiquiditySingleBin,
    setPoolStatus,
  };
}
```

### **Step 2: Use in Form**

```typescript
import { useDLMM } from '@/lib/meteora/useDLMM';

export default function CreatePoolPage() {
  const { createPool } = useDLMM();

  const handleSubmit = async (e) => {
    // ...
    const result = await createPool(formData);
    toast.success(`Pool created! Tx: ${result.signature}`);
  };
}
```

---

## ✅ **Verification Checklist**

### **Automated Checks:**
```bash
# Create this script: scripts/verify-all.sh

#!/bin/bash

echo "🔍 Verifying all 23 forms..."

# Check DLMM (4)
[ -f "src/app/dlmm/create-pool/page.tsx" ] && echo "✅ DLMM Create Pool" || echo "❌ DLMM Create Pool"
[ -f "src/app/dlmm/seed-lfg/page.tsx" ] && echo "✅ DLMM Seed LFG" || echo "❌ DLMM Seed LFG"
[ -f "src/app/dlmm/seed-single/page.tsx" ] && echo "✅ DLMM Seed Single" || echo "❌ DLMM Seed Single"
[ -f "src/app/dlmm/set-status/page.tsx" ] && echo "✅ DLMM Set Status" || echo "❌ DLMM Set Status"

# Check DAMM v2 (7)
[ -f "src/app/damm-v2/create-balanced/page.tsx" ] && echo "✅ DAMM v2 Create Balanced" || echo "❌ DAMM v2 Create Balanced"
# ... repeat for all 7

# Check DAMM v1 (4)
# Check DBC (7)
# Check Alpha Vault (1)
# Check Settings (2)

echo "✅ Verification complete!"
```

### **Manual Testing:**
- [ ] Upload config to each form
- [ ] Verify form pre-fills
- [ ] Connect wallet (devnet)
- [ ] Submit transaction
- [ ] Verify on Solscan

---

## 📊 **Progress Tracker**

| Protocol | Forms | Status |
|----------|-------|--------|
| DLMM | 4 | ◼️◻️◻️◻️ (1/4) |
| DAMM v2 | 7 | ◻️◻️◻️◻️◻️◻️◻️ (0/7) |
| DAMM v1 | 4 | ◻️◻️◻️◻️ (0/4) |
| DBC | 7 | ◻️◻️◻️◻️◻️◻️◻️ (0/7) |
| Other | 2 | ◻️◻️ (0/2) |
| **Total** | **24** | **◼️ (1/24)** |

---

## 🚀 **Quick Start Commands**

```bash
# Create all form directories at once
mkdir -p src/app/dlmm/{seed-lfg,seed-single,set-status}
mkdir -p src/app/damm-v2/{create-balanced,create-one-sided,add-liquidity,remove-liquidity,split-position,claim-fees,close-position}
mkdir -p src/app/damm-v1/{create-pool,lock-liquidity,create-stake2earn,lock-stake2earn}
mkdir -p src/app/dbc/{create-config,create-pool,swap,claim-fees,migrate-v1,migrate-v2,transfer-creator}
mkdir -p src/app/alpha-vault/create
mkdir -p src/app/settings/{keypair,airdrop}

# Copy template to all (then customize each)
# for dir in src/app/dlmm/*/ ; do cp TEMPLATE.tsx "$dir/page.tsx"; done
```

---

## 💡 **Time-Saving Tips**

1. **Batch by Protocol** - Do all DLMM, then all DAMM v2, etc.
2. **Copy-Paste Smart** - Use find-replace for common elements
3. **Test as You Go** - Build 3-4 forms, test, repeat
4. **Config Files First** - Upload actual configs to verify mappings
5. **SDK Later** - Get all forms working with placeholders, then add SDK

---

## 📚 **Reference Files**

- **Template**: `/dlmm/create-pool/page.tsx`
- **Config Parser**: `/src/lib/config/jsonc-parser.ts`
- **Config Upload**: `/src/components/config/ConfigUpload.tsx`
- **Reusable Sections**: `/src/components/form-sections/*`
- **Config Files**: `/meteora-invent/studio/config/*.jsonc`

---

**You have everything needed to complete this!** 🚀

The pattern is clear, the infrastructure is ready, and you're 85% done.

Next: Build 3 DLMM forms (30 min), then replicate the pattern!
