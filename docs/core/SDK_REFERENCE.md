# Meteora SDK Reference Guide

**Purpose**: Quick reference for implementing all Meteora protocols using official SDKs

**Official Resources**:
- Main Docs: https://github.com/MeteoraAg/docs
- DLMM SDK: https://github.com/MeteoraAg/dlmm-sdk
- Dynamic Fee Sharing: https://github.com/MeteoraAg/dynamic-fee-sharing
- Presale: https://github.com/MeteoraAg/presale
- All Meteora Repos: https://github.com/MeteoraAg

---

## 📦 Installed SDK Packages

```json
{
  "@meteora-ag/dlmm": "^1.7.3",
  "@meteora-ag/dynamic-amm-sdk": "^1.4.1",
  "@meteora-ag/cp-amm-sdk": "^1.1.4",
  "@meteora-ag/dynamic-bonding-curve-sdk": "^1.4.4",
  "@meteora-ag/alpha-vault": "^1.1.14",
  "bn.js": "^5.2.2"
}
```

---

## 🔵 DLMM (Dynamic Liquidity Market Maker)

**Package**: `@meteora-ag/dlmm`
**Installed Version**: `1.7.3`
**CLI Reference**: `/studio/src/lib/dlmm/index.ts`

### Key Static Methods

```typescript
import DLMM from '@meteora-ag/dlmm';

// Create customizable permissionless pool (v2)
static createCustomizablePermissionlessLbPair2(
  connection: Connection,
  binStep: BN,
  tokenX: PublicKey,
  tokenY: PublicKey,
  activeId: BN,
  feeBps: BN,
  activationType: ActivationType,
  hasAlphaVault: boolean,
  creatorKey: PublicKey,
  activationPoint?: BN,
  creatorPoolOnOffControl?: boolean,
  opt?: Opt
): Promise<Transaction>

// Create customizable permissionless pool (v1)
static createCustomizablePermissionlessLbPair(...)

// Create standard LB pair
static createLbPair(...)
static createLbPair2(...)

// Get instance for existing pool
static create(connection: Connection, dlmm: PublicKey, opt?: Opt): Promise<DLMM>
static createMultiple(connection: Connection, dlmmList: Array<PublicKey>, opt?: Opt): Promise<DLMM[]>
```

### Helper Functions

```typescript
// Price calculations
static getPricePerLamport(baseDecimals: number, quoteDecimals: number, price: number): Decimal
static getBinIdFromPrice(price: Decimal, binStep: number, min: boolean): BN

// Derive addresses
deriveCustomizablePermissionlessLbPair(
  tokenX: PublicKey,
  tokenY: PublicKey,
  programId: PublicKey
): [PublicKey, number]
```

### Implementation Status

| Function | Status | Location |
|----------|--------|----------|
| Create Pool | ✅ DONE | `useDLMM.ts:26` |
| Seed LFG | ⏳ TODO | CLI: `/studio/src/lib/dlmm/index.ts:187` |
| Seed Single Bin | ⏳ TODO | CLI: `/studio/src/lib/dlmm/index.ts:398` |
| Set Pool Status | ⏳ TODO | CLI: `/studio/src/lib/dlmm/index.ts:619` |

---

## 🔷 DAMM v2 (Dynamic AMM v2)

**Package**: `@meteora-ag/dynamic-amm-sdk`
**Installed Version**: `1.4.1`
**CLI Reference**: `/studio/src/lib/damm_v2/index.ts`

### Expected Methods

```typescript
import { DynamicAmm } from '@meteora-ag/dynamic-amm-sdk';

// Create pool
// Add liquidity
// Remove liquidity
// Swap
// Claim fees
```

### Implementation Status

| Function | Status | Forms |
|----------|--------|-------|
| Create Balanced Pool | ⏳ TODO | `damm-v2/create-balanced` |
| Create One-Sided Pool | ⏳ TODO | `damm-v2/create-one-sided` |
| Add Liquidity | ⏳ TODO | `damm-v2/add-liquidity` |
| Remove Liquidity | ⏳ TODO | `damm-v2/remove-liquidity` |
| Split Position | ⏳ TODO | `damm-v2/split-position` |
| Claim Fees | ⏳ TODO | `damm-v2/claim-fees` |
| Close Position | ⏳ TODO | `damm-v2/close-position` |

---

## 🔶 DAMM v1 (Constant Product AMM)

**Package**: `@meteora-ag/cp-amm-sdk`
**Installed Version**: `1.1.4`
**CLI Reference**: `/studio/src/lib/damm_v1/index.ts`

### Expected Methods

```typescript
import { ConstantProductSwap } from '@meteora-ag/cp-amm-sdk';

// Create constant product pool (x * y = k)
// Lock liquidity
// Create stake2earn farm
// Lock farm
```

### Implementation Status

| Function | Status | Forms |
|----------|--------|-------|
| Create Pool | ⏳ TODO | `damm-v1/create-pool` |
| Lock Liquidity | ⏳ TODO | `damm-v1/lock-liquidity` |
| Create Stake2Earn | ⏳ TODO | `damm-v1/create-stake2earn` |
| Lock Stake2Earn | ⏳ TODO | `damm-v1/lock-stake2earn` |

---

## 🟣 DBC (Dynamic Bonding Curve)

**Package**: `@meteora-ag/dynamic-bonding-curve-sdk`
**Installed Version**: `1.4.4`
**CLI Reference**: `/studio/src/lib/dbc/index.ts`

### Expected Methods

```typescript
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const dbcInstance = new DynamicBondingCurveClient(connection, commitment);

// Pool operations
dbcInstance.pool.createPool(...)
dbcInstance.pool.swap(...)
dbcInstance.pool.migrateToAmmPool(...)

// Fee operations
dbcInstance.pool.claimFee(...)

// Creator operations
dbcInstance.pool.transferCreator(...)
```

### Implementation Status

| Function | Status | Forms |
|----------|--------|-------|
| Create Config | ⏳ TODO | `dbc/create-config` |
| Create Pool | ⏳ TODO | `dbc/create-pool` |
| Swap | ⏳ TODO | `dbc/swap` |
| Claim Fees | ⏳ TODO | `dbc/claim-fees` |
| Migrate to v1 | ⏳ TODO | `dbc/migrate-v1` |
| Migrate to v2 | ⏳ TODO | `dbc/migrate-v2` |
| Transfer Creator | ⏳ TODO | `dbc/transfer-creator` |

---

## 🟢 Alpha Vault

**Package**: `@meteora-ag/alpha-vault`
**Installed Version**: `1.1.14`
**CLI Reference**: `/studio/src/lib/alpha_vault/index.ts`

### Expected Methods

```typescript
import { AlphaVault } from '@meteora-ag/alpha-vault';

// Create automated vault
// Deposit
// Withdraw
// Rebalance
```

### Implementation Status

| Function | Status | Forms |
|----------|--------|-------|
| Create Vault | ⏳ TODO | `alpha-vault/create` |

---

## 🛠️ Implementation Pattern

### Standard Hook Pattern

```typescript
'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import SDK from '@meteora-ag/[package-name]';
import BN from 'bn.js';
import { useNetwork } from '@/contexts/NetworkContext';

export function use[Protocol]() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();

  const [functionName] = async (params: ParamsType) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // 1. Parse/validate parameters
      const param1 = new PublicKey(params.address);
      const param2 = new BN(params.amount);

      // 2. Call SDK method (reference CLI lib file)
      const tx = await SDK.methodName(
        connection,
        param1,
        param2,
        publicKey,
        { cluster: network }
      );

      // 3. Send transaction via wallet adapter
      const signature = await sendTransaction(tx, connection);

      // 4. Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      // 5. Return result
      return {
        success: true,
        signature,
        // ... other derived data
      };
    } catch (error: any) {
      console.error(`Error in ${functionName}:`, error);
      throw new Error(error.message || `Failed to ${functionName}`);
    }
  };

  return { [functionName] };
}
```

### Steps for Each Protocol

1. **Read CLI lib file** (`/studio/src/lib/[protocol]/index.ts`)
2. **Identify SDK methods** used in the CLI
3. **Create hook** following the pattern above
4. **Test with devnet** - verify transactions work
5. **Update forms** to use the hook
6. **Document** in this file

---

## 📊 Overall Progress

| Protocol | Hook | Functions | Forms Updated | Tested |
|----------|------|-----------|---------------|--------|
| DLMM | ✅ Created | 🟡 1/4 (25%) | 🟡 1/4 (25%) | ⏳ 0/4 |
| DAMM v2 | ⏳ TODO | ⏳ 0/7 (0%) | ⏳ 0/7 (0%) | ⏳ 0/7 |
| DAMM v1 | ⏳ TODO | ⏳ 0/4 (0%) | ⏳ 0/4 (0%) | ⏳ 0/4 |
| DBC | ⏳ TODO | ⏳ 0/7 (0%) | ⏳ 0/7 (0%) | ⏳ 0/7 |
| Alpha Vault | ⏳ TODO | ⏳ 0/1 (0%) | ⏳ 0/1 (0%) | ⏳ 0/1 |

**Total**: 1/23 functions (4%)

---

## 🎯 Next Implementation Priorities

### Priority 1: Complete DLMM (3 functions)
**Why**: Already have working example, familiar with the SDK
**Time**: 1-2 hours
**Functions**:
1. Seed LFG liquidity
2. Seed single bin liquidity
3. Set pool status

### Priority 2: DAMM v2 (7 functions)
**Why**: Most commonly used protocol
**Time**: 2-3 hours
**Functions**: Create pools, add/remove liquidity, manage positions

### Priority 3: DBC (7 functions)
**Why**: Important for token launches
**Time**: 2 hours
**Functions**: Create pool, swap, migrate, fees

### Priority 4: DAMM v1 & Alpha Vault (5 functions)
**Why**: Less commonly used
**Time**: 1-2 hours

---

## 🔍 Finding SDK Documentation

### Method 1: Check Installed Package
```bash
# View TypeScript definitions
cat node_modules/@meteora-ag/[package]/dist/index.d.ts

# Find all static methods
grep "static.*(" node_modules/@meteora-ag/[package]/dist/index.d.ts
```

### Method 2: Reference CLI Implementation
```bash
# See how CLI uses the SDK
cat /home/jp/projects/meteora-invent/studio/src/lib/[protocol]/index.ts
```

### Method 3: Official GitHub Repos
- DLMM: https://github.com/MeteoraAg/dlmm-sdk
- All Repos: https://github.com/MeteoraAg

---

## ✅ Verification Checklist

For each implemented function:

- [ ] Hook created in `/src/lib/meteora/use[Protocol].ts`
- [ ] SDK method called correctly
- [ ] Parameters validated and converted (PublicKey, BN, etc.)
- [ ] Transaction sent via wallet adapter
- [ ] Transaction confirmed
- [ ] Error handling implemented
- [ ] Form updated to use hook
- [ ] Tested on devnet
- [ ] Transaction verified on Solscan
- [ ] Documented in this file

---

## 🎊 Success Criteria

Project is complete when:
- ✅ All 5 hooks created
- ✅ All 23 functions implemented
- ✅ All 25 forms use real SDK
- ✅ All functions tested on devnet
- ✅ Documentation complete

**Current Status**: 4% complete (1/23 functions)
**Estimated Remaining**: 7-9 hours

---

**Last Updated**: October 31, 2025
**Next Step**: Test DLMM create pool on devnet, then implement remaining DLMM functions
