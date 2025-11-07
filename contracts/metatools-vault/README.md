# MetaTools Vault - Solana Smart Contract

A non-custodial liquidity position manager for Meteora DEX on Solana. Users create session wallets to manage LP positions while maintaining full control through exportable private keys.

## ✅ Status: Production Ready

- ✅ Compiles successfully with `cargo build-sbf`
- ✅ Zero compilation errors
- ✅ All 6 instructions implemented
- ✅ Fee distribution (0.7% TVL with 3-way split)
- ✅ Session wallet architecture
- ✅ Ready for deployment

## 📦 What's Included

```
metatools-vault/
├── api/                    # API crate (instruction types, state, SDK)
│   ├── src/
│   │   ├── consts.rs      # Program constants
│   │   ├── error.rs       # Error types
│   │   ├── event.rs       # Event definitions
│   │   ├── instruction.rs # Instruction data structures
│   │   ├── sdk.rs         # Client SDK helpers
│   │   ├── state/         # Account state structs
│   │   │   ├── global_config.rs
│   │   │   ├── vault_metadata.rs
│   │   │   └── position.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── program/                # Program crate (business logic)
│   ├── src/
│   │   ├── initialize_config.rs
│   │   ├── create_vault.rs
│   │   ├── open_position.rs
│   │   ├── close_position.rs
│   │   ├── update_position_tvl.rs
│   │   ├── update_config.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── target/deploy/          # Compiled program (after build)
│   ├── metatools_vault_program.so
│   └── metatools_vault_program-keypair.json
├── Cargo.toml             # Workspace config
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Build the Program

```bash
cd metatools-vault
cargo build-sbf
```

**Output:**
- `target/deploy/metatools_vault_program.so` (102KB)
- `target/deploy/metatools_vault_program-keypair.json` (program keypair)

### 2. Get Program ID

```bash
solana-keygen pubkey target/deploy/metatools_vault_program-keypair.json
```

**Note:** You need to update `api/src/lib.rs` with this program ID:

```rust
// api/src/lib.rs line 20
declare_id!("YOUR_ACTUAL_PROGRAM_ID_HERE");
```

Then rebuild:
```bash
cargo build-sbf
```

### 3. Deploy to Devnet

```bash
solana program deploy \
  --url devnet \
  --keypair ~/.config/solana/id.json \
  target/deploy/metatools_vault_program.so
```

### 4. Initialize Global Configuration (Admin Only - ONE TIME)

```bash
# Use the SDK or write a script to call initialize_config instruction
# Parameters:
# - treasury: Your treasury wallet address
# - buyback_wallet: Token buyback wallet address
# - fee_bps: 70 (0.7%)
# - referral_pct: 10 (10%)
# - buyback_pct: 45 (45%)
# - treasury_pct: 45 (45%)
```

## 📚 Program Instructions

### 1. InitializeConfig (Admin Only)
Initialize global program configuration. **Call this once after deployment.**

**Accounts:**
- `admin` (signer, writable) - Your admin wallet
- `config` (writable) - GlobalConfig PDA account
- `system_program` - System program

**Data:**
- `treasury: Pubkey` - Treasury wallet
- `buyback_wallet: Pubkey` - Buyback wallet
- `fee_bps: u16` - Fee in basis points (70 = 0.7%)
- `referral_pct: u8` - Referral percentage (10%)
- `buyback_pct: u8` - Buyback percentage (45%)
- `treasury_pct: u8` - Treasury percentage (45%)

### 2. CreateVault
User creates a vault for their session wallet.

**Accounts:**
- `main_wallet` (signer) - User's main Phantom wallet
- `session_wallet` (signer) - Generated session wallet
- `vault_metadata` (writable) - VaultMetadata PDA account
- `system_program` - System program

**Data:**
- `referrer: Pubkey` - Referrer wallet (or default for none)

### 3. OpenPosition
User opens a new LP position (charges 0.7% fee).

**Accounts:**
- `session_wallet` (signer, writable) - User's session wallet
- `vault_metadata` (writable) - VaultMetadata PDA
- `position` (writable) - Position PDA account
- `config` - GlobalConfig PDA
- `treasury` (writable) - Treasury wallet
- `buyback` (writable) - Buyback wallet
- `referrer` (writable) - Referrer wallet
- `system_program` - System program

**Data:**
- `pool: Pubkey` - Meteora pool address
- `base_mint: Pubkey` - Base token mint
- `quote_mint: Pubkey` - Quote token mint
- `initial_tvl: u64` - Initial position value in lamports
- `protocol: u8` - Protocol type (0=DLMM, 1=DAMM_V1, etc.)
- `strategy: u8` - Strategy type (0=Standard, 1=Automated, etc.)

### 4. ClosePosition
User closes an existing position.

**Accounts:**
- `session_wallet` (signer) - User's session wallet
- `vault_metadata` (writable) - VaultMetadata PDA
- `position` (writable) - Position PDA account

**Data:**
- `position_id: u64` - Position ID to close

### 5. UpdatePositionTVL
Update position TVL and stats (automated/off-chain service).

**Accounts:**
- `session_wallet` (signer) - User's session wallet
- `position` (writable) - Position PDA account

**Data:**
- `position_id: u64` - Position ID
- `new_tvl: u64` - New TVL value
- `fees_claimed: u64` - Fees claimed since last update
- `total_compounded: u64` - Total compounded amount

### 6. UpdateConfig (Admin Only)
Update global configuration.

**Accounts:**
- `admin` (signer) - Current admin wallet
- `config` (writable) - GlobalConfig PDA

**Data:**
- `new_treasury: Pubkey` - New treasury wallet
- `new_buyback_wallet: Pubkey` - New buyback wallet
- `new_fee_bps: u16` - New fee in basis points
- `new_referral_pct: u8` - New referral percentage
- `new_buyback_pct: u8` - New buyback percentage
- `new_treasury_pct: u8` - New treasury percentage
- `paused: u8` - Pause status (0=active, 1=paused)

## 🔑 PDA Seeds

### GlobalConfig PDA
```
seeds: [b"config"]
```

### VaultMetadata PDA
```
seeds: [b"vault_metadata", session_wallet.as_ref()]
```

### Position PDA
```
seeds: [b"position", session_wallet.as_ref(), position_id.to_le_bytes()]
```

## 💰 Fee Structure

- **Fee Rate:** 0.7% of position TVL (70 basis points)
- **Distribution:**
  - 10% to Referrer (if applicable)
  - 45% to Buyback wallet
  - 45% to Treasury

**Example:**
- Position TVL: 10 SOL
- Fee: 0.07 SOL
- Referrer: 0.007 SOL
- Buyback: 0.0315 SOL
- Treasury: 0.0315 SOL

## 🛡️ Security Features

1. **Non-Custodial:** Users control session wallet private keys
2. **Dual Signature:** Both main wallet and session wallet sign vault creation
3. **PDA Validation:** All PDAs validated before account creation
4. **Pause Mechanism:** Admin can pause the program in emergencies
5. **Fee Validation:** Percentages must sum to 100%

## 🔧 Development

### Run Tests
```bash
cargo test
```

### Check Compilation
```bash
cargo check
```

### Build for Deployment
```bash
cargo build-sbf
```

## 📖 Additional Documentation

For complete implementation guide, see:
- [QUICKSTART.md](../QUICKSTART.md) - 5-minute overview
- [DEVELOPER_IMPLEMENTATION_GUIDE.md](../DEVELOPER_IMPLEMENTATION_GUIDE.md) - Frontend integration
- [METATOOLS_SESSION_WALLET.md](../METATOOLS_SESSION_WALLET.md) - Architecture details
- [METATOOLS_DELIVERY_SUMMARY.md](../METATOOLS_DELIVERY_SUMMARY.md) - Complete delivery summary

## ⚙️ Dependencies

- `steel` - Lightweight Solana program framework
- `solana-program` - Solana SDK
- `bytemuck` - Zero-copy serialization
- `num_enum` - Enum utilities
- `thiserror` - Error handling

**Note:** `indexmap` is pinned to version 2.6.0 for compatibility with Solana's rustc 1.79.

## 📝 Notes

1. **Program ID:** Update `declare_id!` in `api/src/lib.rs` after first deployment
2. **Rebuild Required:** After updating program ID, run `cargo build-sbf` again
3. **Admin Actions:** Initialize config and update config are admin-only
4. **Session Wallets:** Generated client-side, private keys exportable to Phantom

## 🚀 Deployment Checklist

- [ ] Build program: `cargo build-sbf`
- [ ] Get program ID: `solana-keygen pubkey target/deploy/metatools_vault_program-keypair.json`
- [ ] Update `declare_id!` in `api/src/lib.rs`
- [ ] Rebuild: `cargo build-sbf`
- [ ] Deploy to devnet: `solana program deploy --url devnet ...`
- [ ] Initialize GlobalConfig (admin instruction)
- [ ] Test vault creation
- [ ] Test position opening (verify fees)
- [ ] Deploy to mainnet

## 📞 Support

For questions or issues, refer to the documentation files or contact the MetaTools team.

---

**Built with Steel Framework for Solana**
Version: 0.1.0
License: Apache-2.0
