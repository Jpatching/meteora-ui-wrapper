# MetaTools Contracts

This directory contains Solana smart contracts for MetaTools.

## MetaTools Vault

**Location:** `metatools-vault/`

**Status:** ✅ Production-Ready (Not yet deployed)

### Overview

A non-custodial liquidity position manager for Meteora DEX. Users create session wallets to manage LP positions while maintaining full control through exportable private keys.

### Quick Start

```bash
# Build the program
cd metatools-vault
cargo build-sbf

# Deploy to devnet (RECOMMENDED - test first!)
./scripts/deploy-devnet.sh

# Deploy to mainnet (only after thorough devnet testing)
./scripts/deploy-mainnet.sh
```

### Documentation

- **[START_HERE.md](metatools-vault/START_HERE.md)** - Quick start guide
- **[README.md](metatools-vault/README.md)** - Full documentation
- **[FINAL_STATUS.md](metatools-vault/FINAL_STATUS.md)** - Implementation details

### Features

- ✅ Session wallet architecture (non-custodial)
- ✅ Position management (open, close, update)
- ✅ Fee system (0.7% TVL with 3-way split)
- ✅ Multi-protocol support (DLMM, DAMM v2, etc.)
- ✅ Complete event logging
- ✅ Security features (dual signatures, PDA validation)

### Next Steps

1. **Test on Devnet**
   ```bash
   cd metatools-vault
   ./scripts/deploy-devnet.sh
   ```

2. **Initialize GlobalConfig** (admin only, one-time)
   - Set treasury and buyback wallets
   - Configure fee parameters (0.7%, 10/45/45 split)

3. **Frontend Integration**
   - Add vault creation UI
   - Add position management interface
   - Integrate SDK helper functions

4. **Mainnet Deployment** (only after successful devnet testing)
   ```bash
   ./scripts/deploy-mainnet.sh
   ```

### Integration Status

- ✅ Smart contract complete
- ✅ Deployment scripts ready
- ⏳ Frontend UI (to be implemented)
- ⏳ Backend API integration (to be implemented)
- ⏳ Devnet testing
- ⏳ Mainnet deployment

### Support

For questions about the vault smart contract, refer to the documentation in `metatools-vault/` or contact the MetaTools team.

---

**Built with Steel Framework for Solana**
