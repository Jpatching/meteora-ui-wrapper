# Interactive Bin Selection Testing Guide

## 🚀 What's New - Fully Interactive Bins!

Your bin chart is now **fully interactive** like Meteora's UI:

✅ **Click bins directly** to set min/max price
✅ **Drag slider handles** for precise range control
✅ **Visual feedback** - bins glow on hover
✅ **One-click testing** - Quick Liquidity Tester for instant results
✅ **Real-time updates** - See your liquidity distribution immediately

---

## 🎯 Quick Start (3 Steps)

### Step 1: Connect & Get Tokens (30 seconds)

```bash
# 1. Start the dev server
npm run dev

# 2. Open browser: http://localhost:3000
# 3. Connect wallet (top right)
# 4. Switch to "devnet" (network selector)
# 5. Get SOL (if needed):
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Step 2: Navigate to Pool (10 seconds)

- Go to Dashboard
- Click any existing DLMM pool
- OR create a new pool (DLMM → Create Pool)

### Step 3: Test Interactive Bins (1 click!)

**Option A - Quick Tester (Recommended)**

1. Scroll to "🧪 Quick Test: Add Liquidity & See Bins"
2. Click any strategy button (Spot/Curve/Bid-Ask)
3. Wait 3-5 seconds for confirmation
4. **Refresh page** - Pink glowing bins appear!

**Option B - Manual Add**

1. Use faucet to get test tokens
2. Click "Set MIN by Click" button
3. Click a bin on the chart → MIN price set!
4. Click "Set MAX by Click" button
5. Click another bin → MAX price set!
6. Enter amount and click "Add Liquidity"

---

## 🎨 Interactive Features

### 1. Click-to-Set Buttons

**MIN Button** (Blue)
- Click to activate MIN selection mode
- Hover over bins - they show blue border
- Click any bin to set MIN price
- Auto-deactivates after setting

**MAX Button** (Purple)
- Click to activate MAX selection mode
- Hover over bins - they show purple border
- Click any bin to set MAX price
- Auto-deactivates after setting

### 2. Direct Bin Clicking (Smart Mode)

**Without clicking buttons:**
- Click any bin and it automatically adjusts the closer boundary (MIN or MAX)
- Example: Current range is $0.80-$1.20, you click $0.90
  - System checks: $0.90 is closer to MIN ($0.80)
  - Adjusts MIN to $0.90
  - New range: $0.90-$1.20

### 3. Visual Feedback

**Hover Effects:**
- Bins scale up slightly (1.05x)
- Tooltip shows exact price + liquidity
- Border appears when in click mode

**Range Highlighting:**
- Bins in your range: **Bright purple glow**
- Bins outside range: Dim gray
- Active bin: **Green glow** (current price)
- Selected range: Purple gradient overlay

### 4. Slider (Traditional Control)

- Drag left handle to adjust MIN
- Drag right handle to adjust MAX
- Numbers update in real-time
- Bins react instantly to changes

---

## 🧪 Testing Scenarios

### Scenario 1: Quick Visual Test (Fastest)

```
1. Open pool page
2. Click "🧪 Quick Test" section
3. Click "Spot" (10 tokens)
4. Wait for "✅ Test liquidity added!"
5. Refresh page (Ctrl+F5)
6. Result: See 10-20 pink bins around current price
```

**Expected result:**
```
Before: [────────────────────────] (empty gray bins)
After:  [───▓▓█████▓▓───] (pink glowing bins)
```

### Scenario 2: Interactive Range Selection

```
1. Click "Set MIN by Click"
2. Hover over bins (see blue borders)
3. Click a bin below current price
4. MIN updates instantly
5. Click "Set MAX by Click"
6. Click a bin above current price
7. MAX updates instantly
8. Range highlighted in purple
```

### Scenario 3: Wide Range with Curve Strategy

```
1. Use Quick Tester → "Curve" (50 tokens)
2. Refresh after confirmation
3. Result: See wide distribution (±50 bins)
4. Height varies = bell curve effect
```

---

## 🐛 Troubleshooting

### Problem: Bins Not Glowing After Adding Liquidity

**Symptoms:**
- Transaction confirmed
- Chart still shows gray placeholder bins
- No pink glow

**Solutions:**

1. **Hard Refresh** (Most common fix)
   ```
   Windows: Ctrl + F5
   Mac: Cmd + Shift + R
   ```

2. **Wait for RPC Propagation**
   - Wait 10-20 seconds after transaction
   - Some RPCs are slow to update

3. **Check Transaction Actually Succeeded**
   ```bash
   # Click the Solscan link in the success toast
   # Verify transaction shows "Success" status
   ```

4. **Verify Pool Address**
   ```
   Console → Look for:
   ✅ Fetched X bins with liquidity

   If you see:
   ❌ Error fetching bin liquidity
   → Pool address might be wrong
   ```

### Problem: Click-to-Set Not Working

**Symptoms:**
- Click bins but nothing happens
- No border appears on hover

**Solutions:**

1. **Check Button Activation**
   - Button should be glowing (blue/purple)
   - Text should say "Click bin to set MIN/MAX"

2. **Ensure Not Disabled**
   - Wallet must be connected
   - Can't set range while transaction is processing

3. **Check Console for Errors**
   ```javascript
   // Open DevTools (F12)
   // Look for errors in Console tab
   ```

### Problem: Range Resets When I Click

**Symptoms:**
- Set range, but it jumps back
- MIN/MAX swap positions

**Solutions:**

1. **Order Matters**
   - MIN must be < current price < MAX
   - System enforces: MIN < MAX always

2. **Use Smart Mode**
   - Just click bins without buttons
   - System auto-determines which boundary to adjust

### Problem: Quick Tester Fails

**Error Messages & Fixes:**

#### "Insufficient SOL"
```bash
# Fix: Get more devnet SOL
solana airdrop 1 YOUR_WALLET --url devnet
```

#### "Insufficient Token Balance"
```bash
# Fix: Use the token faucet
# Expand "💧 Need test tokens?" section
# Click "Get 1000 [TOKEN]" button
```

#### "Failed to send transaction"
```bash
# Fix: RPC might be congested
# Wait 30 seconds and try again
```

#### "Pool does not exist"
```bash
# Fix: Verify pool address in URL is correct
# Create a new pool if needed
```

---

## ✅ Verification Checklist

After adding liquidity, verify everything works:

- [ ] Green indicator shows "X bins with liquidity"
- [ ] Pink glowing bars visible in chart
- [ ] Bar heights vary (shows distribution)
- [ ] Hovering bins shows tooltip with price + liquidity
- [ ] Current price line (cyan) is visible
- [ ] Slider adjusts which bins are highlighted
- [ ] Click-to-set buttons work
- [ ] Bins have hover effects

---

## 🔬 Advanced: Understanding the Data

### What You're Seeing

**Bin Height** = Liquidity Amount
```
█████  = High liquidity (e.g., 1000+ tokens)
███    = Medium liquidity (e.g., 100-1000 tokens)
█      = Low liquidity (e.g., 1-100 tokens)
```

**Bin Color Intensity** = Distance from Current Price
```
Bright purple = Close to current price (high intensity)
Dim purple    = Far from current price (low intensity)
```

**Glow Effect** = Bin is in Your Selected Range
```
Glowing + bright = In range + near current price
Glowing + dim    = In range but far from current
No glow          = Outside selected range
```

### Real vs. Placeholder Bins

**Placeholder Mode** (no liquidity added yet)
- All bins same height
- Bell curve shape
- Gray/purple colors
- Yellow "Loading..." indicator

**Real Data Mode** (after adding liquidity)
- Varying heights (real liquidity amounts)
- Irregular distribution (based on actual deposits)
- Pink/purple glow
- Green "X bins with liquidity" indicator

---

## 🎯 Pro Tips

### Tip 1: Test Multiple Strategies

Add liquidity with different strategies to see different distributions:

```
Spot Strategy (±10 bins)
Result: Tall, narrow spike
├─────▁▃█▃▁─────┤

Curve Strategy (±50 bins)
Result: Wide bell curve
├─▁▂▃▅▆█▆▅▃▂▁──┤

Bid-Ask (±25 bins)
Result: Medium spread
├───▂▄▆█▆▄▂───┤
```

### Tip 2: Layer Liquidity

1. Add 10 tokens with Spot
2. Add 50 tokens with Curve
3. Result: **Layered visualization** - taller bars in center, wider distribution

### Tip 3: Click Bins to Quickly Adjust

Instead of dragging slider:
- Click left edge bin → Quick MIN adjust
- Click right edge bin → Quick MAX adjust
- Much faster for fine-tuning!

### Tip 4: Use Keyboard Shortcuts

```
Escape = Cancel click mode
Click outside = Deselect mode
```

---

## 📊 Expected Results Table

| Action | Expected Visual Result | Time to See |
|--------|------------------------|-------------|
| Add 10 tokens (Spot) | 10-20 bins glow, narrow spike | 3-5 seconds + refresh |
| Add 50 tokens (Curve) | 50-100 bins glow, wide curve | 3-5 seconds + refresh |
| Click MIN button + bin | MIN price updates, range shifts left | Instant |
| Click MAX button + bin | MAX price updates, range shifts right | Instant |
| Drag slider handle | Bins highlight/unhighlight smoothly | Instant |
| Hover bin | Bin scales up, tooltip appears | Instant |

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for errors
2. **Verify network** - must be on devnet
3. **Try a different pool** - some pools might have issues
4. **Create a fresh pool** - test with a brand new pool
5. **Check wallet** - ensure you have SOL + tokens

### Debug Commands

```bash
# Check your SOL balance
solana balance --url devnet

# Check your wallet address
solana address

# View recent transactions
solana transaction-history --url devnet | head -20

# Confirm specific transaction
solana confirm YOUR_SIGNATURE --url devnet
```

---

## 🎉 Success Indicators

You'll know it's working when you see:

✅ Transaction confirmed toast with Solscan link
✅ Green "X bins with liquidity" badge
✅ Pink glowing bars in the chart
✅ Bins respond to your clicks
✅ Hover tooltips show real data
✅ Slider smoothly adjusts range
✅ Current price line visible

**If you see all of these → Congratulations! Your interactive bins are working perfectly!**

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  INTERACTIVE BIN SELECTION QUICK REFERENCE              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🟦 Set MIN by Click → Click bin below current price    │
│  🟪 Set MAX by Click → Click bin above current price    │
│  🎯 Smart Click → Auto-selects closer boundary          │
│  🎚️  Drag Slider → Precise range control                │
│  🔄 Refresh Page → See updated bins after adding        │
│  ⚡ Quick Tester → One-click liquidity for testing      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

Need help? Check console logs or open an issue with:
- Transaction signature
- Pool address
- Browser console errors
- Screenshot of the bin chart
