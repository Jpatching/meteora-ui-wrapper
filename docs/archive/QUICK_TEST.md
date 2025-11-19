# Quick Test Guide - DLMM Add Liquidity

## TL;DR - Run This:

```bash
# 1. Create test pool
./create-test-pool.sh

# 2. Start UI
npm run dev

# 3. Open browser
# http://localhost:3000/pool/[POOL_ADDRESS_FROM_STEP_1]

# 4. Test add liquidity
# - Use "Spot" strategy (10 bins - safest)
# - Enter 10-50 tokens
# - Watch safety indicator (should be green)
# - Click "Add Liquidity"
```

## What's Fixed

✅ **Price range validation** - Max 20 bins to prevent InvalidRealloc error
✅ **Visual safety indicator** - Green/yellow/red based on bin count
✅ **Blocks unsafe ranges** - Won't submit if >20 bins
✅ **Smart presets** - Spot (10), Bid-Ask (15), Curve (20) bins

## Safety System

| Bins | Color | Status | Action |
|------|-------|--------|--------|
| 0-15 | 🟢 Green | Safe | ✅ Allow submission |
| 16-20 | 🟡 Yellow | Warning | ⚠️ Allow but warn |
| 21+ | 🔴 Red | Error | ❌ Block submission |

## Files

- `create-test-pool.sh` - Automated pool creation
- `TESTING_GUIDE.md` - Comprehensive testing instructions
- `test-pool-setup.ts` - TypeScript setup helper
- `test-dlmm-pool.sh` - Alternative manual setup

## Common Issues

**Q: Transaction fails with InvalidRealloc**
A: This should never happen! The UI blocks >20 bins. If you see this, it's a bug.

**Q: Can't see safety indicator**
A: Make sure you're on the pool page, not create pool page.

**Q: Range too wide error**
A: Use a strategy preset or manually adjust to <20 bins.

## Next Steps

See `TESTING_GUIDE.md` for complete testing checklist and troubleshooting.
