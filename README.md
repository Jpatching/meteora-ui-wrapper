# MetaTools - Meteora Protocol Suite

A beautiful, dark-mode web interface for the Meteora protocols. Your comprehensive toolkit to create and manage Meteora pools (DLMM, DAMM v1/v2, DBC, Alpha Vault) with an intuitive, polished UI and full Solana wallet integration.

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - AI development guidelines and architecture patterns
- **[docs/guides/](docs/guides/)** - Testing guides and development documentation
  - Devnet Testing Guide
  - Interactive Bin Selection Guide
  - User Token Acquisition Guide
  - And more...

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
- ⚡ **Atomic Transactions** - Single-transaction pool creation (3 → 1 tx, 66% fee reduction!)
- 🚀 **Premium RPC** - Helius primary with automatic Alchemy fallback
- 🛠️ **AI Development Tools** - 6 specialized agents + 4 slash commands + MCP server
- 📊 **Interactive Bin Selection** - Meteora-style liquidity distribution visualization with:
  - Real-time bin data from DLMM pools
  - Click bins to adjust price range
  - Clean slider interface
  - One-click liquidity testing (devnet)

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
- ✨ **ATOMIC TRANSACTION BUNDLING** - 3 transactions reduced to 1!
  - Pool creation: Fees + Token Creation + ATAs + Pool = Single transaction
  - 66% reduction in transaction count and fees
  - Single wallet approval instead of 3
  - Fully atomic operations (all-or-nothing)
- ✨ **PREMIUM RPC INTEGRATION** with automatic failover
  - Helius premium RPC as primary (devnet & mainnet)
  - Alchemy as automatic secondary fallback
  - Solana public RPC as tertiary fallback
  - Health checking and auto-switching
- ✨ **INTERACTIVE BIN SELECTION** - Meteora-style price range interface
  - Real-time liquidity distribution visualization
  - Click bins to adjust range (smart proximity detection)
  - Clean slider with min/max inputs
  - One-click liquidity testing for devnet pools
- 3-way fee distribution system (referral/buyback/treasury)
- Platform fee: 0.0085 SOL (91.5% reduction from previous 0.1 SOL)
- URL-based referral system with earnings tracking
- Transaction analytics dashboard with export/import
- Dark mode theme with custom purple/blue gradients
- Wallet adapter integration (Phantom, Solflare, etc.)
- Network context and switching (localnet/devnet/mainnet)
- Reusable UI component library
- Smart transaction retry logic with exponential backoff
- Comprehensive documentation organization (docs/)
- 6 specialized AI agents for development
- 4 slash commands for common workflows
- MCP server for transaction testing

🚧 **In Progress:**
- Complete atomic fee integration for DAMMv2, DAMMv1, DBC, AlphaVault
- Tiered RPC pricing system (Free/Pro/Custom)
- Comprehensive testing suite for atomic fee validation
- Production deployment preparation

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

### Phase 1: Atomic Transactions & Premium RPC ✅ COMPLETED

**Achievements:**
- ✅ **Atomic Transaction Bundling** - Reduced pool creation from 3 → 1 transaction
  - Single transaction includes: Fees + Token Creation + ATAs + Pool
  - 66% reduction in fees and wallet approvals
  - Fully atomic (all-or-nothing) operations
- ✅ **Premium RPC Integration** - Helius primary with Alchemy fallback
- ✅ **Platform Fee Optimization** - Reduced from 0.1 SOL to 0.0085 SOL (91.5% reduction)
- ✅ **Documentation Organization** - Clear hierarchy in docs/
- ✅ **Development Tools** - 6 AI agents, 4 slash commands, MCP server

### Phase 2: Protocol Completion (In Progress)

**Next Steps:**
1. 🚧 **DLMM Liquidity Functions** - Apply atomic pattern to:
   - `seedLiquidityLFG()`
   - `seedLiquiditySingleBin()`
   - `setPoolStatus()`
2. 📋 **DAMMv2 Integration** - Add atomic fees to all 7 functions
3. 📋 **DAMMv1 Integration** - Add atomic fees to all 4 functions
4. 📋 **DBC Integration** - Add atomic fees to all 7 functions
5. 📋 **AlphaVault Integration** - Add atomic fees to create function

### Phase 3: Advanced Features

**Planned:**
- Tiered RPC pricing (Free/Pro/Custom)
  - Free: 5 tx/month, public RPC
  - Pro: Unlimited, Helius RPC, +0.001 SOL/tx
  - Custom: User's RPC key
- Rate limiting per user tier
- RPC cost tracking dashboard
- Enhanced analytics with charts
- Multi-step transaction progress UI

### Phase 4: Production Deployment

**Requirements:**
- Security audit of fee distribution
- Comprehensive devnet testing
- Load testing and optimization
- Deployment strategy documentation
- Monitoring and logging setup

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
