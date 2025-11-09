# Steel Vault Testing Guide

**Last Updated**: 2025-11-08

This guide provides step-by-step instructions for testing the MetaTools Steel vault contract integration with the liquidity management UI.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Steel Contract Testing](#steel-contract-testing)
4. [UI Integration Testing](#ui-integration-testing)
5. [End-to-End Flow Testing](#end-to-end-flow-testing)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The MetaTools Steel vault provides atomic fee payment for liquidity operations. When users add liquidity to Meteora pools, a 0.7% fee is automatically collected and distributed to:

- **Referral**: 10% (0.07% of initial TVL)
- **Buyback**: 45% (0.315% of initial TVL)
- **Treasury**: 45% (0.315% of initial TVL)

### Architecture

```
User Action: Add Liquidity
   ↓
1. Open Vault Position (Steel Contract)
   - Pay 0.7% fee atomically
   - Distribute to referral/buyback/treasury
   - Create position metadata
   ↓
2. Add Liquidity (Meteora SDK)
   - Execute actual liquidity deposit
   - Get position NFT
   ↓
3. Track Position (UI)
   - Display position in dashboard
   - Track TVL changes
   - Show fees earned
```

---

## Prerequisites

### 1. Install Dependencies

```bash
# In project root
cd meteora-ui-wrapper
npm install

# In Steel contract directory
cd contracts/metatools-vault
cargo build-sbf
```

### 2. Configure Environment

Create or update `.env.local`:

```bash
NEXT_PUBLIC_DEFAULT_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 3. Fund Test Wallets

You'll need SOL on devnet for testing:

```bash
# Airdrop SOL to your wallet
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet

# Check balance
solana balance <YOUR_WALLET_ADDRESS> --url devnet
```

---

## Steel Contract Testing

### Test 1: Verify Instruction Format

The Steel contract uses a simple 1-byte discriminator + struct serialization format.

```bash
cd contracts/metatools-vault

# Run the instruction format test
cargo test show_initialize_config_instruction_bytes -- --nocapture
```

**Expected Output:**

```
=== InitializeConfig Instruction ===
Data length: 73 bytes
Raw bytes: [0, d3, 05, 89, 94, d1, ...]
Hex: 00d3058994d1d6d62e577224639b16c8201899686022c31d7e5bd306bc7361ef...

First byte (discriminator?): 0
```

**Verification:**
- Data length should be exactly 73 bytes
- First byte should be 0 (InitializeConfig discriminator)
- Bytes 1-32: Treasury pubkey
- Bytes 33-64: Buyback wallet pubkey
- Bytes 65-66: fee_bps as u16 little-endian
- Bytes 67-69: referral_pct, buyback_pct, treasury_pct
- Bytes 70-72: padding

### Test 2: Initialize Config on Devnet

Before using the vault, you must initialize the global config (admin-only, one-time).

```bash
cd contracts/metatools-vault/cli

# Build the CLI
cargo build --release

# Initialize config (replace with your admin keypair)
./target/release/metatools-vault-cli init-config \
  --admin-keypair ~/.config/solana/id.json \
  --treasury <TREASURY_ADDRESS> \
  --buyback <BUYBACK_ADDRESS> \
  --fee-bps 70 \
  --referral-pct 10 \
  --buyback-pct 45 \
  --treasury-pct 45 \
  --cluster devnet
```

**Expected Output:**

```
Initializing config...
Config PDA: 8x7hB...
Transaction signature: 4xKj9...
Config initialized successfully!
```

**Verification:**

```bash
# Check the config account exists
solana account 8x7hB... --url devnet
```

### Test 3: Create Vault

```bash
./target/release/metatools-vault-cli create-vault \
  --keypair ~/.config/solana/id.json \
  --referrer <REFERRER_ADDRESS> \
  --cluster devnet
```

**Expected Output:**

```
Creating vault for wallet: 9x8hC...
Vault PDA: 7y6gD...
Transaction signature: 3wJi8...
Vault created successfully!
```

### Test 4: Open Position

```bash
./target/release/metatools-vault-cli open-position \
  --keypair ~/.config/solana/id.json \
  --pool <METEORA_POOL_ADDRESS> \
  --base-mint <BASE_TOKEN_MINT> \
  --quote-mint <QUOTE_TOKEN_MINT> \
  --initial-tvl 1000000000 \
  --protocol dlmm \
  --strategy spot \
  --cluster devnet
```

**Expected Output:**

```
Opening position...
Fee amount: 7000000 lamports (0.7% of 1000000000)
Position PDA: 6z5fE...
Transaction signature: 2vHg7...
Position opened successfully!
```

**Verification:**

Check that the fee was distributed correctly:

```bash
# Check treasury received 0.315%
solana balance <TREASURY_ADDRESS> --url devnet

# Check buyback received 0.315%
solana balance <BUYBACK_ADDRESS> --url devnet

# Check referrer received 0.07%
solana balance <REFERRER_ADDRESS> --url devnet
```

---

## UI Integration Testing

### Test 5: Start Dev Server

```bash
cd meteora-ui-wrapper
npm run dev
```

Open http://localhost:3000

### Test 6: Connect Wallet

1. Click "Connect Wallet" in the header
2. Select your wallet (Phantom, Solflare, etc.)
3. Approve the connection
4. Verify wallet address appears in header
5. Check that network is set to "Devnet"

### Test 7: Navigate to Pool

1. Go to the main dashboard (/)
2. Find a DLMM pool from the list
3. Click on the pool to view details
4. You should see:
   - Liquidity distribution chart
   - Add/Remove/Swap/Claim tabs
   - Pool statistics

### Test 8: Add Liquidity with Vault Integration

1. Click the "Add Liquidity" tab
2. Fill in the form:
   - **Strategy**: Select "Spot", "Curve", or "Bid-Ask"
   - **Ratio**: Select "50:50" or "One-side"
   - **Price Range**: Adjust min/max prices using sliders
   - **Amount**: Enter amount to deposit

3. Click "Add Liquidity"

4. **Expected Flow:**

   **Step 1**: Wallet prompts for signature (Vault transaction)
   ```
   Processing transaction...
   Opening vault position...
   ```

   **Step 2**: Wallet prompts for signature (Meteora transaction)
   ```
   Adding liquidity to pool...
   ```

   **Step 3**: Success notification
   ```
   Liquidity added successfully!
   Fee paid atomically via MetaTools Vault
   View vault tx →
   View liquidity tx →
   ```

5. **Verification:**

   Click the transaction links to verify on Solscan:

   - **Vault tx**: Should show fee distribution
   - **Liquidity tx**: Should show position creation

---

## End-to-End Flow Testing

### Complete Add Liquidity Test

Here's a complete test scenario:

```typescript
// Test Parameters
const testParams = {
  pool: "BxW7KqKqhEsZPqY3vJXhPK7xmKQbpAycDGJrC4MvWPZv", // Example DLMM pool
  baseMint: "So11111111111111111111111111111111111111112",  // SOL
  quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  amount: 0.1, // 0.1 SOL
  strategy: "spot",
  minPrice: 0.00028,
  maxPrice: 0.00032,
};
```

**Test Steps:**

1. **Pre-flight Checks**
   - [ ] Wallet connected
   - [ ] Network = devnet
   - [ ] SOL balance > 0.5 SOL
   - [ ] Token balance > test amount

2. **Vault Config Check**
   ```bash
   # Verify config is initialized
   solana account <CONFIG_PDA> --url devnet
   ```

3. **Execute Add Liquidity**
   - [ ] Fill form with test parameters
   - [ ] Click "Add Liquidity"
   - [ ] Approve vault transaction
   - [ ] Approve liquidity transaction

4. **Verify Results**

   **On-chain:**
   ```bash
   # Check vault position exists
   solana account <POSITION_PDA> --url devnet

   # Check fees were distributed
   solana balance <TREASURY> --url devnet
   solana balance <BUYBACK> --url devnet
   solana balance <REFERRER> --url devnet
   ```

   **In UI:**
   - [ ] Position appears in positions list
   - [ ] Liquidity chart shows new position
   - [ ] TVL updated correctly
   - [ ] Transaction links work

5. **Close Position Test**

   - [ ] Click "Remove" tab
   - [ ] Select position to close
   - [ ] Execute close
   - [ ] Verify position removed from UI
   - [ ] Verify rent returned to wallet

---

## Troubleshooting

### Issue: "Invalid instruction data"

**Cause**: Instruction format mismatch or program not initialized

**Solution:**
1. Verify program is deployed:
   ```bash
   solana program show 64QeAJYw4dRLwCNTHZbYtLMRMv5aksNgbNHNzy4SMZTw --url devnet
   ```

2. Check instruction bytes match expected format:
   ```bash
   cd contracts/metatools-vault
   cargo test show_initialize_config_instruction_bytes -- --nocapture
   ```

3. Ensure config is initialized (run Test 2)

### Issue: "Account not found"

**Cause**: Config or vault PDA not created

**Solution:**
1. Initialize config (admin-only):
   ```bash
   ./cli/target/release/metatools-vault-cli init-config ...
   ```

2. Create vault for your wallet:
   ```bash
   ./cli/target/release/metatools-vault-cli create-vault ...
   ```

### Issue: "Insufficient funds"

**Cause**: Not enough SOL for fees or rent

**Solution:**
```bash
# Airdrop more SOL
solana airdrop 2 <YOUR_WALLET> --url devnet
```

### Issue: UI shows "Failed to open vault position"

**Cause**: Transaction failed or rejected

**Solution:**
1. Check browser console for error details:
   ```
   Press F12 → Console tab
   ```

2. Verify wallet approvals:
   - Check if wallet popup was blocked
   - Ensure you approved the transaction

3. Check RPC endpoint:
   ```bash
   # Test connection
   curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

### Issue: Price range sliders not working

**Cause**: Missing bin data or incorrect pool type

**Solution:**
1. Ensure pool is DLMM type (not DAMM or DBC)
2. Check bin data is loading:
   ```typescript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

---

## Testing Checklist

Use this checklist for comprehensive testing:

### Contract Tests
- [ ] Instruction format verified (73 bytes, correct structure)
- [ ] Config initialized successfully
- [ ] Vault created successfully
- [ ] Position opened with correct fee distribution
- [ ] Position closed and rent returned

### UI Tests
- [ ] Wallet connects properly
- [ ] Network selector works
- [ ] Pool details load correctly
- [ ] Liquidity chart displays
- [ ] Price range sliders functional
- [ ] Add liquidity form validates inputs
- [ ] Vault integration executes both transactions
- [ ] Success notifications show both tx links
- [ ] Position appears in dashboard

### Integration Tests
- [ ] End-to-end add liquidity flow completes
- [ ] Fees distributed correctly (10% referral, 45% buyback, 45% treasury)
- [ ] Position metadata stored on-chain
- [ ] TVL tracking works
- [ ] Remove liquidity closes vault position

---

## Next Steps

After successful testing:

1. **Mainnet Deployment**
   - Deploy contract to mainnet-beta
   - Initialize config with production addresses
   - Update UI environment variables

2. **Monitoring**
   - Set up transaction monitoring
   - Track fee distributions
   - Monitor position metrics

3. **Documentation**
   - Update user guides
   - Create video tutorials
   - Write deployment docs

---

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/your-org/meteora-ui-wrapper/issues
- **Discord**: Your community Discord link
- **Docs**: https://docs.yourproject.com

---

## Appendix: Key Addresses

### Devnet

```bash
# Program
VAULT_PROGRAM_ID=64QeAJYw4dRLwCNTHZbYtLMRMv5aksNgbNHNzy4SMZTw

# PDAs (derived)
CONFIG_PDA=[vault, config] seed
VAULT_PDA=[vault, session_wallet] seed
POSITION_PDA=[position, session_wallet, pool] seed
```

### Mainnet (TBD)

```bash
# To be deployed
VAULT_PROGRAM_ID=<MAINNET_PROGRAM_ID>
```

---

**Happy Testing!** 🚀
