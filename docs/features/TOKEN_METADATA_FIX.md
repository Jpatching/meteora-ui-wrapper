# Token Metadata Fix - UNKNOWN Tokens Resolution

## Problem Summary

Many token pairs were showing as "UNKNOWN-USDC", "UNKNOWN-SOL" instead of proper token symbols like "MET-USDC", "WLFI-USD1", etc.

### Root Cause Analysis

1. **Backend database** correctly stores token symbols from Meteora API ✅
2. **Frontend transformation** correctly extracts symbols from backend response ✅
3. **Token metadata enrichment** was the bottleneck ❌

The issue was that the `enrichPoolWithMetadata()` function was calling the backend token metadata service which used **SolanaFM API** as the primary source. Many tokens are not indexed in SolanaFM, causing them to be cached as "UNKNOWN" for 7 days.

## Solution Implemented

### 1. Updated Backend Token Metadata Service

**File**: `backend/src/services/tokenMetadataService.ts`

**Changes**:
- Added **Jupiter Token API v1** as PRIMARY data source (30,000+ tokens)
- Implemented in-memory caching of Jupiter token list (refreshes every 1 hour)
- Updated fallback chain:
  1. Common tokens (SOL, USDC, USDT) - hardcoded for instant lookup
  2. **Jupiter Token API** (PRIMARY - 30k+ tokens)
  3. SolanaFM API (fallback for tokens not in Jupiter)
  4. UNKNOWN (cached for only 1 hour instead of 7 days)

**Benefits**:
- Jupiter provides comprehensive coverage of Solana tokens
- In-memory cache enables O(1) lookups after initial fetch
- IPFS URLs from Jupiter are more reliable than nftstorage.link
- Shorter TTL for UNKNOWN tokens allows re-fetching if indexed later

### 2. Created Cache Clearing Script

**File**: `backend/clear-unknown-cache.js`

A Node.js script to clear all UNKNOWN tokens from Redis cache, allowing them to be re-fetched with the new Jupiter-based service.

## Testing Instructions

### Step 1: Clear UNKNOWN Token Cache

```bash
cd backend
node clear-unknown-cache.js
```

Expected output:
```
🔄 Connecting to Redis...
🔍 Scanning for token metadata keys...
📊 Found X cached tokens
🗑️  Cleared: token:metadata:abc123...
...
✅ Cache cleanup complete!
   - Cleared: X UNKNOWN tokens
   - Kept: Y known tokens
💡 UNKNOWN tokens will be re-fetched from Jupiter on next request
```

### Step 2: Restart Backend Server

```bash
# Kill existing backend process
pkill -f "node.*backend"

# Start backend (or let it run in your terminal)
cd backend
npm run dev
```

Watch for this log on first token fetch:
```
🪐 Fetching Jupiter token list...
✅ Loaded 30000+ tokens from Jupiter
```

### Step 3: Test Frontend

1. Open your browser to `http://localhost:3000`
2. Navigate to the DYN2 tab (DAMM v2 pools)
3. Verify that pools now show correct token symbols:
   - ✅ **MET-USDC** (instead of UNKNOWN-USDC)
   - ✅ **WLFI-USD1** (instead of UNKNOWN-USD1)
   - ✅ **UMBRA-USDC** (instead of UNKNOWN-USDC)
   - ✅ **AVICI-USDC** (instead of UNKNOWN-USDC)

### Step 4: Verify Token Logos

Check that token logos are loading correctly:
- SOL, USDC, USDT should always have logos (hardcoded)
- Other tokens should load Jupiter's logoURI
- Fallback: First letter of symbol in gradient circle

## Architecture Diagram

```
Frontend (Next.js)
    ↓
    ↓ HTTP Request: GET /api/tokens/{address}
    ↓
Backend API (/api/tokens)
    ↓
    ↓ Check Redis cache
    ↓
Token Metadata Service
    ↓
    ├─→ 1. Common Tokens (SOL, USDC, USDT) → Return instantly
    ├─→ 2. Redis Cache → Return if cached
    ├─→ 3. Jupiter API (PRIMARY) → Fetch & cache for 7 days
    ├─→ 4. SolanaFM API (Fallback) → Fetch & cache for 7 days
    └─→ 5. UNKNOWN → Cache for 1 hour only
```

## Performance Improvements

1. **Jupiter token list** cached in memory for 1 hour
   - First fetch: ~10s (downloads 30k+ tokens)
   - Subsequent lookups: <1ms (in-memory Map lookup)

2. **Redis caching** prevents repeated API calls
   - Known tokens: 7 day TTL
   - Unknown tokens: 1 hour TTL (allows re-indexing)

3. **Batch API** for frontend (`/api/tokens/batch`)
   - Fetch metadata for multiple tokens in parallel
   - Used by pool enrichment to load 100+ tokens at once

## API Endpoints

### Single Token Metadata
```bash
GET http://localhost:4000/api/tokens/{address}

Response:
{
  "success": true,
  "data": {
    "address": "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL",
    "symbol": "MET",
    "name": "Meteora",
    "decimals": 9,
    "logoURI": "https://...",
    "verified": true
  }
}
```

### Batch Token Metadata
```bash
POST http://localhost:4000/api/tokens/batch

Body:
{
  "addresses": ["address1", "address2", "address3"]
}

Response:
{
  "success": true,
  "data": {
    "address1": { symbol: "MET", ... },
    "address2": { symbol: "WLFI", ... },
    "address3": { symbol: "UMBRA", ... }
  },
  "count": 3
}
```

## Troubleshooting

### Issue: Still seeing UNKNOWN tokens

**Solution**:
1. Verify Redis cache was cleared: `node backend/clear-unknown-cache.js`
2. Check backend logs for Jupiter fetch: `🪐 Fetching Jupiter token list...`
3. Restart backend server completely
4. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Jupiter API timeout

**Solution**:
- Jupiter API has 10s timeout - it should complete in 2-3s normally
- If failing, service will fall back to SolanaFM
- Check network connection and firewall settings

### Issue: IPFS images still failing

**Solution**:
- Jupiter provides better image URLs than nftstorage.link
- Frontend has fallback to first letter of symbol in gradient circle
- IPFS resolution in `tokenMetadata.ts` skips unreachable nftstorage.link URLs

## Monitoring

### Backend Logs to Watch

```
✅ Found MET in Jupiter          // Token found in Jupiter
✅ Found UMBRA in SolanaFM       // Token found in SolanaFM fallback
⚠️ Token abc123... not found     // Token truly unknown (rare)
🪐 Fetching Jupiter token list...  // Loading Jupiter cache (every 1h)
✅ Loaded 30000 tokens from Jupiter
```

### Frontend Console Logs

```
🔍 Starting enrichment for 100 pools...
✅ Enriched 100 pools with token metadata
📊 Sample enriched pool: { baseAsset: { symbol: "MET", icon: "https://..." } }
```

## Files Modified

1. `backend/src/services/tokenMetadataService.ts` - Added Jupiter as primary source
2. `backend/clear-unknown-cache.js` - NEW: Cache clearing script

## Files NOT Modified (Already Correct)

1. `backend/src/services/poolSyncService.ts` - Already extracts symbols from Meteora API ✅
2. `backend/src/routes/tokens.ts` - Already exposes batch API ✅
3. `src/app/page.tsx` - Already transforms backend data correctly ✅
4. `src/lib/hooks/useBackendPools.ts` - Already provides symbols ✅

## Next Steps (Optional Improvements)

1. **Image Optimization**: Add CDN proxy for token images
2. **On-Chain Metadata**: Fetch from Metaplex if both APIs fail
3. **User Reporting**: Allow users to report missing/incorrect metadata
4. **Admin Panel**: Interface to manually add/edit token metadata

## Support

If issues persist after following this guide:

1. Check backend logs: `npm run dev` in `/backend`
2. Check frontend console in browser DevTools
3. Verify Redis is running: `redis-cli ping` (should return "PONG")
4. Verify PostgreSQL has pool data: Check `/api/pools/top` endpoint

---

**Last Updated**: 2025-11-06
**Author**: Claude Code
**Status**: ✅ Ready for Testing
