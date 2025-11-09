# How Users Get Tokens - Complete Guide

## Overview

This document explains how users acquire tokens in different scenarios:
- **Devnet (Testing)**: Test tokens for developers
- **Mainnet (Production)**: Real tokens for liquidity provision

---

## Devnet - Testing Tokens

### Built-in Faucet (✅ Implemented)

**What Users See:**
- Yellow banner on pool page when on devnet
- "🎁 Request Test Tokens" button
- One-click to get tokens

**How It Works:**
1. User connects wallet
2. Switches to Devnet network
3. Clicks "Request Test Tokens" button
4. Backend automatically airdrops 100,000 TESTA + 100,000 TESTB
5. Page refreshes, tokens appear
6. User can now add liquidity

**Implementation:**
```typescript
// Component: DevnetFaucet.tsx
// API Route: /api/devnet/faucet
// Shows only when network === 'devnet'
```

**User Experience:**
```
┌─────────────────────────────────────────┐
│ ⚠️  Devnet Testing Mode                 │
│                                         │
│ You're on devnet. Need test tokens?    │
│ Click below to get free TESTA & TESTB  │
│                                         │
│  [ 🎁 Request Test Tokens ]             │
└─────────────────────────────────────────┘
```

**Advantages:**
- ✅ Zero friction for developers
- ✅ No CLI commands needed
- ✅ Instant tokens
- ✅ Can test multiple times
- ✅ Professional UX

---

## Mainnet - Real Tokens

### Scenario 1: User Already Owns Tokens

**Most Common Case:** User already holds the tokens they want to LP

**Example:**
- User has 10 SOL and 5,000 USDC
- Wants to provide liquidity to SOL-USDC pool
- Opens pool page → Add Liquidity → Done!

**Why This Happens:**
- Users come to earn fees on assets they hold
- They're looking to put idle tokens to work
- Common in DeFi: "I have tokens, let me earn yield"

### Scenario 2: User Buys Tokens First

**Flow:**
1. User wants to LP in BONK-SOL pool
2. User only has SOL
3. Opens Jupiter/Raydium
4. Swaps 50% SOL → BONK
5. Returns to your app
6. Adds liquidity with SOL + BONK

**UI Improvement (Future):**
Add "Buy Tokens" link that opens Jupiter in new tab:
```tsx
<a href={`https://jup.ag/swap/SOL-${tokenAddress}`} target="_blank">
  Need {tokenSymbol}? Buy on Jupiter →
</a>
```

### Scenario 3: One-Sided Liquidity (DLMM Superpower!)

**This is powerful** - DLMM pools support one-sided deposits!

**How It Works:**
- User only has SOL (no USDC)
- Selects "One-Side" strategy
- Deposits only SOL into SOL-USDC pool
- Gets LP position with just one token!

**Implementation:**
```typescript
// Already in your UI!
<RatioControl
  ratio={ratio}
  onRatioChange={setRatio}
  tokenXSymbol={tokenXSymbol}
  tokenYSymbol={tokenYSymbol}
/>

// When ratio === 'one-side':
// - tokenXPercentage = 100%
// - tokenYPercentage = 0%
// User only needs one token!
```

**User Flow:**
1. User has 10 SOL (no USDC)
2. Wants to LP in SOL-USDC
3. Selects "One-Side" ratio
4. Enters 5 SOL
5. Chooses price range
6. Adds liquidity with ONLY SOL
7. Done!

**Benefits:**
- ✅ No need to swap first
- ✅ No swap fees
- ✅ No slippage
- ✅ Simpler UX
- ✅ Capital efficient

### Scenario 4: Swap Integration (Future Enhancement)

**Advanced UX:** Built-in swap before LP

**Flow:**
```
┌─────────────────────────────────────────┐
│ You need both SOL and USDC              │
│                                         │
│ You have: 10 SOL                        │
│ You need: 5 SOL + 5,000 USDC            │
│                                         │
│  [ Auto-Swap 5 SOL → USDC ]             │
└─────────────────────────────────────────┘
```

**Implementation:**
1. Detect user only has one token
2. Calculate required amounts for 50-50
3. Offer one-click swap via Jupiter Aggregator
4. Execute swap
5. Auto-fill LP form
6. User confirms LP

**Code Example:**
```typescript
// Detect imbalance
if (hasOnlyTokenX && ratio === '50-50') {
  // Show swap suggestion
  const amountToSwap = tokenXAmount * 0.5;
  const jupiterSwapUrl = buildJupiterSwap(tokenX, tokenY, amountToSwap);

  // Show button
  <a href={jupiterSwapUrl} target="_blank">
    Swap {amountToSwap} {tokenXSymbol} → {tokenYSymbol}
  </a>
}
```

---

## Token Acquisition Patterns by Pool Type

### Stablecoin Pools (USDC-USDT)
- Users typically already hold stablecoins
- May transfer from CEX
- Low barrier to entry

### SOL Pairs (SOL-USDC, SOL-mSOL)
- Most users have SOL
- Easy to acquire more on any CEX
- Very liquid

### Exotic/Memecoin Pairs (BONK-SAMO)
- Users need to buy on Jupiter/Raydium first
- Higher barrier to entry
- **Solution:** One-sided liquidity helps!

### New Token Launches
- Users get airdrop or mint
- Immediate LP opportunity
- Often one-sided (only new token)

---

## Recommended UX by Network

### Devnet UX (✅ Implemented)

```typescript
if (network === 'devnet' && (tokenXBalance === 0 || tokenYBalance === 0)) {
  return (
    <DevnetFaucet
      tokenXMint={tokenXMint}
      tokenYMint={tokenYMint}
      tokenXSymbol={tokenXSymbol}
      tokenYSymbol={tokenYSymbol}
    />
  );
}
```

**Result:** One-click token acquisition for testing

### Mainnet UX (Recommended Enhancements)

#### 1. Smart Detection
```typescript
// Detect what user needs
const needsTokenX = tokenXBalance < tokenXAmount;
const needsTokenY = tokenYBalance < tokenYAmount;

if (needsTokenX || needsTokenY) {
  // Show helpful suggestions
}
```

#### 2. Contextual Help
```tsx
{needsTokenX && (
  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
    <p className="text-sm text-blue-400 mb-2">
      Need {tokenXSymbol}? Here are your options:
    </p>
    <div className="space-y-2">
      {/* Option 1: One-sided */}
      <button onClick={() => setRatio('one-side')}>
        ✓ Use one-sided liquidity (deposit only {tokenYSymbol})
      </button>

      {/* Option 2: Buy */}
      <a href={`https://jup.ag/swap/${tokenYSymbol}-${tokenXSymbol}`}>
        💱 Buy {tokenXSymbol} on Jupiter
      </a>

      {/* Option 3: Learn */}
      <a href="/docs/how-to-add-liquidity">
        📚 Learn about adding liquidity
      </a>
    </div>
  </div>
)}
```

#### 3. Auto-Balance Helper
```tsx
{hasOnlyOneToken && ratio === '50-50' && (
  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
    <p className="text-sm text-yellow-400">
      💡 You only have {availableToken}.
    </p>
    <p className="text-xs text-gray-400 mt-1">
      Suggested: Switch to "One-Side" or swap 50% to {neededToken}
    </p>
    <div className="flex gap-2 mt-2">
      <button onClick={() => setRatio('one-side')}>
        Use One-Side
      </button>
      <a href={jupiterUrl}>
        Swap on Jupiter
      </a>
    </div>
  </div>
)}
```

---

## Comparison: Devnet vs Mainnet

| Aspect | Devnet | Mainnet |
|--------|---------|---------|
| **Token Source** | Faucet | CEX/DEX/Airdrop |
| **Cost** | Free | Real money |
| **Acquisition Time** | Instant (1 click) | Minutes to hours |
| **User Journey** | Connect → Click → Get tokens | Buy → Transfer → LP |
| **Complexity** | Minimal | Moderate to High |
| **Purpose** | Testing | Production use |
| **UX Priority** | Speed & ease | Safety & clarity |

---

## Implementation Checklist

### ✅ Completed (Devnet)
- [x] DevnetFaucet component
- [x] Backend faucet endpoint
- [x] One-click token acquisition
- [x] Auto-detection of devnet
- [x] Visual feedback (toast notifications)

### 🔄 Recommended (Mainnet)
- [ ] One-sided liquidity detection
- [ ] "Need tokens?" helper component
- [ ] Jupiter swap integration link
- [ ] Auto-balance calculator
- [ ] Educational tooltips
- [ ] Token acquisition guide modal

### 🚀 Advanced (Future)
- [ ] Built-in Jupiter swap widget
- [ ] Auto-rebalance before LP
- [ ] Multi-hop swaps (SOL → USDC → Target)
- [ ] Gas estimation with token purchases
- [ ] Portfolio rebalancing suggestions

---

## Code Examples

### Example 1: Detect Insufficient Balance
```typescript
const validateLiquidity = () => {
  const errors = [];

  if (parseFloat(tokenXAmount) > (tokenXBalance || 0)) {
    errors.push({
      token: tokenXSymbol,
      needed: tokenXAmount,
      have: tokenXBalance,
    });
  }

  if (parseFloat(tokenYAmount) > (tokenYBalance || 0)) {
    errors.push({
      token: tokenYSymbol,
      needed: tokenYAmount,
      have: tokenYBalance,
    });
  }

  return errors;
};
```

### Example 2: Suggest One-Sided
```typescript
const suggestOneSided = () => {
  const hasX = (tokenXBalance || 0) > 0;
  const hasY = (tokenYBalance || 0) > 0;

  if (hasX && !hasY) {
    return {
      suggestion: 'one-side',
      token: tokenXSymbol,
      message: `You only have ${tokenXSymbol}. Consider using one-sided liquidity.`
    };
  }

  if (hasY && !hasX) {
    return {
      suggestion: 'one-side',
      token: tokenYSymbol,
      message: `You only have ${tokenYSymbol}. Consider using one-sided liquidity.`
    };
  }

  return null;
};
```

### Example 3: Build Jupiter Link
```typescript
const buildJupiterSwapLink = (
  fromToken: string,
  toToken: string,
  amount?: number
) => {
  const baseUrl = 'https://jup.ag/swap';
  const params = new URLSearchParams({
    inputMint: fromToken,
    outputMint: toToken,
  });

  if (amount) {
    params.set('amount', amount.toString());
  }

  return `${baseUrl}?${params.toString()}`;
};
```

---

## Key Takeaways

1. **Devnet = Faucet** ✅
   - One-click token acquisition
   - Zero friction for developers
   - Professional testing experience

2. **Mainnet = Multiple Paths**
   - Already own tokens (most common)
   - Buy on DEX/CEX (requires extra step)
   - One-sided liquidity (DLMM superpower!)
   - Swap integration (future enhancement)

3. **One-Sided Liquidity is Key**
   - Reduces barrier to entry
   - No need to acquire both tokens
   - Unique DLMM advantage
   - Should be prominently featured!

4. **Smart UX Helps**
   - Detect user's token holdings
   - Suggest one-sided when appropriate
   - Provide Jupiter links for swaps
   - Guide users through token acquisition

---

## Next Steps

1. **Test the devnet faucet** - Should work immediately!
2. **Emphasize one-sided liquidity** - It's a killer feature
3. **Add Jupiter integration** - Easy win for UX
4. **Create token acquisition guide** - Help modal or docs page

The devnet faucet is now live - just refresh your pool page and you should see the yellow "Request Test Tokens" banner! 🎁
