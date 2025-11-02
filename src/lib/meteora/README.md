# Meteora SDK Integration

This directory contains client-side wrappers for Meteora SDK operations.

## Architecture

For a web dApp, we build transactions **client-side** and sign with the wallet adapter:

```
User fills form -> Client builds TX -> Wallet signs -> Send to chain
```

NOT through API routes (which would require server-side keypairs).

## How It Works

1. **Import Meteora SDKs** - Use `@meteora-ag/dlmm`, `@meteora-ag/dynamic-amm-sdk`, etc.
2. **Build Transaction** - Create the transaction using SDK methods
3. **Sign with Wallet** - Use wallet adapter's `signTransaction` or `sendTransaction`
4. **Send to Chain** - Transaction is submitted to Solana

## Example Pattern

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import DLMM from '@meteora-ag/dlmm';

export function useDLMMCreatePool() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createPool = async (params) => {
    if (!publicKey) throw new Error('Wallet not connected');

    // Build transaction using Meteora SDK
    const tx = await DLMM.createCustomizablePermissionlessLbPair2(
      connection,
      baseMint,
      quoteMint,
      // ... other params
      publicKey, // user's wallet as fee payer
    );

    // Sign and send with wallet adapter
    const signature = await sendTransaction(tx, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature);

    return { signature };
  };

  return { createPool };
}
```

## Integration Status

Currently, the forms use placeholder API routes. To complete integration:

1. Install Meteora SDKs in the UI package
2. Create hooks in this directory for each operation
3. Update forms to use the hooks instead of API calls
4. Remove API routes (or keep for backend operations if needed)

## Meteora SDKs

- `@meteora-ag/dlmm` - DLMM pools
- `@meteora-ag/dynamic-amm-sdk` - DAMM v2
- `@meteora-ag/cp-amm-sdk` - DAMM v1
- `@meteora-ag/dynamic-bonding-curve-sdk` - DBC
- `@meteora-ag/alpha-vault` - Alpha Vault

These are already installed via the workspace link to `@meteora-invent/studio`.
