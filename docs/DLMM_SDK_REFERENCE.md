# Meteora DLMM SDK Reference

Source: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions

## Core LP Operations

### 1. initializePositionAndAddLiquidityByStrategy

**Purpose:** Create a new position AND add initial liquidity in one transaction.

**Signature:**
```typescript
async initializePositionAndAddLiquidityByStrategy({
    positionPubKey,
    totalXAmount,
    totalYAmount,
    strategy,
    user,
    slippage,
}: TInitializePositionAndAddLiquidityParamsByStrategy): Promise<Transaction>
```

**Parameters:**
- `positionPubKey: PublicKey` - New position account keypair public key
- `totalXAmount: BN` - Total token X lamports to deposit
- `totalYAmount: BN` - Total token Y lamports to deposit
- `strategy: StrategyParameters` - Liquidity distribution parameters
  - `strategyType: StrategyType` - Distribution type
  - `minBinId: number` - Starting bin ID
  - `maxBinId: number` - Ending bin ID
- `user: PublicKey` - User wallet address
- `slippage?: number` - Optional slippage percentage (default: 1%)

**Returns:** `Promise<Transaction>` - Ready-to-sign transaction

**Example:**
```typescript
const positionKeypair = new Keypair();
const strategy = {
  strategyType: StrategyType.Spot,
  minBinId: 8388600,
  maxBinId: 8388620,
};

const tx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: positionKeypair.publicKey,
  totalXAmount: new BN(1_000_000_000), // 1 token with 9 decimals
  totalYAmount: new BN(1_000_000_000),
  strategy,
  user: wallet.publicKey,
  slippage: 1
});

// Sign and send
await sendTransaction(tx, connection, [wallet, positionKeypair]);
```

---

### 2. addLiquidityByStrategy

**Purpose:** Add more liquidity to an existing position.

**Signature:**
```typescript
async addLiquidityByStrategy({
    positionPubKey,
    totalXAmount,
    totalYAmount,
    strategy,
    user,
    slippage,
}: TInitializePositionAndAddLiquidityParamsByStrategy): Promise<Transaction>
```

**Parameters:** Same as `initializePositionAndAddLiquidityByStrategy`

**Key Difference:** Works on existing positions; `initializePositionAndAddLiquidityByStrategy` creates new positions.

---

### 3. seedLiquiditySingleBin (OPERATOR ONLY)

**Purpose:** Seed initial liquidity to a single bin at specific price (requires operator permissions).

**Signature:**
```typescript
async seedLiquiditySingleBin(
    payer: PublicKey,
    base: PublicKey,
    seedAmount: BN,
    price: number,
    roundingUp: boolean,
    positionOwner: PublicKey,
    feeOwner: PublicKey,
    operator: PublicKey,
    lockReleasePoint: BN,
    shouldSeedPositionOwner?: boolean
): Promise<SeedLiquiditySingleBinResponse>
```

**When to Use:**
- ⚠️ **ONLY for pools with operator control**
- Before pool activation
- Alpha vault initialization
- NOT for permissionless pools

---

## Strategy Types

```typescript
enum StrategyType {
  Spot = 0,  // Concentrated around current price
  Curve = 1,         // Curved distribution
  BidAsk = 2,        // Asymmetric bids/asks
}
```

**Strategy Parameter Structure:**
```typescript
interface StrategyParameters {
  strategyType: StrategyType;
  minBinId: number;  // Starting bin ID
  maxBinId: number;  // Ending bin ID
}
```

---

## Empty Pool Handling

**For Permissionless Pools:**
1. ✅ Use `initializePositionAndAddLiquidityByStrategy` for first liquidity
2. ✅ Automatically initializes required bin arrays
3. ✅ Works for any user (no operator needed)

**For Operator-Controlled Pools:**
1. Use `seedLiquiditySingleBin` before activation
2. Requires operator permissions
3. Sets deterministic initial price

---

## Bin Array Management

**Automatic Initialization:**
```typescript
// Bin arrays automatically created during position initialization
await dlmmPool.initializePositionAndAddLiquidityByStrategy({...})
```

**Manual Initialization (Advanced):**
```typescript
const binArrayIndexes = [new BN(-1), new BN(0), new BN(1)];
const instructions = await dlmmPool.initializeBinArrays(
  binArrayIndexes,
  funderPublicKey
);
```

---

## Complete Working Example

```typescript
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// 1. Connect and load pool
const connection = new Connection('https://api.devnet.solana.com');
const poolAddress = new PublicKey('YOUR_POOL_ADDRESS');
const dlmmPool = await DLMM.create(connection, poolAddress, { cluster: 'devnet' });

// 2. Prepare amounts (with proper decimals)
const tokenXAmount = new BN(1_000_000_000); // 1 token with 9 decimals
const tokenYAmount = new BN(1_000_000_000); // 1 token with 9 decimals

// 3. Define strategy
const activeBinId = dlmmPool.lbPair.activeId;
const strategy = {
  strategyType: StrategyType.Spot,
  minBinId: activeBinId,      // Start at active bin
  maxBinId: activeBinId + 20, // 20 bins above
};

// 4. Create position keypair
const positionKeypair = Keypair.generate();

// 5. Build transaction
const tx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: positionKeypair.publicKey,
  totalXAmount: tokenXAmount,
  totalYAmount: tokenYAmount,
  strategy,
  user: wallet.publicKey,
  slippage: 1, // 1% slippage
});

// 6. Sign and send
const signature = await connection.sendTransaction(tx, [wallet, positionKeypair]);
await connection.confirmTransaction(signature, 'confirmed');

console.log('Position created:', positionKeypair.publicKey.toBase58());
console.log('Transaction:', signature);
```

---

## Common Errors & Solutions

### Error: "InvalidStrategyParameters" (0x17a6 / 6054)
**Cause:** Invalid bin range or strategy type
**Solution:** Ensure `minBinId <= activeBinId <= maxBinId`

### Error: "UnauthorizedAccess" (0x178f / 6031)
**Cause:** Trying to use operator-only functions on permissionless pool
**Solution:** Use `initializePositionAndAddLiquidityByStrategy` instead of `seedLiquiditySingleBin`

### Error: "InsufficientBalance"
**Cause:** Not enough tokens in wallet
**Solution:** Ensure both token X and token Y balances are sufficient

---

## Best Practices

1. **Always start at active bin:** `minBinId = activeBinId`
2. **Keep range narrow:** Max 20 bins for safety
3. **Use proper decimals:** Multiply by 10^decimals
4. **Handle edge cases:** Active bin near 0 requires special handling
5. **Initialize bin arrays:** SDK handles automatically in most cases
