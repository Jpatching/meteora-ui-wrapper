# Interactive Bin Selection & Liquidity Visualization Guide

## Overview

The interactive bin selection chart shows **real liquidity distribution** from DLMM pools. After adding liquidity, you'll see:

- **Pink/purple glowing bars**: Your liquidity distribution across price bins
- **Draggable handles**: Interactive price range selection
- **Real-time updates**: Live liquidity data from the blockchain

## How It Works

### 1. Empty Pool (No Visualization Yet)
When a pool has no liquidity:
- You'll see placeholder bars (preview of bin structure)
- Yellow indicator: "Loading bin data from pool..."
- The chart won't show real data until liquidity is added

### 2. After Adding Liquidity
Once you add liquidity to the pool:
- Green indicator: "X bins with liquidity"
- **Pink glowing bars** appear showing your liquidity distribution
- Height of bars = amount of liquidity in each bin
- Bins within your selected range glow brighter

### 3. Interactive Selection
- **Drag the slider handles** to adjust your price range
- **Bins light up** when they're in your selected range
- **Hover over bars** to see exact price and liquidity amounts
- **Current price** shown as a cyan vertical line with pulsing animation

## Testing the Visualization

### Quick Start (Devnet)

1. **Connect Wallet** (top right)
2. **Switch to Devnet** (network selector)
3. **Navigate to a Pool** (from dashboard or create new pool)
4. **Add Liquidity**:
   - Choose strategy (Spot/Curve/Bid-Ask)
   - Select price range using the interactive slider
   - Enter token amount
   - Click "Add Liquidity"
5. **Watch the Magic**: After transaction confirms, refresh the page to see:
   - Pink glowing bars appear in the chart
   - Real liquidity distribution across your selected bins
   - Interactive range selection highlighting your active bins

### Step-by-Step Example

```bash
# 1. Get devnet SOL (if needed)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# 2. In the UI:
# - Create or navigate to a DLMM pool
# - Click "Add Liquidity" panel
# - Use the faucet (collapsible section) to get test tokens
# - Select your price range by dragging the slider
# - Add liquidity (e.g., 10 tokens)
# - Wait for transaction to confirm
# - Refresh the page or navigate back to see the updated chart
```

## Understanding the Visualization

### Bin Colors & States

- **Bright Purple Glow** (`rgba(139, 92, 246, 0.7-1.0)`): Bins within your selected range with high intensity
- **Dim Purple** (`rgba(139, 92, 246, 0.15-0.25)`): Bins outside your selected range
- **Green Glow** (`#10b981`): Active bin (current price)
- **Pulsing Cyan Line**: Current market price indicator

### Visual Feedback

- **Height**: Liquidity amount (taller = more liquidity)
- **Brightness/Glow**: Distance from current price (bell curve effect)
- **Opacity**: Selected vs. unselected bins
- **Tooltip**: Hover to see exact price + liquidity

## Debugging

### Chart Shows Only Placeholder Bars
**Issue**: No real bin data is loading

**Fixes**:
1. **Verify pool has liquidity**:
   - Check the pool address is correct
   - Ensure someone has added liquidity to the pool
2. **Check browser console** for errors:
   ```javascript
   // Look for:
   ✅ Fetched X bins with liquidity
   // Or errors like:
   ❌ Error fetching bin liquidity
   ```
3. **Refresh the page** after adding liquidity
4. **Check network**: Make sure you're on the correct network (devnet/mainnet)

### Bins Not Responding to Slider
**Issue**: Slider works but bins don't highlight

**Fixes**:
1. The bin data is calculating based on `minPrice` and `maxPrice` props
2. Check React DevTools to ensure `minPrice` and `maxPrice` are updating
3. Verify `onMinPriceChange` and `onMaxPriceChange` callbacks are working

### No Bins Showing After Adding Liquidity
**Issue**: Transaction succeeded but chart is empty

**Fixes**:
1. **Hard refresh**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Check transaction on Solscan** to verify liquidity was actually added
3. **Wait 10-20 seconds** for RPC to propagate the new state
4. **Clear cache**: Sometimes React Query cache gets stale

## Advanced: Seeding Liquidity Programmatically

If you want to seed liquidity via SDK directly:

```typescript
import { useDLMM } from '@/lib/meteora/useDLMM';

const { initializePositionAndAddLiquidityByStrategy } = useDLMM();

// Add liquidity
await initializePositionAndAddLiquidityByStrategy({
  poolAddress: 'YOUR_POOL_ADDRESS',
  strategy: 'curve',           // or 'spot' or 'bid-ask'
  minPrice: 0.9,               // Min price of range
  maxPrice: 1.1,               // Max price of range
  amount: 100,                 // Amount to deposit (UI units)
  tokenMint: 'TOKEN_MINT_ADDRESS',  // Which token to deposit
});
```

## Key Files

- **Bin Data Hook**: `src/lib/hooks/useBinLiquidity.ts` - Fetches real bin data from DLMM pools
- **Interactive Slider**: `src/components/liquidity/InteractiveRangeSlider.tsx` - Visual component
- **Price Range Picker**: `src/components/liquidity/PriceRangePicker.tsx` - Wrapper that connects hooks
- **Add Liquidity Panel**: `src/components/liquidity/AddLiquidityPanel.tsx` - Full add liquidity UI

## Expected Behavior

✅ **Correct**:
- Empty pools show placeholder bars + yellow "Loading..." indicator
- Pools with liquidity show real glowing purple bars + green "X bins" indicator
- Slider adjusts which bins are highlighted
- Bins respond smoothly to range changes with animations

❌ **Incorrect**:
- Bins never load (even after adding liquidity)
- Slider doesn't highlight bins
- Chart remains static/frozen
- Pink glow never appears

## Support

If visualization isn't working after following this guide:
1. Check browser console for errors
2. Verify pool has liquidity (check on Solscan)
3. Ensure you're using a valid DLMM pool address
4. Try a different pool that you know has liquidity

## Technical Details

The visualization uses:
- **Meteora DLMM SDK**: `@meteora-ag/dlmm` for fetching bin arrays
- **React Query**: Caching and auto-refetching bin data
- **Framer Motion**: Smooth animations for bin state changes
- **RC Slider**: Interactive double-handle range slider
