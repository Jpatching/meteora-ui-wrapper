# Meteora Invent Studio UI

A beautiful, dark-mode web interface for the Meteora Invent protocol. Create and manage Meteora pools (DLMM, DAMM v1/v2, DBC, Alpha Vault) with an intuitive, polished UI and full Solana wallet integration.

## 📚 Documentation

**[View Complete Documentation →](docs/README.md)**

- **For AI Agents:** [CLAUDE.md](CLAUDE.md) - Complete development guidelines and patterns
- **Architecture:** [docs/core/ARCHITECTURE.md](docs/core/ARCHITECTURE.md) - System design and technical details
- **Development Guides:** [docs/guides/](docs/guides/) - Testing, analytics, and implementation guides
- **Current Status:** [docs/current/](docs/current/) - Implementation summaries and known issues

## Features

- 🎨 **Modern Dark Mode UI** - Sleek purple/blue gradient theme with glassmorphism effects
- 🔌 **Wallet Integration** - Full Solana wallet adapter support (Phantom, Solflare, etc.)
- 🌐 **Network Switching** - Easy toggle between Localnet, Devnet, and Mainnet
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Real-time Notifications** - Toast notifications for transaction status
- 🔗 **Direct SDK Integration** - Client-side Meteora SDK integration via React hooks
- 📊 **23 Actions** - Complete coverage of all Meteora protocols
- 💰 **Fee Distribution** - Built-in 3-way fee split (referral/buyback/treasury)
- 🔗 **Referral System** - URL-based referral tracking with earnings
- 📈 **Transaction Analytics** - Full transaction history and analytics dashboard

## Protocols Supported

### DLMM (Dynamic Liquidity Market Maker)
- Create Pool
- Seed Liquidity (LFG)
- Seed Liquidity (Single Bin)
- Set Pool Status

### DAMM v2 (Dynamic Automated Market Maker)
- Create Balanced Pool
- Create One-Sided Pool
- Add Liquidity
- Remove Liquidity
- Split Position
- Claim Fees
- Close Position

### DAMM v1
- Create Pool
- Lock Liquidity
- Create Stake2Earn Farm
- Lock Liquidity (Stake2Earn)

### DBC (Dynamic Bonding Curve)
- Create Config
- Create Pool
- Swap
- Claim Trading Fees
- Migrate to DAMM v1
- Migrate to DAMM v2
- Transfer Pool Creator

### Alpha Vault
- Create Alpha Vault

### Settings
- Generate Keypair
- Airdrop SOL

## Setup

### Prerequisites

1. Node.js 20+ and npm
2. A local copy of the [meteora-invent](https://github.com/MeteoraAg/meteora-invent) repository

### Installation

1. Clone this repository (or navigate to it if already cloned)

```bash
cd meteora-ui-wrapper
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:
- `METEORA_INVENT_PATH` - Path to your local meteora-invent directory

4. Start the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Development

**For detailed development guidelines, see [CLAUDE.md](CLAUDE.md) and [docs/](docs/README.md)**

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dlmm/              # DLMM protocol pages
│   ├── damm-v1/           # DAMM v1 pages
│   ├── damm-v2/           # DAMM v2 pages
│   ├── dbc/               # DBC pages
│   ├── alpha-vault/       # Alpha Vault pages
│   ├── settings/          # Settings pages
│   └── analytics/         # Analytics dashboard
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components (Sidebar, Header)
│   └── form-sections/     # Form field sections
├── contexts/              # React contexts (Network, Referral, TransactionHistory)
├── providers/             # React providers (Wallet, App)
├── types/                 # TypeScript type definitions
└── lib/
    ├── meteora/           # SDK integration hooks (useDLMM, useDAMMv2, etc.)
    ├── feeDistribution.ts # Fee distribution logic
    ├── referrals.ts       # Referral system
    └── transactionStore.ts # Transaction persistence
```

### Architecture Pattern

**Browser-Native Client-Side Integration:**

1. **Page Component** - `src/app/[protocol]/[action]/page.tsx`
   - Form UI with validation
   - Wallet connection check
   - Toast notifications
   - Network awareness

2. **SDK Hook** - `src/lib/meteora/use[Protocol].ts`
   - Direct Meteora SDK integration
   - Transaction building
   - **Atomic fee prepending** (critical!)
   - Referral tracking
   - Analytics integration

3. **Types** - `src/types/meteora.ts`
   - Parameter interfaces
   - Type safety

**Transaction Flow:**
```
User Form → React Hook → Meteora SDK → Build Transaction
  → Prepend Fee Instructions (ATOMIC) → Send → Confirm → Track
```

**Key Principle:** Fees must be prepended to transactions atomically to prevent loss on failure.

### Current Status

**[See docs/current/ for detailed implementation status](docs/current/)**

✅ **Completed:**
- All 23 protocol action forms with validation
- Direct Meteora SDK integration via React hooks
- 3-way fee distribution system (referral/buyback/treasury)
- URL-based referral system with earnings tracking
- Transaction analytics dashboard with export/import
- Dark mode theme with custom purple/blue gradients
- Wallet adapter integration (Phantom, Solflare, etc.)
- Network context and switching (localnet/devnet/mainnet)
- Reusable UI component library
- Smart transaction retry logic with exponential backoff

⚠️ **Critical Known Issue:**
- **Non-atomic fee payments in some DLMM functions** (seedLiquidityLFG, seedLiquiditySingleBin, setPoolStatus)
  - Currently pay fees in separate transaction
  - Risk: If main transaction fails, fees are lost
  - Fix in progress: Atomic fee prepending pattern

🚧 **In Progress:**
- Fixing non-atomic fee payments across all protocols
- Complete fee integration for DAMMv2, DAMMv1, DBC, AlphaVault
- Comprehensive testing suite for atomic fee validation

## SDK Integration Architecture

**Client-Side Direct Integration (Current Implementation):**

The UI integrates Meteora SDK directly in React hooks running in the browser:

```typescript
// Example from src/lib/meteora/useDLMM.ts
import DLMM from '@meteora-ag/dlmm';

const createPool = async (params) => {
  // 1. Build transaction with Meteora SDK
  const initPoolTx = await DLMM.createLbPair(...);

  // 2. Get fee instructions (ATOMIC - prepend to same transaction)
  const feeInstructions = await getFeeDistributionInstructions(
    publicKey,
    referrerWallet
  );

  // 3. Prepend fees atomically
  feeInstructions.reverse().forEach((ix) => {
    initPoolTx.instructions.unshift(ix);
  });

  // 4. Send single transaction
  const signature = await sendTransaction(initPoolTx, connection);

  // 5. Confirm and track
  await confirmTransactionWithRetry(connection, signature);
  addTransaction({signature, ...});

  return signature;
};
```

**Benefits:**
- No backend required
- Direct wallet signing
- Atomic transaction composition
- Real-time feedback
- Full TypeScript type safety

## UI Components

### Reusable Components

All components in `src/components/ui/`:
- **Card** - Container with header, content, footer
- **Input** - Text input with label, error, helper text
- **Select** - Dropdown with label and validation
- **Button** - Multiple variants (primary, secondary, outline, ghost, danger)
- **Badge** - Status indicators with colors
- **Tooltip** - Hover tooltips for help text

### Layout Components

- **MainLayout** - Wrapper with sidebar and header
- **Sidebar** - Navigation with protocol sections
- **Header** - Wallet connect and network selector

## Styling

### Tailwind CSS v4

Uses CSS-based configuration in `src/app/globals.css`:
- Custom color variables for dark theme
- Purple/blue gradient brand colors
- Status colors (success, warning, error, info)
- Custom scrollbar styling
- Animations (shimmer, gradient text)

### Color System

```css
--primary: #8b5cf6 (purple)
--secondary: #3b82f6 (blue)
--success: #10b981 (green)
--warning: #f59e0b (orange)
--error: #ef4444 (red)
--info: #06b6d4 (cyan)
```

## Roadmap

### Current Priority: Atomic Fee Transaction Fixes

**Critical Issue:** Some functions pay fees in separate transactions, creating risk of lost funds.

**Protocol-by-Protocol Rollout:**

1. ✅ **DLMM Create Pool** - Already atomic (reference implementation)
2. 🚧 **DLMM Liquidity Functions** - Fix 3 non-atomic fee payments:
   - `seedLiquidityLFG()`
   - `seedLiquiditySingleBin()`
   - `setPoolStatus()`
3. 📋 **DAMMv2 Integration** - Add atomic fees to all 7 functions
4. 📋 **DAMMv1 Integration** - Add atomic fees to all 4 functions
5. 📋 **DBC Integration** - Add atomic fees to all 7 functions
6. 📋 **AlphaVault Integration** - Add atomic fees to create function

**Testing:**
- Atomic fee validation test suite
- Devnet testing for each protocol
- Transaction simulation tools (MCP server)

**Development Tools:**
- Slash commands for common workflows
- MCP server for transaction testing
- Comprehensive documentation updates

**See [docs/current/](docs/current/) for detailed status**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing form pattern
4. Test with wallet connection
5. Submit a pull request

## License

Same license as meteora-invent

## Support

For issues related to:
- **UI/UX**: Open an issue in this repository
- **Meteora protocols**: See [meteora-invent](https://github.com/MeteoraAg/meteora-invent)
