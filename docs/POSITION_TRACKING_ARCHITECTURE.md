# Position Tracking Architecture - Mainnet

> **Comprehensive guide to how user positions are tracked, fetched, and displayed in the Meteora UI Wrapper**

**Last Updated**: 2025-11-14
**Network Focus**: Mainnet (Solana mainnet-beta)
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Storage Strategy](#storage-strategy)
6. [Protocol-Specific Handling](#protocol-specific-handling)
7. [Refresh & Caching Strategy](#refresh--caching-strategy)
8. [Cost Optimization](#cost-optimization)
9. [Future Improvements](#future-improvements)

---

## Overview

The position tracking system is designed to:

- **Fetch positions** directly from Solana blockchain via Meteora SDK
- **Display positions** across multiple protocols (DLMM, DAMM v2, DBC)
- **Calculate real-time PNL** using Jupiter price feeds
- **Minimize RPC costs** through intelligent caching and rate limiting
- **Persist historical data** using localStorage
- **Provide manual refresh controls** to prevent unnecessary API calls

### Key Design Principles

1. ✅ **Cost-Effective**: Manual refresh by default, no auto-polling
2. ✅ **Multi-Protocol**: Unified interface for DLMM, DAMM v2, DBC
3. ✅ **Type-Safe**: Full TypeScript with strict interfaces
4. ✅ **Resilient**: Graceful error handling and fallbacks
5. ✅ **Persistent**: localStorage cache preserves historical data

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                         │
│  • DLMM Program Accounts (Positions, Pools)                 │
│  • SPL Token Accounts (LP tokens for DAMM v2)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ RPC Calls (rate-limited)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              METEORA SDK (@meteora-ag/dlmm)                  │
│  • DLMM.getAllLbPairPositionsByUser()                       │
│  • dlmmPool.getPositionsByUserAndLbPair()                   │
│  • AmmImpl.create() [DAMM v2]                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ SDK Response
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           FRONTEND HOOKS (React Query)                       │
│  • useUserPositions() - All positions, 60s cache            │
│  • useUserPositionsForPool() - Single pool, 30s cache       │
│  • usePositions() - Aggregates all protocols                │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────┐                  ┌─────────────────┐
│  JUPITER API     │                  │  localStorage   │
│  Token Prices    │                  │  Position Cache │
│  (30s cache)     │                  │  (persistent)   │
└────────┬─────────┘                  └────────┬────────┘
         │                                     │
         └────────────┬────────────────────────┘
                      │
                      │ Merge: On-chain + Prices + Cached
                      ▼
         ┌─────────────────────────────┐
         │  PNL CALCULATIONS            │
         │  • calculatePNL()            │
         │  • Health Score              │
         │  • APR, IL, Fees            │
         └──────────────┬──────────────┘
                        │
                        │ PositionWithPNL[]
                        ▼
         ┌─────────────────────────────┐
         │  UI COMPONENTS               │
         │  • LivePositionsTracker      │
         │  • PositionsList             │
         │  • PositionCard              │
         │  • UserPositionsPanel        │
         └─────────────────────────────┘
```

---

## Core Components

### 1. Hooks Layer

#### `useUserPositions()`
**File**: `/src/lib/hooks/useUserPositions.ts`

Fetches all DLMM positions for the connected wallet.

```typescript
const { data: positions, isLoading, refetch } = useUserPositions();
```

**Features**:
- Uses Meteora SDK's `DLMM.getAllLbPairPositionsByUser()`
- React Query caching (60s stale time)
- Rate-limited via `RPCRateLimiter`
- Returns array of `UserPosition` objects

**Return Type**:
```typescript
{
  address: string;              // Position account
  poolAddress: string;
  baseAmount: number;
  quoteAmount: number;
  unclaimedFeesBase: number;    // feeX
  unclaimedFeesQuote: number;   // feeY
  lowerBinId: number;
  upperBinId: number;
}
```

#### `useUserPositionsForPool(poolAddress)`
**File**: `/src/lib/hooks/useUserPositions.ts`

Fetches positions for a specific pool (more accurate for single-pool queries).

```typescript
const { data: poolPositions } = useUserPositionsForPool(poolAddress);
```

**Advantages**:
- Uses pool-specific SDK method: `dlmmPool.getPositionsByUserAndLbPair()`
- More reliable than filtering global positions
- Detailed logging for debugging
- 30s cache (shorter than global hook)

#### `usePositions()`
**File**: `/src/lib/hooks/usePositions.ts`

**Unified aggregation hook** that combines positions from all protocols.

```typescript
const {
  positions,          // PositionWithPNL[]
  loading,
  totalValue,
  totalPNL,
  refreshPositions    // Manual refresh function
} = usePositions();
```

**Features**:
- Aggregates: DLMM + DAMM v2 + DBC positions
- Calculates PNL using Jupiter prices
- Merges with localStorage cache
- Computes portfolio metrics (total value, PNL, fees)
- **Auto-refresh disabled** to prevent RPC spam

**Important Note**:
```typescript
/**
 * AUTO-REFRESH DISABLED TO PREVENT RPC SPAM
 *
 * Previous implementation made 3+ getProgramAccounts calls every 30s,
 * resulting in excessive RPC usage and rate limiting.
 *
 * Current approach: Manual refresh only via refreshPositions()
 */
```

---

### 2. Display Components

#### `LivePositionsTracker`
**File**: `/src/components/positions/LivePositionsTracker.tsx`

Main position dashboard with portfolio metrics and controls.

**Features**:
- Portfolio summary (total value, PNL, fees earned)
- Manual refresh button
- Optional auto-refresh toggle (30s/60s/2m/5m intervals)
- RPC status monitoring
- Network banner (devnet warning)
- Loading states

**UI Elements**:
```tsx
<LivePositionsTracker />
```

Displays:
- Total Portfolio Value
- Unrealized PNL ($ and %)
- Total Fees Earned
- Active Positions count
- Refresh controls

#### `PositionsList`
**File**: `/src/components/positions/PositionsList.tsx`

Grid display of position cards with filtering and sorting.

**Features**:
- Filter by protocol (All, DLMM, DAMM v2, DBC)
- Sort by: Value, PNL, Fees, Health Score
- Responsive grid layout
- Loading skeleton states
- Empty state message

#### `PositionCard`
**File**: `/src/components/positions/PositionCard.tsx`

Individual position card with expandable details.

**Displays**:
- Token pair (with icons)
- Position value (USD)
- Unrealized PNL ($ and %)
- Health score badge (0-100)
- Protocol badge (DLMM, DAMM v2, etc.)
- Expandable section:
  - Token amounts
  - Unclaimed fees
  - Bin range (DLMM only)
  - Impermanent loss
  - APR estimate
  - Created date
- Action buttons (Claim, Close)

**Health Score Color Coding**:
- 🟢 80-100: Excellent (green)
- 🟡 60-79: Good (yellow)
- 🟠 40-59: Fair (orange)
- 🔴 0-39: Poor (red)

#### `UserPositionsPanel`
**File**: `/src/components/pool/UserPositionsPanel.tsx`

Pool-specific position display (used in pool detail pages).

**Features**:
- Charting.ag-inspired clean design
- Inline claim/remove actions
- Percentage-based liquidity removal slider (1-100%)
- Real-time position updates after actions
- Compact layout for sidebars

---

### 3. Backend API Routes

**File**: `/backend/src/routes/positions.ts`

Provides transaction building services for position actions.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/positions/create` | Create new LP position |
| POST | `/api/positions/claim-fees` | Claim accumulated fees |
| POST | `/api/positions/remove-liquidity` | Remove liquidity (full/partial) |
| GET | `/api/positions/user/:walletAddress` | Fetch all user positions |
| GET | `/api/positions/:address` | Get specific position details |

**Supported Protocols**: DLMM, DAMM v2

#### Example: Creating DLMM Position

```typescript
// Request
POST /api/positions/create
{
  "poolAddress": "6tD...",
  "tokenAAmount": "1000000000",
  "tokenBAmount": "500000000",
  "minBinId": 8215,
  "maxBinId": 8225,
  "strategyType": "SpotBalanced",
  "walletAddress": "7Xp...",
  "network": "mainnet-beta"
}

// Response
{
  "success": true,
  "transaction": "AQAAAAAAAAAAAAAAAA...", // Base64 serialized
  "message": "DLMM position creation transaction created"
}
```

Frontend then signs and sends the transaction via wallet adapter.

---

## Data Flow

### 1. Initial Position Fetch

```
User Connects Wallet
    ↓
usePositions() hook activated
    ↓
Check React Query cache (60s TTL)
    ├─ Cache hit → Return cached data
    └─ Cache miss ↓
        ↓
RPC Rate Limiter (max 2 concurrent, 200ms delay)
    ↓
Meteora SDK: DLMM.getAllLbPairPositionsByUser()
    ↓
SDK returns Map<PublicKey, PositionData>
    ↓
Transform to UserPosition[]
    ↓
Fetch token prices from Jupiter API
    ↓
Merge with localStorage cache (for historical data)
    ↓
Calculate PNL, health score, fees
    ↓
Update React Query cache
    ↓
Save to localStorage
    ↓
Render UI components
```

### 2. Manual Refresh Flow

```
User clicks "Refresh" button
    ↓
Invalidate React Query cache
    ↓
Re-fetch positions from chain (same flow as above)
    ↓
Update UI with new data
    ↓
Show "Last updated: Just now"
```

### 3. Position Action Flow (Claim Fees)

```
User clicks "Claim Fees" on PositionCard
    ↓
POST /api/positions/claim-fees
    ├─ positionAddress
    ├─ walletAddress
    └─ network
    ↓
Backend builds transaction via Meteora SDK
    ├─ dlmmPool.claimAllRewardsByPosition()
    └─ Returns serialized transaction
    ↓
Frontend receives transaction
    ↓
Wallet adapter requests signature
    ↓
User approves in wallet (Phantom/Solflare)
    ↓
Send transaction to Solana
    ↓
Wait for confirmation
    ↓
Invalidate position cache
    ↓
Re-fetch positions
    ↓
Update UI (fees now 0, balance increased)
```

---

## Storage Strategy

### Frontend: localStorage

**File**: `/src/lib/positionStore.ts`

**Purpose**: Persist position history and initial values across sessions.

#### Storage Schema

```typescript
{
  version: "1.0",
  positions: UserPosition[],
  lastUpdated: number // timestamp
}
```

#### Key Functions

```typescript
// Get all positions
const positions = getAllPositions();

// Add new position
addPosition({
  id: "pos_123",
  walletAddress: "7Xp...",
  poolAddress: "6tD...",
  protocol: "dlmm",
  baseAmount: 1000,
  quoteAmount: 500,
  initialValueUSD: 1500,
  createdAt: Date.now()
});

// Update position
updatePosition("pos_123", { baseAmount: 900 });

// Get wallet positions
const myPositions = getWalletPositions("7Xp...");

// Portfolio summary
const summary = getPortfolioSummary("7Xp...");
// Returns: { totalValue, totalPNL, positionCount }

// Backup/restore
const backup = exportPositions();
importPositions(backup);
```

#### Merge Strategy

When fetching positions:

1. Fetch fresh positions from chain
2. Load cached positions from localStorage
3. Merge:
   - Use fresh on-chain data for amounts/fees
   - Preserve `initialValueUSD` and `createdAt` from cache
   - Calculate PNL = currentValue - initialValueUSD
4. Save merged result back to localStorage

**Why?**

On-chain position accounts don't store creation time or initial value. localStorage preserves this for accurate PNL calculations.

### Backend: No Database (Transaction-Only)

**Current Implementation**: Backend does NOT persist positions. It only:

- Builds transactions on-demand
- Returns serialized transactions to frontend
- Frontend handles signing and submission

**Future Consideration**: Could add PostgreSQL indexing for:
- Faster position loading
- Historical PNL charts
- Position notifications
- Analytics dashboards

---

## Protocol-Specific Handling

### DLMM (Dynamic Liquidity Market Maker)

**Characteristics**:
- ✅ Concentrated liquidity with discrete price bins
- ✅ NFT-based position representation
- ✅ Manual fee claiming required
- ✅ Strategy-based liquidity distribution

#### Position Structure

```typescript
{
  address: "9sF...",              // Position account (NFT)
  poolAddress: "6tD...",
  baseAmount: 1000,               // Sum across all bins
  quoteAmount: 500,
  unclaimedFeesBase: 2.5,         // feeX from SDK
  unclaimedFeesQuote: 1.2,        // feeY from SDK
  lowerBinId: 8215,               // Min price bin
  upperBinId: 8225,               // Max price bin
}
```

#### SDK Methods

```typescript
// Fetch all positions
const positionsMap = await DLMM.getAllLbPairPositionsByUser(
  connection,
  publicKey,
  { cluster: 'mainnet-beta' }
);

// Pool-specific positions
const dlmmPool = await DLMM.create(connection, poolAddress);
const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(publicKey);

// Create position
const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: positionKeypair.publicKey,
  user: userPubkey,
  totalXAmount: new BN(tokenAAmount),
  totalYAmount: new BN(tokenBAmount),
  strategy: {
    maxBinId: 8225,
    minBinId: 8215,
    strategyType: StrategyType.SpotBalanced
  }
});

// Claim fees
const claimTx = await dlmmPool.claimAllRewardsByPosition({
  owner: userPubkey,
  position: positionPubkey
});

// Remove liquidity
const removeTx = await dlmmPool.removeLiquidity({
  position: positionPubkey,
  user: userPubkey,
  bps: new BN(5000) // 50% removal (basis points)
});
```

#### UI Features

- Bin range display: "Bin 8215 → 8225"
- Price range visualization
- Strategy selection (Spot, Curve, BidAsk)
- Percentage-based removal slider

---

### DAMM v2 (Dynamic AMM v2)

**Characteristics**:
- ✅ Full-range liquidity (no bins)
- ✅ SPL token-based LP shares
- ✅ Auto-compounding fees (no manual claim)
- ✅ Dynamic fee structure

#### Position Structure

```typescript
{
  poolAddress: "8bR...",
  lpBalance: 1500,                // SPL token balance
  baseAmount: 1000,               // Pro-rata share of reserves
  quoteAmount: 500,
  unclaimedFeesBase: 0,           // Always 0 (auto-compounded)
  unclaimedFeesQuote: 0,
  // No lowerBinId/upperBinId (full range)
}
```

#### SDK Methods

```typescript
// Load pool
const dammPool = await AmmImpl.create(connection, poolAddress);

// Add liquidity
const depositTx = await dammPool.deposit({
  tokenAAmount: new BN(1000000000),
  tokenBAmount: new BN(500000000),
  user: userPubkey
});

// Remove liquidity
const withdrawTx = await dammPool.withdraw({
  lpAmount: new BN(750), // Half of LP tokens
  user: userPubkey
});
```

#### UI Features

- "Full Range" label (no bins)
- LP token amount display
- Simplified interface (no fee claim button)
- Amount-based removal (not percentage)

---

### Key Differences: DLMM vs DAMM v2

| Feature | DLMM | DAMM v2 |
|---------|------|---------|
| **Liquidity Type** | Concentrated (bins) | Full-range |
| **Position Representation** | NFT account | LP tokens (SPL) |
| **Fee Claiming** | Manual (claim button) | Auto-compounded |
| **Price Range** | User-defined bins | Entire curve |
| **Removal Method** | Basis points (BPS) | Token amount |
| **Fee Display** | Unclaimed fees shown | Fees included in LP value |
| **Strategy Options** | Spot/Curve/BidAsk | N/A |
| **SDK Package** | `@meteora-ag/dlmm` | `@meteora-ag/amm` |

---

## Refresh & Caching Strategy

### Design Philosophy: Manual-First

**Problem**: Auto-refresh polling causes:
- 🔴 Excessive RPC calls (3+ per 30s)
- 🔴 Rate limiting (429 errors)
- 🔴 High API costs ($$$)
- 🔴 Poor user experience

**Solution**: Manual refresh by default, with opt-in auto-refresh.

### React Query Configuration

```typescript
useQuery({
  queryKey: ['user-positions', publicKey?.toBase58(), network],
  queryFn: fetchPositions,

  // Caching
  staleTime: 60000,           // 60s - data considered fresh
  cacheTime: 300000,          // 5min - cache persists in memory

  // Refresh behavior
  refetchInterval: false,         // ❌ NO auto-refresh
  refetchOnWindowFocus: false,    // ❌ NO refetch on tab focus
  refetchOnReconnect: false,      // ❌ NO refetch on network reconnect

  // Error handling
  retry: 2,                       // Retry failed requests twice
  retryDelay: 1000,              // 1s between retries
});
```

### Multi-Level Caching

```
User Request
    ↓
┌─────────────────────────┐
│ React Query Cache       │  60s TTL
│ (in-memory)             │  ← Fastest
└────────┬────────────────┘
         │ Cache miss
         ↓
┌─────────────────────────┐
│ RPC Response Cache      │  30s TTL
│ (RPCRateLimiter)        │  ← Fast
└────────┬────────────────┘
         │ Cache miss
         ↓
┌─────────────────────────┐
│ Solana RPC Call         │  ~500ms
│ (rate-limited)          │  ← Slow
└────────┬────────────────┘
         │
         ↓
    Fresh Data
```

### Rate Limiting

**File**: `/src/lib/utils/rpcRateLimiter.ts`

**Configuration**:
- ✅ Max 2 concurrent requests
- ✅ 200ms delay between requests (5 req/sec max)
- ✅ 30s response cache
- ✅ Queue-based execution

**Why?**

Prevents RPC provider rate limiting (most limit to 10 req/sec). Queuing ensures we never exceed limits.

```typescript
const limiter = new RPCRateLimiter({
  maxConcurrent: 2,
  minDelay: 200,
  cacheTTL: 30000
});

// All RPC calls go through limiter
const result = await limiter.execute(
  'getAllLbPairPositionsByUser',
  async () => {
    return await DLMM.getAllLbPairPositionsByUser(connection, publicKey);
  }
);
```

### User-Controlled Refresh

#### Manual Refresh Button

```tsx
<button onClick={refreshPositions}>
  {loading ? 'Refreshing...' : 'Refresh Positions'}
</button>
```

- ✅ Instant feedback (loading state)
- ✅ Shows "Last updated: X seconds ago"
- ✅ User controls timing

#### Opt-In Auto-Refresh

```tsx
<Toggle
  checked={autoRefreshEnabled}
  onChange={setAutoRefreshEnabled}
  label="Auto-refresh"
/>

<Select value={refreshInterval} onChange={setRefreshInterval}>
  <option value={30}>30 seconds</option>
  <option value={60}>1 minute (recommended)</option>
  <option value={120}>2 minutes</option>
  <option value={300}>5 minutes</option>
</Select>
```

**Default**: OFF (user must enable)

**Help Text**:
> "Auto-refresh makes RPC calls at regular intervals. This may increase API costs. We recommend keeping it disabled and using manual refresh."

---

## Cost Optimization

### RPC Cost Savings Techniques

#### 1. Eliminate Auto-Polling

**Before**: 3 `getProgramAccounts` calls every 30s = 8,640 calls/day
**After**: Manual refresh only = ~50 calls/day
**Savings**: **99.4%** reduction in RPC calls

#### 2. Batch Token Price Fetching

```typescript
// ❌ BAD: Individual price fetches
for (const position of positions) {
  const price = await fetchTokenPrice(position.baseMint);
}

// ✅ GOOD: Batch fetch
const allMints = [...new Set(positions.flatMap(p => [p.baseMint, p.quoteMint]))];
const prices = await fetchMultipleTokenPrices(allMints);
```

**Savings**: N calls → 1 call (N = number of positions)

#### 3. Response Caching

```typescript
// Cache RPC responses for 30s
const cache = new Map<string, { data: any, timestamp: number }>();

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }
  return null;
}
```

**Savings**: Repeated calls within 30s = 0 RPC calls

#### 4. Query Deduplication

React Query automatically deduplicates identical queries:

```typescript
// Component A requests positions
usePositions();

// Component B requests positions (same time)
usePositions();

// Result: Only 1 RPC call (shared between components)
```

#### 5. Lazy Position Loading

```typescript
// ❌ BAD: Always fetch positions
useEffect(() => {
  fetchPositions();
}, []);

// ✅ GOOD: Only fetch if wallet connected
useEffect(() => {
  if (publicKey) {
    fetchPositions();
  }
}, [publicKey]);
```

**Savings**: No unnecessary calls for disconnected wallets

### Estimated Monthly RPC Costs

**Assumptions**:
- Average user: 10 positions
- RPC cost: $0.001 per `getProgramAccounts` call
- Usage: 100 active users/month

#### With Auto-Refresh (30s interval)

```
8,640 calls/day/user × 100 users × 30 days × $0.001 = $25,920/month
```

#### With Manual Refresh (avg 50 calls/day)

```
50 calls/day/user × 100 users × 30 days × $0.001 = $150/month
```

**Total Savings**: **$25,770/month** (99.4% reduction)

---

## Future Improvements

### 1. WebSocket Account Subscriptions

**Current**: Manual polling via RPC calls
**Future**: Real-time updates via WebSocket

```typescript
// Pseudo-code for WebSocket implementation
connection.onAccountChange(
  positionAddress,
  (accountInfo) => {
    const updatedPosition = parsePositionData(accountInfo);
    updatePosition(positionId, updatedPosition);
  },
  'confirmed'
);
```

**Benefits**:
- ✅ True real-time updates (no delay)
- ✅ Zero polling RPC calls
- ✅ Lower latency
- ✅ Cost-effective (WebSocket connections are cheap)

**Challenges**:
- Need to subscribe to each position account individually
- Connection management (reconnects, errors)
- Initial state sync

---

### 2. Backend Position Indexing

**Current**: Positions fetched from chain on every load
**Future**: Server-side PostgreSQL database

**Schema**:
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  protocol TEXT NOT NULL, -- 'dlmm', 'damm-v2', etc.
  base_amount NUMERIC,
  quote_amount NUMERIC,
  unclaimed_fees_base NUMERIC,
  unclaimed_fees_quote NUMERIC,
  lower_bin_id INTEGER,
  upper_bin_id INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  CONSTRAINT unique_position UNIQUE (wallet_address, pool_address, protocol)
);

CREATE INDEX idx_wallet ON positions(wallet_address);
CREATE INDEX idx_pool ON positions(pool_address);
```

**Benefits**:
- ✅ Instant position loading (no chain fetch)
- ✅ Historical PNL charts
- ✅ Analytics dashboards
- ✅ Position notifications

**Implementation**:
- Background worker updates positions every 60s
- Frontend fetches from backend API
- Fallback to chain if backend stale

---

### 3. Position History Charts

**Feature**: Track PNL over time

```tsx
<PositionPNLChart positionId="pos_123" timeRange="7d" />
```

**Data Points**:
- Daily snapshots of position value
- PNL trend line
- Fees accumulated over time
- APR estimates

**Storage**:
```typescript
{
  positionId: "pos_123",
  snapshots: [
    { timestamp: 1699999999, value: 1500, pnl: 0, fees: 0 },
    { timestamp: 1700086399, value: 1520, pnl: 20, fees: 5 },
    { timestamp: 1700172799, value: 1540, pnl: 40, fees: 12 }
  ]
}
```

---

### 4. DAMM v1 Support

**Current**: Only DAMM v2 positions tracked
**Future**: Add DAMM v1 (legacy pools)

**SDK Package**: `@meteora-ag/amm` (v1 methods)

**Challenges**:
- Different program IDs
- Legacy data structures
- Lower priority (most users migrated to v2)

---

### 5. Alpha Vault Positions

**Current**: Not implemented
**Future**: Track Alpha Vault strategies

**Position Data**:
```typescript
{
  vaultAddress: string;
  strategy: 'ALPHA_PURSUIT' | 'STABLE_YIELD';
  depositAmount: number;
  currentValue: number;
  apr: number;
  autoRebalancing: boolean;
}
```

**SDK**: `@meteora-ag/alpha-vault`

---

### 6. Position Notifications

**Feature**: Alert users on significant events

**Notification Types**:
- 🔔 PNL exceeds +10%
- 🔔 Position health < 40
- 🔔 Unclaimed fees > $100
- 🔔 Price exits bin range (DLMM)

**Implementation**:
```typescript
// Check on position update
if (position.pnl > position.value * 0.1) {
  showNotification({
    title: "Great News!",
    message: `Your ${position.tokenPair} position is up 10%!`,
    action: { label: "View", url: `/positions/${position.id}` }
  });
}
```

**Channels**:
- In-app toast notifications
- Browser push notifications (with permission)
- Email/SMS (future, requires backend)

---

### 7. Impermanent Loss Tracking

**Current**: IL calculation is placeholder
**Future**: Accurate IL tracking

**Formula**:
```typescript
function calculateActualIL(position: Position): number {
  const { initialBaseAmount, initialQuoteAmount, initialPriceRatio } = position;
  const currentPriceRatio = getCurrentPrice(position.poolAddress);

  // Value if held in wallet (not LP)
  const holdValue =
    (initialBaseAmount * currentBasePrice) +
    (initialQuoteAmount * currentQuotePrice);

  // Current LP value
  const lpValue = position.currentValue;

  // IL = difference
  return holdValue - lpValue;
}
```

**Display**:
```tsx
<Card>
  <h3>Impermanent Loss</h3>
  <div className={il > 0 ? 'text-error' : 'text-success'}>
    {il > 0 ? '-' : '+'}{formatUSD(Math.abs(il))} ({formatPercent(il / initialValue)})
  </div>
  <p className="text-xs">
    {il > 0
      ? "You would have more value if you held tokens separately"
      : "LP position outperformed holding tokens"}
  </p>
</Card>
```

**Requires**:
- Store `initialPriceRatio` on position creation
- Historical price data

---

### 8. Mobile App

**Platform**: React Native
**Features**:
- Same position tracking functionality
- Push notifications
- Quick actions (claim, close)
- Biometric authentication

---

### 9. Position Sharing

**Feature**: Share position screenshots

```tsx
<button onClick={() => sharePosition(position.id)}>
  Share Position 📸
</button>
```

**Implementation**:
- Generate image from position card (canvas)
- Include QR code to pool
- Twitter/Discord integration
- Privacy mode (hide values)

---

### 10. Portfolio Rebalancing Assistant

**Feature**: AI-powered rebalancing suggestions

```tsx
<RebalancingAssistant positions={positions} />
```

**Suggestions**:
- "Your SOL/USDC position is 80% SOL. Rebalance to 50/50?"
- "Close low-health positions and consolidate into higher-performing pools"
- "Your range is too wide. Concentrate liquidity to earn more fees"

**Implementation**:
- Rule-based engine
- Historical APR analysis
- Risk scoring

---

## Summary

The Meteora UI Wrapper position tracking system is **production-ready for mainnet** with excellent cost optimization and user experience:

### ✅ Strengths

1. **Cost-Effective**: 99%+ reduction in RPC calls via manual refresh
2. **Multi-Protocol**: DLMM, DAMM v2, DBC in unified interface
3. **Type-Safe**: Full TypeScript with strict interfaces
4. **Resilient**: Graceful error handling and fallbacks
5. **Persistent**: localStorage preserves historical data
6. **Real-Time PNL**: Jupiter-powered price feeds
7. **Health Monitoring**: Composite score for position quality

### 🚧 Future Work

- WebSocket subscriptions (true real-time)
- Backend indexing (faster loads)
- Historical charts (PNL over time)
- Notifications (alerts on events)
- Accurate IL tracking
- Additional protocols (Alpha Vault, DAMM v1)

---

**Architecture Status**: ✅ Production-Ready
**Recommended Next Steps**: Implement WebSocket subscriptions for real-time updates without polling

---

## File Reference Index

**Hooks**:
- `/src/lib/hooks/useUserPositions.ts` - Position fetching
- `/src/lib/hooks/usePositions.ts` - Multi-protocol aggregation
- `/src/lib/hooks/useBinData.ts` - DLMM bin data

**Components**:
- `/src/components/positions/LivePositionsTracker.tsx` - Main dashboard
- `/src/components/positions/PositionsList.tsx` - Grid display
- `/src/components/positions/PositionCard.tsx` - Individual card
- `/src/components/pool/UserPositionsPanel.tsx` - Pool-specific

**Services**:
- `/src/lib/positionStore.ts` - localStorage persistence
- `/src/lib/pnlCalculations.ts` - PNL/health calculations
- `/src/lib/prices.ts` - Jupiter price fetching
- `/src/lib/utils/rpcRateLimiter.ts` - Rate limiting

**Backend**:
- `/backend/src/routes/positions.ts` - API endpoints

**Types**:
- `/src/types/positions.ts` - TypeScript interfaces

---

*Last updated: 2025-11-14*
