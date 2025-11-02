# Testing Guide - Meteora UI Wrapper

This guide provides comprehensive instructions for testing all Meteora protocol operations using the UI wrapper on Solana devnet.

## Table of Contents

- [Setup](#setup)
- [Getting Devnet SOL](#getting-devnet-sol)
- [Testing Workflow](#testing-workflow)
- [Protocol Testing](#protocol-testing)
  - [DLMM (Dynamic Liquidity Market Maker)](#dlmm-dynamic-liquidity-market-maker)
  - [DAMM v1 (Constant Product AMM)](#damm-v1-constant-product-amm)
  - [DAMM v2 (Concentrated Liquidity AMM)](#damm-v2-concentrated-liquidity-amm)
  - [DBC (Dynamic Bonding Curve)](#dbc-dynamic-bonding-curve)
  - [Alpha Vault](#alpha-vault)
- [Config Templates](#config-templates)
- [Common Issues](#common-issues)
- [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites

1. **Browser Wallet**: Install a Solana wallet browser extension:
   - [Phantom](https://phantom.app/) (Recommended)
   - [Solflare](https://solflare.com/)
   - [Torus](https://tor.us/)

2. **Development Server**:
   ```bash
   npm install
   npm run dev
   ```

   App runs on http://localhost:3000

3. **Wallet Connection**:
   - Open the app in your browser
   - Click "Select Wallet" in the top-right
   - Choose your wallet and approve the connection

### Network Selection

1. Click the network dropdown in the header
2. Select "Devnet" for testing
3. The app will use devnet endpoints automatically

## Getting Devnet SOL

You need devnet SOL for:
- Transaction fees (~0.001-0.01 SOL per transaction)
- Token creation rent (~0.01 SOL per token)
- Pool liquidity (if using SOL as quote token)

### Method 1: Solana CLI (Fastest)

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Airdrop to your wallet
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Method 2: Web Faucet

Visit: https://faucet.solana.com/
- Enter your wallet address
- Request 1-2 SOL
- May have rate limits

### Method 3: Solana CLI Devnet

```bash
solana config set --url devnet
solana airdrop 2
```

**Recommended**: Get at least 2 SOL for testing all features.

## Testing Workflow

### Using Forms Directly

1. Navigate to the desired protocol page (e.g., `/dlmm/create-pool`)
2. Fill in all required fields
3. Review helper text for guidance on each field
4. Click "Create Pool" (or relevant action button)
5. Approve the transaction in your wallet
6. Wait for confirmation
7. View transaction on Solscan (link provided in toast)

### Using Config Templates

1. Navigate to the desired protocol page
2. Click **"📥 Download Template"** in the ConfigUpload section
3. Open the downloaded `.jsonc` file in your editor
4. Modify values as needed:
   - Replace placeholder addresses
   - Adjust amounts and fees
   - Update token metadata
5. Save the file
6. Return to the form and drag-drop or browse to upload
7. Form auto-populates with config values
8. Review and submit

### Exporting Configs

1. Fill out a form manually
2. Click **"💾 Export Current Form"** before submitting
3. Save the generated config file for future use
4. Upload it later to quickly recreate the same configuration

## Protocol Testing

### DLMM (Dynamic Liquidity Market Maker)

DLMM uses discrete price bins for concentrated liquidity with customizable price ranges.

#### 1. Create DLMM Pool

**Location**: `/dlmm/create-pool`

**Steps**:
1. Choose to create a new token or use existing:
   - **New Token**: Fill in name, symbol, URI, decimals (9), supply (1000000000)
   - **Existing Token**: Enter base mint address
2. Set quote mint (default: SOL - `So11111111111111111111111111111111111111112`)
3. Configure pool:
   - **Bin Step**: 1 (0.01%), 5 (0.05%), 25 (0.25%), or 100 (1%)
   - **Base Amount**: Amount of base token to deposit
   - **Quote Amount**: Amount of quote token (SOL) to deposit
   - **Fee (bps)**: Trading fee in basis points (default: 1 = 0.01%)
4. Advanced settings:
   - **Initial Price**: Starting price for the pool
   - **Activation Type**: Slot (0) or Timestamp (1)
   - **Has Alpha Vault**: Enable vault integration
5. Submit transaction

**Expected Result**:
- Pool created successfully
- Transaction signature displayed
- Pool address returned
- View on Solscan link

**Common Amounts for Testing**:
- Base: 1000 tokens
- Quote: 10 SOL
- This creates a ~0.01 initial price

#### 2. Seed Liquidity (LFG)

**Location**: `/dlmm/seed-lfg`

**Prerequisites**: Must have an existing DLMM pool address

**Steps**:
1. Enter existing pool address
2. Configure liquidity curve:
   - **Min Price**: Lower price bound
   - **Max Price**: Upper price bound
   - **Curvature**: 0.0 = uniform, 1.0 = concentrated (default: 0.6)
   - **Seed Amount**: Total liquidity to distribute
3. Set position/fee owners (your wallet address)
4. Set lock release point (0 for no lock)
5. Submit transaction

**Expected Result**:
- Liquidity distributed across price bins
- Position NFT created
- Transaction confirmed

#### 3. Seed Single Bin

**Location**: `/dlmm/seed-single`

Similar to LFG but deposits liquidity into a single specific price bin.

#### 4. Set Pool Status

**Location**: `/dlmm/set-status`

Toggle pool active/inactive state (requires pool creator authority).

---

### DAMM v1 (Constant Product AMM)

Classic x*y=k constant product market maker.

#### 1. Create DAMM v1 Pool

**Location**: `/damm-v1/create-pool`

**Steps**:
1. Choose token configuration:
   - New token or existing base mint
2. Set quote mint (SOL)
3. Configure amounts:
   - **Base Amount**: 1000
   - **Quote Amount**: 100
   - This creates 0.1 initial price (quote/base)
4. Set **Fee (bps)**: 25 = 0.25% (standard AMM fee)
5. Submit transaction

**Expected Result**:
- Pool initialized with 50/50 value split
- LP tokens minted to your wallet
- Transaction confirmed

**Test Calculation**:
- 1000 base × 100 quote = 100,000 constant product
- Price = 100/1000 = 0.1

#### 2. Lock Liquidity

**Location**: `/damm-v1/lock-liquidity`

Lock LP tokens to prevent removal until specified time.

#### 3. Create Stake2Earn

**Location**: `/damm-v1/create-stake2earn`

**Note**: Currently requires farming SDK integration (placeholder).

#### 4. Lock Stake2Earn

**Location**: `/damm-v1/lock-stake2earn`

Lock staking positions with time-based vesting.

---

### DAMM v2 (Concentrated Liquidity AMM)

Uniswap v3-style concentrated liquidity with custom price ranges.

#### 1. Create Balanced Pool

**Location**: `/damm-v2/create-balanced`

**Steps**:
1. Token configuration (new or existing)
2. Set amounts and price range:
   - **Base Amount**: 1000
   - **Quote Amount**: 100
   - **Initial Price**: 0.1
   - **Max Price**: 0.2 (defines price range upper bound)
3. Set **Trade Fee (bps)**: 25 (0.25%)
4. Submit transaction

**Expected Result**:
- Pool created with concentrated liquidity in [initPrice, maxPrice] range
- Position NFT minted
- Liquidity active when price is in range

**Important**:
- initPrice must be < maxPrice
- All liquidity is concentrated in the specified range
- Higher capital efficiency than DAMM v1

#### 2. Create One-Sided Pool

**Location**: `/damm-v2/create-one-sided`

Deposit only quote tokens (useful for limit orders).

#### 3. Add Liquidity

**Location**: `/damm-v2/add-liquidity`

**Prerequisites**: Existing DAMM v2 pool address

**Steps**:
1. Enter pool address
2. Set amount to add
3. Set slippage tolerance (100 bps = 1%)
4. Submit transaction

**Expected Result**:
- Liquidity added to existing position
- Position size increases

#### 4. Remove Liquidity

**Location**: `/damm-v2/remove-liquidity`

Remove portion of liquidity from a position.

#### 5. Claim Fees

**Location**: `/damm-v2/claim-fees`

Collect accumulated trading fees from your position.

#### 6. Close Position

**Location**: `/damm-v2/close-position`

Remove all liquidity and close the position NFT.

#### 7. Split Position

**Location**: `/damm-v2/split-position`

Split a position into multiple positions with different owners/allocations.

---

### DBC (Dynamic Bonding Curve)

Two-phase token launch mechanism: bonding curve → AMM migration.

#### 1. Create DBC Config

**Location**: `/dbc/create-config`

**Steps**:
1. Set **Migration Quote Threshold**: 10000 (triggers AMM migration)
2. Set **Trading Fee (bps)**: 25 (0.25%)
3. Set **Protocol Fee (bps)**: 10 (0.10%)
4. Submit transaction

**Expected Result**:
- Config account created
- **Config Address** returned - SAVE THIS for pool creation

#### 2. Create DBC Pool

**Location**: `/dbc/create-pool`

**Prerequisites**: Config address from step 1

**Steps**:
1. Enter the config address from previous step
2. Token configuration (new or existing)
3. Set **Initial Price**: 0.001 (starting price on bonding curve)
4. Submit transaction

**Expected Result**:
- Bonding curve pool initialized
- Pool address returned
- Price starts at initialPrice and increases with buys

**How it Works**:
- Phase 1: Users buy tokens at increasing prices
- Quote tokens accumulate in the pool
- When threshold reached → Phase 2
- Phase 2: Auto-migrate to full AMM pool

#### 3. Swap on DBC

**Location**: `/dbc/swap`

**Prerequisites**: Existing DBC pool

**Steps**:
1. Enter pool address or base mint
2. Set amount to swap
3. Choose side:
   - **Buy**: Spend quote tokens (SOL), get base tokens
   - **Sell**: Spend base tokens, get quote tokens (SOL)
4. Set slippage tolerance
5. Submit transaction

**Expected Result**:
- Tokens swapped
- Price impact displayed
- Pool reserves updated

**Testing Buy/Sell**:
- Buy increases price (bonding curve going up)
- Sell decreases price (bonding curve going down)
- Check price before/after to verify curve behavior

#### 4. Claim Fees

**Location**: `/dbc/claim-fees`

Collect accumulated fees (both creator and partner fees if applicable).

**Expected Result**:
- Multiple transactions may be returned (creator + partner)
- Fees transferred to your wallet

#### 5. Migrate to DAMM v1

**Location**: `/dbc/migrate-v1`

Manually trigger migration from bonding curve to constant product AMM.

#### 6. Migrate to DAMM v2

**Location**: `/dbc/migrate-v2`

Trigger migration to concentrated liquidity AMM with activation point.

#### 7. Transfer Creator Authority

**Location**: `/dbc/transfer-creator`

Transfer pool creator authority to a new address.

---

### Alpha Vault

Automated liquidity management vaults for DLMM, DAMM v1, or DAMM v2 pools.

#### Create Alpha Vault

**Location**: `/alpha-vault/create`

**Prerequisites**: Existing pool (DLMM, DAMM v1, or DAMM v2)

**Steps**:
1. Enter pool address
2. Select **Pool Type**: dlmm, damm-v1, or damm-v2
3. Enter base and quote mint addresses
4. Configure vault settings:
   - **Max Deposit Cap**: 1000000 (0 for unlimited)
   - **Start Vesting Point**: 0 (timestamp when deposits begin)
   - **End Vesting Point**: 0 (timestamp when vesting completes)
   - **Escrow Fee (bps)**: 100 (1% deposit fee)
   - **Performance Fee (bps)**: 2000 (20% profit fee)
   - **Management Fee (bps)**: 200 (2% annual AUM fee)
5. Optional: Enable whitelist mode
6. Submit transaction

**Expected Result**:
- Vault account created
- Vault address returned
- Users can now deposit into the vault
- Vault manager can rebalance liquidity

**Vault Lifecycle**:
1. Users deposit tokens
2. Vault deploys liquidity to underlying pool
3. Vault rebalances based on strategy
4. Fees collected from trading + performance
5. Users withdraw (subject to vesting)

---

## Config Templates

All templates are available in `/public/config-templates/`.

### Available Templates

| Protocol | Action | Template File |
|----------|--------|---------------|
| DLMM | Create Pool | `dlmm-create-pool.example.jsonc` |
| DLMM | Seed LFG | `dlmm-seed-lfg.example.jsonc` |
| DAMM v1 | Create Pool | `damm-v1-create-pool.example.jsonc` |
| DAMM v2 | Create Balanced | `damm-v2-create-balanced.example.jsonc` |
| DAMM v2 | Add Liquidity | `damm-v2-add-liquidity.example.jsonc` |
| DBC | Create Config | `dbc-create-config.example.jsonc` |
| DBC | Create Pool | `dbc-create-pool.example.jsonc` |
| DBC | Swap | `dbc-swap.example.jsonc` |
| Alpha Vault | Create | `alpha-vault-create.example.jsonc` |

### Template Usage

1. **Download**: Click "Download Template" button on any form
2. **Edit**: Modify the `.jsonc` file with your values
3. **Upload**: Drag & drop or browse to upload
4. **Submit**: Review auto-populated form and submit

### Template Structure

```jsonc
{
  // Global required fields
  "rpcUrl": "https://api.devnet.solana.com",
  "dryRun": false,  // Set true to test without executing
  "computeUnitPriceMicroLamports": 1000,

  // Token configuration (one of these)
  "baseMint": "ExistingTokenAddress...",  // OR
  "createBaseToken": {
    "name": "My Token",
    "symbol": "MTK",
    "uri": "https://...",
    "decimals": 9,
    "supply": "1000000000"
  },

  // Protocol-specific config
  "dlmmConfig": { /* ... */ },
  "dammV1Config": { /* ... */ },
  "dammV2Config": { /* ... */ },
  "dbcConfig": { /* ... */ },
  "alphaVault": { /* ... */ }
}
```

---

## Common Issues

### Wallet Connection Issues

**Problem**: Wallet won't connect

**Solutions**:
- Refresh the page
- Check wallet extension is unlocked
- Try a different wallet (Phantom recommended)
- Clear browser cache
- Ensure wallet is set to devnet

### Transaction Failures

**Problem**: Transaction fails with "Insufficient funds"

**Solutions**:
- Check SOL balance (need at least 0.01 SOL)
- Get more devnet SOL from faucet
- Reduce transaction amounts

**Problem**: Transaction fails with "Blockhash not found"

**Solutions**:
- Network congestion - retry transaction
- Increase compute unit price
- Wait a few seconds and retry

**Problem**: "Failed to send transaction"

**Solutions**:
- Check wallet is connected
- Ensure wallet is on devnet
- Check network selection in app header
- Verify all required fields are filled

### Config Upload Issues

**Problem**: "Invalid config format"

**Solutions**:
- Ensure file is valid JSON/JSONC
- Check for missing commas or quotes
- Use template as reference
- Validate JSON structure

**Problem**: "Missing required field"

**Solutions**:
- Check error message for specific field
- Review template for required fields
- Ensure all protocol-specific fields are present

**Problem**: "Invalid Solana address"

**Solutions**:
- Verify address is 32-44 characters
- Ensure base58 format (no special characters)
- Check for copy-paste errors (spaces, newlines)
- Use known devnet addresses for testing

### Pool Creation Issues

**Problem**: "Pool already exists"

**Solutions**:
- Use different token addresses
- Close existing pool first
- Create new test token

**Problem**: "Token account not found"

**Solutions**:
- Create token account first
- Use "Create new token" option
- Check token mint address is correct

---

## Troubleshooting

### Debugging Steps

1. **Check Wallet**:
   - Connected and unlocked?
   - On correct network (devnet)?
   - Sufficient SOL balance?

2. **Check Form**:
   - All required fields filled?
   - Addresses are valid Solana addresses?
   - Amounts are reasonable numbers?

3. **Check Network**:
   - App header shows "Devnet"?
   - RPC endpoint reachable?
   - No network congestion?

4. **Check Transaction**:
   - View on Solscan for detailed error
   - Check program logs
   - Verify account states

### Solscan Links

After any transaction:
- Success toast shows Solscan link
- Click to view full transaction details
- Check program logs for errors
- Verify account changes

**Devnet Solscan**: https://solscan.io/?cluster=devnet

### Getting Help

If issues persist:

1. **Check Browser Console**:
   - Press F12
   - Look for error messages
   - Copy full error text

2. **Transaction Signature**:
   - Save transaction signature
   - Check on Solscan
   - Share signature for support

3. **Config File**:
   - Export your config
   - Share for debugging
   - Verify all fields

4. **Create Issue**:
   - GitHub: [meteora-ui-wrapper/issues](https://github.com/your-org/meteora-ui-wrapper/issues)
   - Include: browser, wallet type, transaction signature, error message

---

## Testing Checklist

Use this checklist to verify all functionality:

### DLMM
- [ ] Create pool with new token
- [ ] Create pool with existing token
- [ ] Seed liquidity (LFG)
- [ ] Seed liquidity (single bin)
- [ ] Set pool status

### DAMM v1
- [ ] Create pool
- [ ] Lock liquidity

### DAMM v2
- [ ] Create balanced pool
- [ ] Create one-sided pool
- [ ] Add liquidity
- [ ] Remove liquidity
- [ ] Claim fees
- [ ] Close position
- [ ] Split position

### DBC
- [ ] Create config
- [ ] Create pool
- [ ] Swap (buy)
- [ ] Swap (sell)
- [ ] Claim fees
- [ ] Migrate to v1
- [ ] Migrate to v2
- [ ] Transfer creator

### Alpha Vault
- [ ] Create vault

### Config System
- [ ] Download template
- [ ] Upload config
- [ ] Export current form
- [ ] Validate config

---

## Performance Tips

1. **Parallel Testing**: Open multiple tabs to test different protocols simultaneously
2. **Config Reuse**: Export successful configs for quick retesting
3. **Template Modification**: Keep a set of working templates with your preferred values
4. **Batch Operations**: Test related operations together (create → seed → claim)

---

## Expected Timings

- **Transaction Confirmation**: 1-5 seconds on devnet
- **Form Validation**: Instant
- **Config Upload**: < 1 second
- **Pool Creation**: 2-10 seconds
- **Token Creation**: 2-5 seconds

If operations take significantly longer, check network status.

---

## Success Criteria

A successful test should result in:
- ✅ Transaction confirmed
- ✅ Solscan link accessible
- ✅ Expected accounts created/modified
- ✅ Toast notifications clear and informative
- ✅ No console errors

---

**Happy Testing! 🚀**

For additional help, refer to:
- [Meteora Documentation](https://docs.meteora.ag)
- [Solana Developer Docs](https://docs.solana.com)
- `public/config-templates/README.md` for config details
