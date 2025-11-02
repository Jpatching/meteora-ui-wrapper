# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is MetaTools - a comprehensive Next.js 16 web UI for Meteora protocols. It provides a beautiful, dark-mode interface to create and manage Meteora pools (DLMM, DAMM v1/v2, DBC, Alpha Vault) on Solana with full wallet integration.

## Key Architecture Concepts

### Modern React/Next.js Pattern

The application follows a modern, type-safe architecture:

1. **Page Components** (`src/app/[protocol]/[action]/page.tsx`) - Client-side React pages with forms
2. **API Routes** (`src/app/api/[protocol]/[action]/route.ts`) - Server-side endpoints that call meteora-invent functions
3. **Type Definitions** (`src/types/meteora.ts`) - TypeScript interfaces for all actions
4. **Reusable UI Components** (`src/components/ui/`) - Modular, styled components
5. **Layout System** (`src/components/layout/`) - Sidebar navigation and header with wallet connect

### Wallet Integration

- Uses `@solana/wallet-adapter-react` for wallet connections
- Supports Phantom, Solflare, Torus, Ledger
- Network switching (localnet/devnet/mainnet) via context
- Persistent network selection in localStorage

### State Management

- **Network Context** (`src/contexts/NetworkContext.tsx`) - Global network selection
- **Wallet Provider** (`src/providers/WalletProvider.tsx`) - Wallet adapter wrapper
- **Local State** - React hooks (useState) for form state
- **Future**: Zustand is installed for complex state if needed

### Direct TypeScript Integration

The preferred integration method is importing TypeScript functions directly from meteora-invent:

```typescript
import { createPool } from '@meteora-invent/studio/actions/dlmm/create_pool';
```

This requires:
1. Adding meteora-invent as a workspace dependency or path alias
2. Configuring TypeScript paths in tsconfig.json
3. Ensuring the meteora-invent functions can run in a Next.js API route context

### Environment Configuration

- `METEORA_INVENT_PATH` - Path to local meteora-invent repository
- `NEXT_PUBLIC_DEFAULT_NETWORK` - Default network (devnet/localnet/mainnet-beta)
- Optional: Custom RPC endpoints

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The dev server runs on http://localhost:3000 by default.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: Version 19.2
- **Styling**: Tailwind CSS v4 (CSS-based configuration)
- **Language**: TypeScript 5
- **Wallet**: Solana Wallet Adapter
- **Notifications**: react-hot-toast
- **Animations**: framer-motion
- **Blockchain**: Solana Web3.js + SPL Token libraries

## File Structure

```
src/
├── app/
│   ├── dlmm/                  # DLMM protocol pages
│   │   └── create-pool/       # Example: DLMM create pool
│   ├── damm-v1/               # DAMM v1 pages (to be created)
│   ├── damm-v2/               # DAMM v2 pages (to be created)
│   ├── dbc/                   # DBC pages (to be created)
│   ├── alpha-vault/           # Alpha Vault pages (to be created)
│   ├── settings/              # Settings pages (to be created)
│   ├── api/                   # API routes
│   │   ├── dlmm/
│   │   ├── damm-v1/           # (to be created)
│   │   ├── damm-v2/           # (to be created)
│   │   ├── dbc/               # (to be created)
│   │   └── alpha-vault/       # (to be created)
│   ├── layout.tsx             # Root layout with providers
│   ├── page.tsx               # Home page dashboard
│   └── globals.css            # Dark mode theme configuration
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   ├── Tooltip.tsx
│   │   └── index.ts
│   └── layout/                # Layout components
│       ├── MainLayout.tsx
│       ├── Sidebar.tsx
│       └── Header.tsx
├── contexts/
│   └── NetworkContext.tsx     # Network selection context
├── providers/
│   ├── WalletProvider.tsx     # Wallet adapter wrapper
│   └── AppProviders.tsx       # Combined providers
├── types/
│   └── meteora.ts             # Type definitions for all 23 actions
└── lib/                       # (to be created) Utility functions
```

## Development Guidelines

### Adding New Protocol Actions

Follow this pattern for each action (example: `/dbc/swap`):

1. **Create Page** - `src/app/dbc/swap/page.tsx`
   ```typescript
   'use client';
   import { MainLayout } from '@/components/layout';
   import { Card, Input, Button } from '@/components/ui';
   // Form with validation, wallet check, toast notifications
   ```

2. **Create API Route** - `src/app/api/dbc/swap/route.ts`
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   export async function POST(request: NextRequest) {
     // Import meteora-invent function
     // Call function with request body params
     // Return transaction result
   }
   ```

3. **Use Types** - Reference `src/types/meteora.ts`
   ```typescript
   import { DBCSwapParams } from '@/types/meteora';
   ```

### UI Component Usage

All UI components are in `src/components/ui/`:

```typescript
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Tooltip } from '@/components/ui';

// Card with sections
<Card hover gradient>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Form fields */}
  </CardContent>
</Card>

// Input with validation
<Input
  label="Amount"
  placeholder="1000"
  required
  value={formData.amount}
  onChange={(e) => setFormData({...formData, amount: e.target.value})}
  helperText="Enter the amount to swap"
  error={errors.amount}
/>

// Button variants
<Button variant="primary" size="lg" loading={loading}>
  Submit
</Button>
```

### Styling and Theme

Dark mode theme is configured in `src/app/globals.css` using CSS variables:

```css
--primary: #8b5cf6 (purple)
--secondary: #3b82f6 (blue)
--success: #10b981 (green)
--warning: #f59e0b (orange)
--error: #ef4444 (red)
```

Use Tailwind utility classes that reference these colors:
- `bg-primary`, `text-primary`, `border-primary`
- `bg-success`, `text-success`, etc.
- Gradient text: `gradient-text` class

### Transaction Handling

Pattern for handling transactions:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!publicKey) {
    toast.error('Connect wallet first');
    return;
  }

  setLoading(true);
  const loadingToast = toast.loading('Processing...');

  try {
    const response = await fetch('/api/protocol/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, network, walletAddress: publicKey.toBase58() }),
    });

    const result = await response.json();

    if (result.success) {
      toast.success('Success!', { id: loadingToast });
      // Show transaction link
    } else {
      toast.error(result.error, { id: loadingToast });
    }
  } catch (error) {
    toast.error('Failed', { id: loadingToast });
  } finally {
    setLoading(false);
  }
};
```

## Current Implementation Status

### ✅ Completed (Foundation)
- Dark mode theme with purple/blue gradients
- Wallet adapter integration (Phantom, Solflare, etc.)
- Network context and switching UI
- Reusable UI component library
- Main layout with sidebar navigation
- Header with wallet connect button
- DLMM Create Pool (full example implementation)
- Type definitions for all 23 actions

### 🚧 To Be Implemented (22 more actions)
- Remaining DLMM pages (3)
- DAMM v2 pages (7)
- DAMM v1 pages (4)
- DBC pages (7)
- Alpha Vault page (1)
- Settings pages (2)
- All corresponding API routes
- Direct integration with meteora-invent TypeScript functions

## Integration Notes

### Calling Meteora Invent Functions

The API routes should import and call functions from meteora-invent. You may need to:

1. Configure package.json to reference meteora-invent as a workspace
2. Update tsconfig.json paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@meteora-invent/*": ["../meteora-invent/*"]
       }
     }
   }
   ```
3. Ensure meteora-invent dependencies are available

### Solana Wallet and Network

- Network is available via `useNetwork()` hook
- Wallet is available via `useWallet()` hook from Solana adapter
- All transactions should check wallet connection first
- Network selector automatically updates RPC endpoint

## Best Practices

1. **Always show wallet connection warnings** if wallet not connected
2. **Use toast notifications** for all transaction feedback
3. **Include helper text** on all form fields explaining what they do
4. **Follow the DLMM create pool example** for consistency
5. **Validate forms** before submission
6. **Show transaction links** to Solscan/SolanaFM after success
7. **Handle errors gracefully** with clear messages
