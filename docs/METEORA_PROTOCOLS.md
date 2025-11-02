# Meteora Protocol Types: DLMM vs DAMM v1 vs DAMM v2

## Quick Comparison

| Feature | DLMM | DAMM v1 | DAMM v2 |
|---------|------|---------|---------|
| **Liquidity Model** | Bin-based concentrated | Constant product (full range) | Constant product (partial range) |
| **Creation Cost** | 0.25 SOL | ~0.25 SOL | 0.022 SOL (90% cheaper!) |
| **Customization** | Maximum control | Full range only | Creator sets min/max price |
| **Dual Yield** | No | Yes (lending) | No |
| **Position Type** | NFT | LP tokens | NFT |
| **Farming** | Separate program | Separate program | Built-in |
| **Best For** | Professional MMs | Passive dual yield | Token launches |
| **API Status** | ✅ Working | ❌ No API | ⚠️ TVL bug (workaround applied) |

---

## DLMM (Dynamic Liquidity Market Maker)

### What It Is
- Concentrated liquidity using discrete **bins** (price buckets)
- Based on Uniswap v3 concept but with bins instead of continuous ranges
- Each bin represents a specific price point
- LPs can choose exact bins to provide liquidity

### Technical Details
- **Bin Step**: Distance between price points (e.g., bin_step=10 = 0.1% price increments)
- **Fee Tiers**: Variable fees based on bin step
- **Position NFTs**: Each position is an NFT
- **Farm Integration**: Separate farming program for rewards

### Cost Structure
- **Creation**: ~0.25 SOL (for binArrays and position accounts)
- **Transaction**: Gas fees vary based on complexity

### Use Cases
1. **Professional Market Makers**
   - Need precise control over liquidity placement
   - Want to engineer specific liquidity shapes
   - Have strategies for active management

2. **Volatile Pairs**
   - Can concentrate liquidity around current price
   - Reduce impermanent loss
   - Maximize fee income

3. **Advanced Strategies**
   - Single-sided liquidity provision
   - Customizable fee curves
   - Range orders

### API Endpoint
```
https://dlmm-api.meteora.ag/pair/all_with_pagination
```

**Status**: ✅ Working perfectly
- Returns 119,000+ active pools
- Accurate TVL, volume, APR data
- Fast pagination support

### Example Response
```json
{
  "pairs": [
    {
      "address": "CxazBRj2gE6dhRnQbrzhBPpYVxusovA8afVPoDK5UKvR",
      "name": "MET-USDC",
      "bin_step": 1,
      "base_fee_percentage": "0.01",
      "liquidity": "80823.77",
      "trade_volume_24h": 12345.67,
      "mint_x": "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL",
      "mint_y": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "apr": 45.67,
      "fees_24h": 123.45
    }
  ]
}
```

---

## DAMM v1 (Dynamic Automated Market Maker v1)

### What It Is
- Traditional constant product AMM (x * y = k)
- **Unique Feature**: Integrated with Dynamic Vaults for dual yield
- Full price range from 0 to infinity
- Uses LP tokens (not NFTs)

### Technical Details
- **Dual Yield Mechanism**:
  - Swap fees from trades
  - Lending interest from idle liquidity (via Solend/Marginfi)
  - Lending yield auto-compounds back into pool
- **Separate Farming**: Additional rewards via farming program
- **LP Tokens**: Fungible tokens representing pool share

### Cost Structure
- **Creation**: ~0.25 SOL
- **Gas**: Standard Solana fees

### Use Cases
1. **Passive Income Seekers**
   - Want set-and-forget liquidity provision
   - Value dual yield (swap fees + lending interest)
   - Don't want to actively manage positions

2. **Stable Pairs**
   - USDC-USDT, SOL-mSOL, etc.
   - Wide price ranges acceptable
   - Prioritize yield over precision

3. **Long-Term Liquidity**
   - Projects wanting permanent liquidity
   - Community-owned liquidity initiatives

### API Endpoint
```
None - requires on-chain SDK integration
```

**Status**: ❌ No public API available
- Must use Meteora SDK
- Query pools on-chain
- Not recommended for dashboard integration

---

## DAMM v2 (Dynamic Automated Market Maker v2)

### What It Is
- **NEW** constant product AMM program (not an upgrade of v1!)
- Supports partial concentrated liquidity (min/max price set by creator)
- **90% cheaper** to create than DLMM
- Position NFTs instead of LP tokens

### Technical Details
- **Partial Concentration**: Creator sets min/max price at pool creation
- **Dynamic Fees**: Variable fee based on price volatility
- **Anti-Sniper Protection**: Fee scheduler protects against MEV
- **Built-in Farming**: No separate farming program needed
- **No Hot Accounts**: Each pool has unique accounts (better scalability)
- **Single-Sided Launch**: Can create pool with only 1 token
- **Scheduled Start**: Set custom launch time

### Major Differences from v1
| Feature | DAMM v1 | DAMM v2 |
|---------|---------|---------|
| Dynamic Vaults | ✅ Yes | ❌ No |
| Lending Yield | ✅ Yes | ❌ No |
| Fee Auto-Compound | ✅ Yes | ❌ No (manual claim) |
| Position Type | LP Tokens | NFTs |
| Creation Cost | 0.25 SOL | 0.022 SOL |
| Concentrated Liquidity | ❌ No | ✅ Yes (partial) |
| Built-in Farming | ❌ No | ✅ Yes |

### Cost Structure
- **Creation**: 0.022 SOL (90% cheaper than DLMM!)
- **Gas**: Standard Solana fees

### Use Cases
1. **Token Launches**
   - Cheap pool creation (0.022 SOL vs 0.25 SOL)
   - Single-sided launch support
   - Scheduled start time
   - Anti-sniper protection

2. **Cost-Sensitive Projects**
   - Want professional pool but limited budget
   - Need farming incentives
   - Don't require lending yield

3. **CEX + DEX Launches**
   - Launch on CEX and DEX simultaneously
   - Set price range matching CEX listing price
   - Built-in protection against price manipulation

### API Endpoint
```
https://dammv2-api.meteora.ag/pools
```

**Status**: ⚠️ Working but with TVL bug
- Returns 233,803 total pools (50 with filters)
- **Issue**: `tvl` field always returns 0
- **Workaround**: Calculate from `token_a_amount_usd + token_b_amount_usd`
- We've implemented this workaround in our backend

### Example Response
```json
{
  "data": [
    {
      "pool_address": "11BWLuxs8ow5x42hXjVPi55j9KLVa4SCn1MspbBepVQ",
      "pool_name": "NEKO-USDC",
      "token_a_mint": "6fjCN5K2hQcGg4NCxUqf5qrC3wzFksQrMmaHqQSLjups",
      "token_b_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "token_a_symbol": "NEKO",
      "token_b_symbol": "USDC",
      "token_a_amount_usd": 2139.06,   // ← Use these to calculate TVL!
      "token_b_amount_usd": 2139.06,   // ←
      "tvl": 0.0,                       // ← API bug - always 0!
      "apr": 0.0,
      "volume24h": 0.0,
      "base_fee": 1.0,
      "pool_type": 0,
      "tokens_verified": false,
      "has_farm": false
    }
  ]
}
```

### Query Parameters
```
?tokens_verified=true     - Only verified token pools (6,333 pools)
?order_by=tvl            - Sort by TVL (doesn't work due to bug)
?launchpad=jup-studio    - Filter by launchpad
?has_farm=true           - Only pools with farms
?farm_active=true        - Only active farms
```

---

## Why People Prefer DAMM v2

### 1. Cost Savings (90% cheaper)
```
DLMM:    0.25 SOL = $50 (at $200 SOL)
DAMM v2: 0.022 SOL = $4.40 (at $200 SOL)

Savings: $45.60 per pool!
```

### 2. Simplicity
- Constant product formula is easier to understand than bins
- No need to choose bin step, fee tiers, liquidity shapes
- Single-sided launch like DLMM but much cheaper

### 3. Built-in Features
- Dynamic fees (auto-adjusts to volatility)
- Anti-sniper protection (prevents MEV)
- Built-in farming (no separate program needed)
- Scheduled launch (set start time)

### 4. Perfect for Launches
- New tokens launching on Solana
- Projects with limited budgets
- CEX + DEX simultaneous launches
- Community-driven launches

### When to Choose DLMM Instead
1. Need precise liquidity control (specific bins)
2. Professional market making strategies
3. Want to engineer custom liquidity shapes
4. Volatile pairs where precision matters
5. Already have DLMM infrastructure

---

## Our Implementation

### Backend Service
**File**: `backend/src/services/poolSyncService.ts`

```typescript
// Fetch DLMM pools - works perfectly
const dlmmPools = await fetch('https://dlmm-api.meteora.ag/pair/all');

// Fetch DAMM v2 pools - need workaround for TVL
const dammPools = await fetch('https://dammv2-api.meteora.ag/pools');

// CRITICAL: Calculate TVL from token amounts (API bug workaround)
const calculatedTvl = (pool.token_a_amount_usd || 0) + (pool.token_b_amount_usd || 0);
const tvl = calculatedTvl > 0 ? calculatedTvl : (pool.tvl || 0);
```

### Database Storage
Both DLMM and DAMM v2 pools stored in same `pools` table:

```sql
CREATE TABLE pools (
  pool_address VARCHAR(64) UNIQUE,
  protocol VARCHAR(20), -- 'dlmm' or 'damm-v2'
  tvl DECIMAL(20, 2),   -- Calculated for DAMM v2
  metadata JSONB        -- Protocol-specific fields
);
```

### Frontend Display
- Both pool types shown together
- Sorted by TVL (works correctly now for both)
- Filter by protocol type
- Search by token CA works for both

---

## Future Considerations

### DAMM v1 Integration
**Status**: Not implemented
**Reason**: No public API available
**Alternative**: Would require Meteora SDK integration and on-chain queries

### Monitoring
- Watch for DAMM v2 API fix (tvl field)
- Monitor new pool launches
- Track protocol popularity trends

### Feature Requests
- Add launchpad filter
- Show scheduled launches
- Farm status indicators
- Verified token badges

---

## Resources

### Official Documentation
- DLMM Docs: https://docs.meteora.ag/dlmm
- DAMM v2 Docs: https://docs.meteora.ag/damm-v2
- API Docs: https://dammv2-api.meteora.ag/swagger-ui/

### Developer Resources
- DLMM SDK: `@meteora-ag/dlmm`
- DAMM v2 Program ID: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- OpenAPI Spec: https://dammv2-api.meteora.ag/api-docs/openapi.json

### Analytics
- Meteora App: https://app.meteora.ag/pools
- DAMM Explorer: https://damm.dlmm.me
- DeFi Llama: https://defillama.com/protocol/meteora
