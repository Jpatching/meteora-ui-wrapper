# Devnet Pool Scripts

Scripts for creating and managing Meteora DLMM pools on Solana devnet for testing.

## 🎯 Quick Start

### All-in-One Setup

Create pool, seed liquidity, and add to database in one command:

```bash
./setup-complete-devnet-pool.sh
```

**Prerequisites:**
- Devnet SOL in wallet (~5 SOL)
- Backend running at localhost:4000
- Wallet at `~/.config/solana/id.json` (or set `WALLET_PATH`)

## 📜 Available Scripts

### 1. `create-sol-usdc-devnet-pool.ts`

Creates a SOL-USDC DLMM pool on devnet.

**Usage:**
```bash
tsx scripts/create-sol-usdc-devnet-pool.ts
```

**Output:**
- Pool address
- Transaction ID
- Explorer links
- Saves pool info to `devnet-test-pools.json`

**Configuration:**
- Token X: SOL (native)
- Token Y: USDC devnet (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- Bin step: 25 (0.25%)
- Initial price: ~180 USDC/SOL
- Trading fee: 30 bps (0.3%)

### 2. `seed-devnet-pool.ts`

Seeds liquidity to a DLMM pool (single-sided + dual-sided).

**Usage:**
```bash
tsx scripts/seed-devnet-pool.ts <pool-address>
```

**Example:**
```bash
tsx scripts/seed-devnet-pool.ts 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1
```

**What it does:**
1. **Phase 1** (Single-sided): Seeds 0.1 SOL into single bin to establish initial price
2. **Phase 2** (Dual-sided): Seeds 2 SOL + 360 USDC distributed across ±20 bins using Spot strategy

**Why two phases?**
- Empty DLMM pools require single-sided seeding first to set the initial price
- Then dual-sided seeding creates realistic liquidity distribution for testing

### 3. `add-pool-to-db.sh`

Adds a devnet pool to the backend database.

**Usage:**
```bash
./add-pool-to-db.sh <pool-address>
```

**Example:**
```bash
./add-pool-to-db.sh 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1
```

**What it does:**
- Calls `/api/pools/devnet/add` endpoint
- Fetches pool data from on-chain
- Stores in PostgreSQL with network='devnet'
- Makes pool discoverable in UI

**Requirements:**
- Backend must be running at localhost:4000
- Pool must exist on-chain

### 4. `setup-complete-devnet-pool.sh`

All-in-one script that runs all three steps above.

**Usage:**
```bash
./setup-complete-devnet-pool.sh
```

**Steps:**
1. Creates SOL-USDC pool
2. Seeds liquidity (both phases)
3. Adds pool to database
4. Prints test checklist

## 🔧 Configuration

### Environment Variables

```bash
# Custom RPC endpoint
export DEVNET_RPC=https://api.devnet.solana.com

# Custom wallet path
export WALLET_PATH=/path/to/wallet.json
```

### Customizing Pool Parameters

Edit `create-sol-usdc-devnet-pool.ts`:

```typescript
const POOL_CONFIG = {
  binStep: 25,           // Bin step in bps (10, 25, 50, 100)
  feeBps: 30,            // Trading fee in bps
  initialPrice: 180,     // Initial price (Token Y per Token X)
  hasAlphaVault: false,  // Enable Alpha Vault
  activationType: ActivationType.Timestamp,
};
```

### Customizing Seeding Amounts

Edit `seed-devnet-pool.ts`:

```typescript
const SEED_CONFIG = {
  singleSided: {
    enabled: true,
    solAmount: 0.1,      // SOL for single bin seeding
  },
  dualSided: {
    enabled: true,
    solAmount: 2.0,      // SOL for distribution
    usdcAmount: 360,     // USDC for distribution
    strategy: StrategyType.Spot,
    binRange: 20,        // Number of bins above/below active
  },
};
```

## 🧪 Testing

After running scripts, test in UI:

1. **Open UI**: http://localhost:3000
2. **Switch network**: Select "Devnet" in network selector
3. **Verify pool**: Should appear on home page
4. **View details**: Click pool → Detail page should load (not 404)
5. **Add liquidity**: Test adding liquidity via UI
6. **View positions**: Check "Your Positions" panel

See `../DEVNET_POOL_TESTING.md` for comprehensive testing guide.

## 🐛 Troubleshooting

### "Insufficient SOL balance"

Get more devnet SOL:
```bash
solana airdrop 2 --url devnet
# Run multiple times if needed
```

### "Pool not found in database"

Manually add pool:
```bash
./add-pool-to-db.sh <pool-address>
```

### "Backend not running"

Start backend:
```bash
cd ..
npm run backend:dev
```

### "Transaction failed"

Common causes:
- Insufficient SOL for fees (~0.5 SOL needed)
- Insufficient token balance
- Invalid price range (min >= max)
- RPC rate limiting (wait and retry)

## 📚 Resources

- **Meteora Docs**: https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions
- **Testing Guide**: `../DEVNET_POOL_TESTING.md`
- **Devnet Faucet**: https://faucet.solana.com/

## 💡 Tips

- Keep devnet SOL balance above 2 SOL for testing
- Use small amounts (0.1-1 SOL) for initial tests
- Save pool addresses for later testing
- Check Solscan to verify on-chain state: https://solscan.io/?cluster=devnet

---

**Need help?** See `../DEVNET_POOL_TESTING.md` for detailed troubleshooting.
