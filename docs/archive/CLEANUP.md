# Codebase Cleanup Recommendations

## Files to Delete Immediately (~12MB)

### ChatGPT Screenshot Images in src/app/
These design mockup screenshots don't belong in source code:

```bash
rm src/app/"ChatGPT Image Nov 2, 2025, 09_33_53 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_37_23 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_39_16 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_40_53 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_43_10 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_45_08 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_46_50 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_48_30 PM.png"
rm src/app/"ChatGPT Image Nov 2, 2025, 09_50_17 PM.png"
```

**Total space saved:** ~12MB

---

## Files to Move/Optimize

### Misplaced Assets
- `src/app/file.svg` (795KB) → Should be in `public/` or `src/assets/`
- `src/app/icon.svg` (766KB) → Already has copy in public/, remove duplicate
- `src/app/icon.png` (1.3MB) → Optimize with ImageOptim or TinyPNG

---

## Code with TODO/Placeholder Comments (20+ files)

These files contain incomplete implementations and need work:

### DAMM v1
- `src/app/damm-v1/lock-stake2earn/page.tsx`
- `src/app/damm-v1/create-stake2earn/page.tsx`
- `src/app/damm-v1/lock-liquidity/page.tsx`

### DAMM v2
- `src/app/damm-v2/close-position/page.tsx`
- `src/app/damm-v2/claim-fees/page.tsx`
- `src/app/damm-v2/split-position/page.tsx`
- `src/app/damm-v2/remove-liquidity/page.tsx`
- `src/app/damm-v2/add-liquidity/page.tsx`

### DLMM
- `src/app/dlmm/seed-lfg/page.tsx`
- `src/app/dlmm/set-status/page.tsx`
- `src/app/dlmm/add-liquidity/page.tsx`
- `src/app/dlmm/create-pool/page.tsx`
- `src/app/dlmm/seed-single/page.tsx`

### DBC
- `src/app/dbc/migrate-v1/page.tsx`

### Other
- `src/app/settings/transactions/page.tsx`
- `src/app/settings/rpc/page.tsx`
- `src/app/api/dlmm/add-liquidity/route.ts`
- `src/app/analytics/positions/page.tsx`
- `src/app/position/[poolId]/page.tsx`
- `src/app/discover/page.tsx`

---

## Recommended Cleanup Script

```bash
#!/bin/bash
# cleanup.sh - Run this to clean up the codebase

echo "Removing ChatGPT screenshots..."
rm src/app/"ChatGPT Image"*.png

echo "Moving misplaced assets..."
mkdir -p public/assets
mv src/app/file.svg public/assets/

echo "Done! Saved ~12MB"
echo ""
echo "Next steps:"
echo "1. Review duplicate icon files (icon.svg, icon.png)"
echo "2. Implement TODO items in 20+ files"
echo "3. Consider optimizing large SVG/PNG files"
```

---

## Build Performance Issues

The following dependencies cause build warnings (exceeding 500KB):
- `@meteora-ag/dlmm/dist/index.mjs`
- `@meteora-ag/dynamic-bonding-curve-sdk/dist/index.js`

**Recommendation:** These are external dependencies, nothing we can do about size. Consider code-splitting or lazy loading these modules if they impact bundle size.
