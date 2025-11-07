# LP Position Management Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  - Pool detail pages with "Add Liquidity" button           │
│  - Position management UI                                   │
│  - Wallet adapter (Phantom, Solflare, etc.)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)                   │
│  - Position creation endpoint                               │
│  - Uses @meteora-ag/dlmm SDK                                │
│  - Builds transaction instructions                          │
│  - Integrates with MetaTools Vault contract                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│    On-Chain: Two Smart Contract Integration Paths           │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                        │
│  Path 1: Direct     │   Path 2: Via MetaTools Vault         │
│  (No platform fees) │   (0.7% platform fee)                 │
│                     │                                        │
│  User Wallet        │   MetaTools Vault (Steel)             │
│      ↓              │         ↓                              │
│  Meteora DLMM       │   CPI → Meteora DLMM                  │
│                     │                                        │
└─────────────────────┴───────────────────────────────────────┘
```

## Implementation Paths

### Path 1: Direct Integration (Simple, No Fees)

**Use Case:** Basic LP position management without platform fees

**Flow:**
1. User connects wallet
2. User clicks "Add Liquidity" on pool detail page
3. Frontend calls backend API
4. Backend builds transaction using Meteora SDK
5. Frontend signs and submits transaction
6. Meteora DLMM program creates position directly

**Pros:**
- Simple implementation
- No smart contract deployment needed
- No platform fees
- Fast to market

**Cons:**
- No platform revenue
- No session wallet features
- No fee tracking/distribution

---

### Path 2: Via MetaTools Vault (Advanced, With Fees)

**Use Case:** Platform monetization with session wallet architecture

**Flow:**
1. User creates MetaTools Vault (one-time setup)
2. User generates session wallet (exportable to Phantom)
3. User clicks "Add Liquidity" on pool detail page
4. Backend builds transaction through MetaTools Vault
5. Vault collects 0.7% fee, distributes to treasury/buyback/referral
6. Vault makes CPI to Meteora DLMM program
7. Position created and tracked in vault

**Pros:**
- Platform revenue (0.7% TVL fee)
- Session wallet architecture
- Position tracking
- Fee distribution system
- Dual signature security

**Cons:**
- Requires vault deployment to devnet/mainnet
- More complex integration
- CPI implementation needed

---

## Recommended Implementation Strategy

### Phase 1: Direct Integration (Week 1-2)

**Goal:** Get basic LP functionality working quickly

#### Step 1.1: Install Dependencies

```bash
# Backend
cd backend
npm install @meteora-ag/dlmm @solana/web3.js @solana/spl-token bn.js

# Frontend (if not already installed)
cd ..
npm install @solana/wallet-adapter-react @solana/web3.js bn.js
```

#### Step 1.2: Create Backend API Endpoints

**File:** `backend/src/routes/positions.ts`

```typescript
import { Router } from 'express';
import DLMM from '@meteora-ag/dlmm';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';

const router = Router();

/**
 * POST /api/positions/create
 * Create a new LP position (direct, no vault)
 */
router.post('/create', async (req, res) => {
  try {
    const {
      poolAddress,
      userWallet,
      tokenXAmount,
      tokenYAmount,
      strategyType, // 'spot', 'curve', 'bidAsk'
      minBinId,
      maxBinId,
      network = 'mainnet-beta',
    } = req.body;

    // Initialize connection
    const connection = new Connection(
      network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    // Initialize DLMM instance
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress));

    // Generate new position keypair
    const newPosition = Keypair.generate();

    // Calculate strategy parameters
    const strategyParams = {
      minBinId,
      maxBinId,
      strategyType, // 0 = spot, 1 = curve, 2 = bidAsk
    };

    // Build add liquidity transaction
    const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: newPosition.publicKey,
      user: new PublicKey(userWallet),
      totalXAmount: new BN(tokenXAmount),
      totalYAmount: new BN(tokenYAmount),
      strategy: strategyParams,
    });

    // Return transaction and position keypair for frontend signing
    res.json({
      success: true,
      transaction: addLiquidityTx.serialize({ requireAllSignatures: false }).toString('base64'),
      positionKeypair: {
        publicKey: newPosition.publicKey.toBase58(),
        secretKey: Array.from(newPosition.secretKey),
      },
      message: 'Transaction ready for signing',
    });
  } catch (error: any) {
    console.error('❌ Error creating position:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/positions/claim-fees
 * Claim fees from an existing position
 */
router.post('/claim-fees', async (req, res) => {
  try {
    const { poolAddress, positionAddress, userWallet, network = 'mainnet-beta' } = req.body;

    const connection = new Connection(
      network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress));

    // Build claim fee transaction
    const claimFeeTx = await dlmmPool.claimFee({
      owner: new PublicKey(userWallet),
      position: new PublicKey(positionAddress),
    });

    res.json({
      success: true,
      transaction: claimFeeTx.serialize({ requireAllSignatures: false }).toString('base64'),
      message: 'Claim transaction ready for signing',
    });
  } catch (error: any) {
    console.error('❌ Error claiming fees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/positions/remove-liquidity
 * Remove liquidity from a position
 */
router.post('/remove-liquidity', async (req, res) => {
  try {
    const {
      poolAddress,
      positionAddress,
      userWallet,
      binIds, // Array of bin IDs to remove from
      bps, // Basis points (100% = 10000)
      network = 'mainnet-beta',
    } = req.body;

    const connection = new Connection(
      network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress));

    // Build remove liquidity transaction
    const removeLiquidityTx = await dlmmPool.removeLiquidity({
      position: new PublicKey(positionAddress),
      user: new PublicKey(userWallet),
      binIds,
      bps: new BN(bps),
    });

    res.json({
      success: true,
      transaction: removeLiquidityTx.serialize({ requireAllSignatures: false }).toString('base64'),
      message: 'Remove liquidity transaction ready for signing',
    });
  } catch (error: any) {
    console.error('❌ Error removing liquidity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

#### Step 1.3: Register Routes in Server

**File:** `backend/src/server.ts`

```typescript
import positionsRouter from './routes/positions';

// ... existing code ...

app.use('/api/positions', positionsRouter);
```

#### Step 1.4: Create Frontend UI Component

**File:** `src/components/pool/AddLiquidityDialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

interface AddLiquidityDialogProps {
  poolAddress: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

export function AddLiquidityDialog({ poolAddress, tokenXSymbol, tokenYSymbol }: AddLiquidityDialogProps) {
  const { publicKey, signTransaction } = useWallet();
  const [tokenXAmount, setTokenXAmount] = useState('');
  const [tokenYAmount, setTokenYAmount] = useState('');
  const [strategyType, setStrategyType] = useState<'spot' | 'curve' | 'bidAsk'>('spot');
  const [loading, setLoading] = useState(false);

  const handleAddLiquidity = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating position...');

    try {
      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/positions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          userWallet: publicKey.toBase58(),
          tokenXAmount: parseFloat(tokenXAmount) * 1e9, // Convert to lamports
          tokenYAmount: parseFloat(tokenYAmount) * 1e9,
          strategyType: strategyType === 'spot' ? 0 : strategyType === 'curve' ? 1 : 2,
          minBinId: -100, // TODO: Calculate based on price range
          maxBinId: 100,
          network: 'mainnet-beta',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Deserialize transaction
      const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));

      // Sign transaction
      const signed = await signTransaction(transaction);

      // Send transaction
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Position created successfully!', { id: loadingToast });
      toast.success(`Position: ${result.positionKeypair.publicKey}`);
    } catch (error: any) {
      console.error('Error creating position:', error);
      toast.error(error.message || 'Failed to create position', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Add Liquidity</h3>

      <div>
        <label className="block text-sm text-text-secondary mb-2">{tokenXSymbol} Amount</label>
        <input
          type="number"
          value={tokenXAmount}
          onChange={(e) => setTokenXAmount(e.target.value)}
          className="w-full px-4 py-2 bg-surface-light border border-border-light rounded-lg text-white"
          placeholder="0.0"
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">{tokenYSymbol} Amount</label>
        <input
          type="number"
          value={tokenYAmount}
          onChange={(e) => setTokenYAmount(e.target.value)}
          className="w-full px-4 py-2 bg-surface-light border border-border-light rounded-lg text-white"
          placeholder="0.0"
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">Strategy</label>
        <select
          value={strategyType}
          onChange={(e) => setStrategyType(e.target.value as any)}
          className="w-full px-4 py-2 bg-surface-light border border-border-light rounded-lg text-white"
        >
          <option value="spot">Spot (Concentrated)</option>
          <option value="curve">Curve (Wide Range)</option>
          <option value="bidAsk">Bid-Ask (Market Making)</option>
        </select>
      </div>

      <button
        onClick={handleAddLiquidity}
        disabled={loading || !publicKey}
        className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Position...' : 'Add Liquidity'}
      </button>
    </div>
  );
}
```

---

### Phase 2: MetaTools Vault Integration (Week 3-4)

**Goal:** Add platform fees and session wallet architecture

#### Step 2.1: Deploy MetaTools Vault to Devnet

```bash
cd contracts/metatools-vault
./scripts/deploy-devnet.sh
```

#### Step 2.2: Add CPI Instruction to Vault Contract

**File:** `contracts/metatools-vault/program/src/add_liquidity_dlmm.rs`

```rust
use steel::*;

/// Add liquidity to DLMM pool via CPI (with platform fee)
pub fn process_add_liquidity_dlmm(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [session_wallet_info, vault_metadata_info, position_info, config_info,
         treasury_info, buyback_info, referrer_info, dlmm_program_info,
         dlmm_pool_info, system_program_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Verify session wallet signature
    session_wallet_info.is_signer()?;

    // Load vault metadata
    let vault = vault_metadata_info.as_account::<VaultMetadata>(&metatools_vault_api::ID)?;

    // Verify session wallet owns this vault
    if vault.session_wallet != *session_wallet_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load global config for fee parameters
    let config = config_info.as_account::<GlobalConfig>(&metatools_vault_api::ID)?;

    // Calculate fee (0.7% of TVL)
    let tvl_amount = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let fee = (tvl_amount as u128 * config.fee_bps as u128 / 10000) as u64;

    // Distribute fee (10% referral, 45% buyback, 45% treasury)
    let referral_fee = fee * config.referral_percentage as u64 / 100;
    let buyback_fee = fee * config.buyback_percentage as u64 / 100;
    let treasury_fee = fee - referral_fee - buyback_fee;

    // Transfer fees
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            session_wallet_info.key,
            referrer_info.key,
            referral_fee,
        ),
        &[session_wallet_info.clone(), referrer_info.clone()],
    )?;

    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            session_wallet_info.key,
            buyback_info.key,
            buyback_fee,
        ),
        &[session_wallet_info.clone(), buyback_info.clone()],
    )?;

    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            session_wallet_info.key,
            treasury_info.key,
            treasury_fee,
        ),
        &[session_wallet_info.clone(), treasury_info.clone()],
    )?;

    // Build CPI to Meteora DLMM
    // TODO: Construct DLMM initialize_position_and_add_liquidity instruction
    // This requires the Meteora DLMM program ID and proper account ordering

    Ok(())
}
```

#### Step 2.3: Update Backend to Use Vault

**File:** `backend/src/routes/positions.ts` (add new endpoint)

```typescript
/**
 * POST /api/positions/create-with-vault
 * Create position through MetaTools Vault (with platform fee)
 */
router.post('/create-with-vault', async (req, res) => {
  try {
    const {
      poolAddress,
      sessionWallet, // User's session wallet from vault
      mainWallet, // User's main wallet
      tokenXAmount,
      tokenYAmount,
      strategyType,
      minBinId,
      maxBinId,
      network = 'mainnet-beta',
    } = req.body;

    // TODO: Build transaction that calls MetaTools Vault program
    // Vault program will:
    // 1. Collect 0.7% fee
    // 2. Distribute fee (10/45/45 split)
    // 3. Make CPI to Meteora DLMM
    // 4. Track position in vault metadata

    res.json({
      success: true,
      transaction: '...', // Base64 encoded transaction
      fee: 0.007, // 0.7% fee
      distribution: {
        referral: 0.0007,
        buyback: 0.00315,
        treasury: 0.00315,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating position with vault:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Next Steps

1. **Implement Phase 1** (Direct Integration)
   - Add backend position endpoints
   - Create frontend UI components
   - Test on devnet with test pools

2. **Deploy Vault to Devnet**
   - Run deployment script
   - Initialize GlobalConfig
   - Test vault creation

3. **Implement Phase 2** (Vault Integration)
   - Add CPI instruction to vault contract
   - Update backend to support vault path
   - Add vault UI to frontend

4. **Testing & Validation**
   - Test both paths on devnet
   - Verify fee distribution
   - Test position management (add/remove/claim)

5. **Mainnet Deployment**
   - Deploy vault to mainnet
   - Launch LP functionality to users
   - Monitor fees and positions

---

## Resources

- [Meteora DLMM SDK Docs](https://docs.meteora.ag/developer-guide/dlmm-sdk)
- [Meteora CPI Examples](https://docs.meteora.ag/developer-guide/guides/dlmm/cpi/examples)
- [Steel Framework Docs](https://github.com/regolith-labs/steel)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)

---

**Status:** Ready for implementation
**Next Action:** Install Meteora SDK dependencies and create backend position endpoints
