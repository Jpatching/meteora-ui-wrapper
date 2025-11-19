# Devnet Pool Auto-Indexing System

## Overview

The **Devnet Auto-Indexing System** automatically discovers and indexes devnet pools when they're accessed for the first time. This eliminates the need to manually add devnet test pools to the database.

## How It Works

### 1. **User Access Flow**

```
User visits pool page → Check if pool in DB → If not found → Auto-index from chain → Store in DB → Display pool
```

### 2. **Backend Service** (`devnetPoolSyncService.ts`)

```typescript
// Auto-index a DLMM pool from devnet
autoIndexDLMMPool(poolAddress: string)
  ├── Check if already indexed
  ├── Fetch pool data from Solana devnet RPC
  ├── Extract token info (mint, symbol, decimals)
  ├── Calculate reserves from bin data
  ├── Get current price from active bin
  └── Store in PostgreSQL database
```

**Features:**
- Fetches directly from Solana devnet using DLMM SDK
- Extracts all pool metadata (bin step, reserves, active bin)
- Calculates liquidity from on-chain bin data
- Supports both DLMM and DAMM v2 pools
- Handles duplicate prevention (upsert)

### 3. **API Endpoint** (`/api/pools/auto-index`)

**Request:**
```bash
POST /api/pools/auto-index
Content-Type: application/json

{
  "address": "HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH",
  "poolType": "dlmm"  // Optional: auto-detects if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pool HA61vP... successfully indexed from chain",
  "poolAddress": "HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH",
  "poolType": "dlmm",
  "alreadyExists": false
}
```

### 4. **Frontend Hook** (`useAutoIndexPool.ts`)

```typescript
// Automatically called when pool page loads on devnet
const { indexed, loading, error } = useAutoIndexPool(poolAddress);

// Behavior:
// 1. Only runs on devnet network
// 2. Checks if pool exists in database
// 3. If not, triggers backend auto-indexing
// 4. Returns status for UI loading states
```

### 5. **Integration** (`app/pool/[address]/page.tsx`)

```typescript
// Pool page automatically indexes devnet pools
const { indexed, loading: autoIndexing } = useAutoIndexPool(address);

// Loading state shows "Auto-indexing devnet pool from chain..."
if (autoIndexing) {
  return <LoadingState message="Auto-indexing devnet pool..." />;
}
```

## Database Schema

Devnet pools are stored in the same `pools` table with `network = 'devnet'`:

```sql
INSERT INTO pools (
  pool_address,
  pool_name,
  protocol,
  token_a_mint,
  token_b_mint,
  token_a_symbol,
  token_b_symbol,
  tvl,
  volume_24h,
  fees_24h,
  apr,
  network,         -- 'devnet'
  metadata,        -- JSON with bin_step, reserves, etc.
  last_synced_at
) VALUES (...);
```

## Use Cases

### 1. **Creating Test Pools**

```bash
# Create a DLMM pool on devnet
npm run create-pool -- --network devnet

# Visit the pool page - auto-indexed automatically!
http://localhost:3000/pool/{pool-address}
```

### 2. **Testing Add Liquidity**

```bash
# Add liquidity to devnet pool
# Pool data is fetched and stored automatically on first visit
```

### 3. **Manual Indexing** (Optional)

```bash
curl -X POST http://localhost:4000/api/pools/auto-index \
  -H "Content-Type: application/json" \
  -d '{
    "address": "HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH",
    "poolType": "dlmm"
  }'
```

## Benefits

✅ **No Manual Setup** - Just visit the pool page, it auto-indexes
✅ **Instant Access** - Pool data available in ~2-3 seconds
✅ **Persistent Storage** - Indexed once, available forever
✅ **Cache Invalidation** - Auto-clears cache after indexing
✅ **Type Detection** - Auto-detects DLMM vs DAMM v2
✅ **Token Metadata** - Fetches symbols, decimals automatically
✅ **On-Chain Accuracy** - Always fresh data from Solana RPC

## Limitations

⚠️ **Devnet Only** - Mainnet pools use Meteora API indexing
⚠️ **No Historical Data** - Volume, fees, APR are 0 (no price feeds on devnet)
⚠️ **RPC Dependency** - Requires devnet RPC access
⚠️ **First Visit Delay** - Takes ~2-3 seconds to index on first access

## Troubleshooting

### Pool Not Showing Up

1. **Check network** - Make sure you're on devnet
2. **Check backend logs** - Look for auto-indexing messages
3. **Check database** - Query `pools` table for the address
4. **Manually index** - Use POST `/api/pools/auto-index`

### RPC Errors

```
Error: 429 Too Many Requests
```
→ Use a better RPC endpoint or implement rate limiting

### SDK Version Mismatch

```
Error: Invalid account discriminator
```
→ Update `@meteora-ag/dlmm` to latest version

## Future Enhancements

- [ ] Batch indexing for multiple pools
- [ ] Background re-sync for stale data
- [ ] WebSocket updates for real-time reserves
- [ ] Historical transaction parsing for volume/fees
- [ ] Token price estimation from swaps

## Related Files

- `backend/src/services/devnetPoolSyncService.ts` - Auto-indexing logic
- `backend/src/routes/pools.ts` - API endpoint
- `src/lib/hooks/useAutoIndexPool.ts` - Frontend hook
- `src/app/pool/[address]/page.tsx` - Integration

## Testing

```bash
# Start backend
cd backend && npm run dev

# Start frontend
npm run dev

# Create a test pool on devnet
cd scripts && npx tsx setup-devnet-pool.ts

# Visit the pool page
http://localhost:3000/pool/{pool-address}

# Check backend logs for auto-indexing
```

Expected logs:
```
[DevnetSync] 🔍 Auto-indexing DLMM pool: HA61vP...
[DevnetSync] ✅ Successfully indexed pool HA61vP...
[DevnetSync]    Name: TEST-USDC
[DevnetSync]    Reserves: 300.0000 TEST / 0.0000 USDC
```

---

**Status:** ✅ Fully Implemented and Ready for Testing
