# Devnet Pool Testing Guide

This guide explains how to create and test a fully functional SOL-USDC DLMM pool on Solana devnet for comprehensive UI testing.

## 🎯 Purpose

Create a production-like devnet pool with real liquidity to test:
- ✅ Pool creation and seeding
- ✅ Liquidity distribution visualization
- ✅ Adding liquidity (single-sided & dual-sided)
- ✅ Removing liquidity
- ✅ Opening/closing positions
- ✅ Price range selection
- ✅ Live on-chain updates
- ✅ Chart integration (Birdeye, DEXScreener, GeckoTerminal)

## 📋 Prerequisites

### 1. Devnet SOL
You need ~5 SOL for pool creation, seeding, and testing:
```bash
# Get your wallet address
solana address

# Request devnet SOL (run multiple times if needed)
solana airdrop 2 --url devnet
```

### 2. Devnet USDC
Get devnet USDC tokens (~500 USDC recommended):

**Option A: Use existing devnet USDC faucet**
- Visit: https://spl-token-faucet.com/?token-name=USDC-Dev
- Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Option B: Use in-app faucet**
- Switch UI to devnet
- Use DevnetFaucet component to airdrop USDC

### 3. Wallet Setup
```bash
# Create wallet if you don't have one
solana-keygen new --outfile ~/.config/solana/id.json

# Or set custom wallet path
export WALLET_PATH=/path/to/your/wallet.json
```

### 4. Backend Running
```bash
# Terminal 1: Start backend
cd meteora-ui-wrapper
npm run backend:dev

# Terminal 2: Start frontend
npm run dev
```

## 🚀 Quick Start (All-in-One)

Run the complete setup script that creates the pool, seeds liquidity, and adds it to the database:

```bash
cd backend
./scripts/setup-complete-devnet-pool.sh
```

This script will:
1. ✅ Create SOL-USDC DLMM pool
2. ✅ Seed initial liquidity (single-sided)
3. ✅ Seed liquidity distribution (dual-sided with Spot strategy)
4. ✅ Add pool to PostgreSQL database
5. ✅ Print pool address and next steps

**Expected output:**
```
✅ Pool created: <POOL_ADDRESS>
✅ Single-sided seeding successful!
✅ Dual-sided seeding successful!
✅ Pool added to database!

🎯 Next Steps:
   1. Open UI at http://localhost:3000
   2. Switch to 'Devnet' in network selector
   3. Pool should appear in dashboard
```

## 📝 Manual Setup (Step-by-Step)

If you want more control or need to debug, run each step manually:

### Step 1: Create Pool

```bash
cd backend
tsx scripts/create-sol-usdc-devnet-pool.ts
```

**This creates:**
- SOL-USDC DLMM pool with bin step 25 (0.25%)
- Initial price: ~180 USDC per SOL
- Trading fee: 30 bps (0.3%)
- Timestamp activation (immediate)

**Save the pool address from output!**

### Step 2: Seed Liquidity

```bash
tsx scripts/seed-devnet-pool.ts <POOL_ADDRESS>
```

**This seeds:**
- **Phase 1 (Single-sided)**: 0.1 SOL into single bin to establish price
- **Phase 2 (Dual-sided)**: 2 SOL + 360 USDC distributed across ±20 bins

**Why two phases?**
- Fresh DLMM pools need single-sided seeding first to establish the initial price
- Then dual-sided seeding creates the liquidity distribution for realistic testing

### Step 3: Add to Database

```bash
./scripts/add-pool-to-db.sh <POOL_ADDRESS>
```

**This:**
- Fetches pool data from on-chain using Meteora SDK
- Stores in PostgreSQL with network='devnet'
- Makes pool queryable by UI

## 🧪 Testing the Pool

### Test Checklist

Open http://localhost:3000 and verify:

#### 1. Pool Discovery
- [ ] Switch network selector to "Devnet"
- [ ] Pool appears in home page pool table
- [ ] Shows SOL-USDC with correct stats (TVL, volume, etc.)

#### 2. Pool Detail Page
- [ ] Click pool → Detail page loads (NO 404!)
- [ ] Pool header shows SOL-USDC with correct price
- [ ] Liquidity distribution chart displays bins
- [ ] Chart shows price on X-axis, liquidity on Y-axis
- [ ] Active bin is highlighted

#### 3. Add Liquidity (Populated Pool)
- [ ] "Add Liquidity" panel shows current price range
- [ ] Price range picker is interactive
- [ ] Can drag min/max price handles
- [ ] Price range shows on liquidity distribution chart
- [ ] Strategy selector works (Spot/Curve/Bid-Ask)
- [ ] Ratio control works (One-Side/50-50)

#### 4. Add Liquidity Transaction
- [ ] Enter amount (e.g., 0.5 SOL)
- [ ] Click "Add Liquidity"
- [ ] Transaction succeeds
- [ ] Toast shows success with Solscan link
- [ ] Position appears in "Your Positions" section
- [ ] Chart updates with new liquidity

#### 5. Remove Liquidity
- [ ] Click "Remove" on your position
- [ ] Enter percentage to remove (e.g., 50%)
- [ ] Transaction succeeds
- [ ] Position updates with reduced liquidity
- [ ] Chart reflects removal

#### 6. On-Chain Verification
- [ ] View pool on Solscan: `https://solscan.io/account/<POOL_ADDRESS>?cluster=devnet`
- [ ] See bin accounts created
- [ ] See position accounts for your positions
- [ ] Transaction history shows your adds/removes

### Expected Behavior

**Empty Pool vs Populated Pool:**
- ✅ **Empty pool** (0 bins): UI uses `seedLiquiditySingleBin()` or `seedLiquidity()`
- ✅ **Populated pool** (has bins): UI uses `addLiquidityByStrategy()`
- ✅ **Price range validation**: Min price must be >= current price for empty pools

**Liquidity Distribution Chart:**
- Should show histogram of bins with liquidity amounts
- Active bin should be highlighted in different color
- Your selected price range should overlay on chart
- Updates after each transaction

## 🐛 Troubleshooting

### Pool Not Appearing on Home Page

**Symptom:** Pool doesn't show in dashboard after creation

**Solutions:**
1. Check pool is in database:
   ```bash
   # Connect to PostgreSQL
   psql -U metatools -d metatools_db

   # Query pools
   SELECT pool_address, pool_name, network FROM pools WHERE network = 'devnet';
   ```

2. Force backend cache refresh:
   ```bash
   curl -X POST http://localhost:4000/api/pools/refresh
   ```

3. Manually add pool:
   ```bash
   ./scripts/add-pool-to-db.sh <POOL_ADDRESS>
   ```

### Pool Detail Page Shows 404

**Symptom:** Click pool → "Pool Not Found"

**Cause:** Pool not in database or network mismatch

**Solutions:**
1. Verify network is set to "Devnet" in UI
2. Check pool exists in database (see above)
3. Add pool to database (see above)
4. Check backend logs for errors:
   ```bash
   # Backend should log:
   ✅ Found pool <ADDRESS> on devnet (dlmm)

   # If you see:
   ⚠️ Pool <ADDRESS> not found on devnet
   # → Pool not in database
   ```

### "Insufficient Balance" Errors

**Symptom:** Can't add liquidity due to balance errors

**Solutions:**
1. **SOL**: Get more devnet SOL
   ```bash
   solana airdrop 2 --url devnet
   ```

2. **USDC**: Use devnet faucet or in-app airdrop

3. **Wrong token**: Make sure you're on devnet network!

### Seeding Fails with "Invalid Price"

**Symptom:** Seeding script fails with price-related error

**Cause:** Price range below pool's current price (not allowed for empty pools)

**Solution:**
- Don't modify seed script's price calculations
- If pool exists and has liquidity, use manual UI to add instead

### Chart Not Showing Bins

**Symptom:** Liquidity distribution chart is empty

**Possible causes:**
1. Pool has no liquidity yet → Seed liquidity first
2. Bin data not loading → Check browser console for errors
3. Network mismatch → Verify UI network matches pool network

**Debug:**
```javascript
// Browser console
localStorage.getItem('network') // Should be 'devnet'
```

## 🔧 Advanced Configuration

### Customize Pool Parameters

Edit `backend/scripts/create-sol-usdc-devnet-pool.ts`:

```typescript
const POOL_CONFIG = {
  binStep: 25,           // Change bin step (10, 25, 50, 100)
  feeBps: 30,            // Change trading fee
  initialPrice: 180,     // Change initial price
  hasAlphaVault: false,  // Enable Alpha Vault
};
```

### Customize Seeding Amounts

Edit `backend/scripts/seed-devnet-pool.ts`:

```typescript
const SEED_CONFIG = {
  singleSided: {
    enabled: true,
    solAmount: 0.1,      // Adjust single-sided amount
  },
  dualSided: {
    enabled: true,
    solAmount: 2.0,      // Adjust SOL amount
    usdcAmount: 360,     // Adjust USDC amount
    strategy: StrategyType.Spot,
    binRange: 20,        // Change bin distribution width
  },
};
```

## 📚 Additional Resources

- **Meteora DLMM Docs**: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
- **Solana Devnet Faucet**: https://faucet.solana.com/
- **Solscan Devnet**: https://solscan.io/?cluster=devnet
- **SPL Token Faucet**: https://spl-token-faucet.com/

## 🎯 Success Criteria

You've successfully completed testing when:

✅ Pool appears on home page in devnet
✅ Pool detail page loads without 404
✅ Liquidity distribution chart shows bins
✅ Can add liquidity (both single and dual-sided)
✅ Can remove liquidity
✅ Positions display correctly
✅ All transactions confirm on-chain
✅ Charts update after transactions
✅ Price range selection works intuitively

## 💡 Tips

1. **Use Small Amounts**: Start with 0.1-1 SOL for testing
2. **Multiple Positions**: Create 2-3 positions to test the positions panel
3. **Different Strategies**: Try Spot, Curve, and Bid-Ask strategies
4. **Price Ranges**: Test both narrow and wide price ranges
5. **Remove Partial**: Test removing 25%, 50%, 75% of liquidity
6. **Console Logs**: Keep browser console open to debug issues

## 🚨 Important Notes

- **Devnet pools are ephemeral**: They may get cleared during network resets
- **No real value**: Devnet SOL and USDC have no monetary value
- **Rate limits**: Devnet RPC may rate-limit during high usage
- **Faucet limits**: Some faucets limit airdrops per wallet per day

---

**Ready to test?** Run the quick start script and start adding liquidity! 🚀
