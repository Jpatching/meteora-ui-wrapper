# Devnet Testing Setup for Add/Remove Liquidity

## Current Status

**Problem:** Pool `8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1` has zero liquidity (empty pool).

**Solution:** We need pools WITH liquidity to properly test the add/remove liquidity functionality in the UI.

##  Strategy: Create a Properly Seeded Test Pool

Since the current implementation in `useDLMM.ts` line 1942 **already works correctly for pools with existing liquidity**, we just need to create a test pool and seed it.

### Option 1: Use Your Existing Pool via UI (Recommended)

The easiest way is to add liquidity through your UI, which will test the flow end-to-end:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to your pool:**
   ```
   http://localhost:3000/pool/8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1
   ```

3. **Get test tokens (if you don't have them):**
   - Click "Request Test Tokens" button in devnet banner
   - Or run backend faucet command

4. **Add initial liquidity:**
   - Click "Add Liquidity"
   - Select "Curve" strategy (safe default)
   - Enter amount: 10 tokens
   - Confirm transaction

5. **Once first liquidity is added:**
   - Pool will have bins/liquidity
   - Can test adding more liquidity
   - Can test removing liquidity
   - Chart will show live bins

### Option 2: Create Fresh Test Pool with Backend

If you want a clean slate, use the backend to create a properly configured pool:

1. **Ensure backend is running:**
   ```bash
   cd backend
   pnpm dev
   ```

2. **Create pool via backend API:**
   ```bash
   curl -X POST http://localhost:3001/api/test/create-pool \
     -H "Content-Type: application/json" \
     -d '{
       "protocol": "dlmm",
       "baseToken": "jytUCp6mgS1wAMgqCJ4ARkb6Yxcs3e3ouX9yyHh64DC",
       "quoteToken": "2ACyCPPhZkWV78y2oego6hhPzsDgrEpMtMuPfpU8QNdi",
       "binStep": 25,
       "initialPrice": 1.0
     }'
   ```

3. **The backend will:**
   - Create the pool
   - Automatically seed initial liquidity
   - Return the pool address
   - Add it to the database

4. **Navigate to the new pool in UI**

### Option 3: Use Meteora Invent CLI (Advanced)

If you want full control:

1. **Create pool:**
   ```bash
   cd /home/jp/projects/meteora-invent
   pnpm studio dlmm-create-pool --baseMint <TOKEN_MINT>
   ```

2. **For permissionless pools, add liquidity via UI**
   (Can't use `seedLiquiditySingleBin` - requires operator)

## Testing Checklist

Once you have a pool with liquidity, test these flows:

### ✅ Add Liquidity (Second Position)
- [ ] Navigate to pool with existing liquidity
- [ ] Click "Add Liquidity"
- [ ] Select strategy (Spot/Curve/Bid-Ask)
- [ ] Enter amount
- [ ] Submit and confirm
- [ ] Verify: New position appears
- [ ] Verify: Chart updates with new bins

### ✅ Remove Liquidity
- [ ] View your positions
- [ ] Click "Remove Liquidity" on a position
- [ ] Select percentage (25%, 50%, 75%, 100%)
- [ ] Submit and confirm
- [ ] Verify: Tokens returned to wallet
- [ ] Verify: Position updated or closed

### ✅ Chart Visualization
- [ ] Liquidity bars appear (purple/cyan)
- [ ] Active bin highlighted (green)
- [ ] Price labels correct
- [ ] Hover shows bin details

## Current Implementation Status

### ✅ Works for Pools WITH Liquidity (Line 1942)
```typescript
const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);
```
This correctly:
- Calls SDK method with proper parameters
- Returns `Transaction` (not {instructions})
- Handles signing with position keypair
- Works for permissionless pools

### ❌ Doesn't Work for EMPTY Pools (Line 1790)
```typescript
const seedResponse = await dlmmPool.seedLiquiditySingleBin(...);
```
This fails because:
- Requires operator permissions
- Pool is permissionless (no operator set)
- Returns "UnauthorizedAccess" error

## Recommended Approach

**For now:** Use the UI to add the first liquidity to your existing pool.

**Why:** This tests the actual user flow and is the intended way to add liquidity to permissionless pools.

**Next steps:**
1. Add first liquidity via UI
2. Test adding more liquidity (will use line 1942 code path)
3. Test removing liquidity
4. Verify chart updates work

## Token Addresses (from USE_THESE_TOKENS.txt)

```
TEST Token:  jytUCp6mgS1wAMgqCJ4ARkb6Yxcs3e3ouX9yyHh64DC
USDT Token:  2ACyCPPhZkWV78y2oego6hhPzsDgrEpMtMuPfpU8QNdi
```

Both have 1M supply and are ready to use on devnet.
