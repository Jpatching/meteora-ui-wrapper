#!/bin/bash
#
# Apply Critical Fixes After AL Merge
# Fixes the TradingChart undefined data issue and other critical bugs
#

set -e

echo "🔧 Applying Critical Post-Merge Fixes"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fix 1: TradingChart defensive check
echo -e "${BLUE}1️⃣ Fixing TradingChart undefined data check...${NC}"

if [ -f "src/components/charts/TradingChart.tsx" ]; then
  # Add defensive check for undefined data
  sed -i 's/if (priceSeriesRef.current && data\.length > 0)/if (priceSeriesRef.current \&\& data \&\& data.length > 0)/g' \
    src/components/charts/TradingChart.tsx

  # Also fix volume data check
  sed -i 's/if (volumeSeriesRef.current && showVolume && data\.length > 0)/if (volumeSeriesRef.current \&\& showVolume \&\& data \&\& data.length > 0)/g' \
    src/components/charts/TradingChart.tsx

  echo -e "${GREEN}✅ TradingChart defensive checks added${NC}"
else
  echo -e "${RED}❌ TradingChart.tsx not found${NC}"
  exit 1
fi

echo ""

# Fix 2: Check if pool detail page needs fixing
echo -e "${BLUE}2️⃣ Checking pool detail page...${NC}"

if grep -q "poolAddress={pool.id}" "src/app/pool/[address]/page.tsx" 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Pool detail page has incorrect TradingChart usage${NC}"
  echo "   This needs manual review - see MERGE_STRATEGY.md for details"
  echo "   File: src/app/pool/[address]/page.tsx"
  echo "   Issue: TradingChart expects 'data' prop, not 'poolAddress'"
else
  echo -e "${GREEN}✅ Pool detail page looks good${NC}"
fi

echo ""

# Fix 3: Verify critical files exist
echo -e "${BLUE}3️⃣ Verifying critical files...${NC}"

CRITICAL_FILES=(
  "src/lib/meteora/useDLMM.ts"
  "src/lib/meteora/useDBC.ts"
  "src/app/dlmm/seed-lfg/page.tsx"
  "src/components/ui/index.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅${NC} $file"
  else
    echo -e "  ${RED}❌${NC} $file (MISSING!)"
  fi
done

echo ""

# Fix 4: Check TypeScript compilation
echo -e "${BLUE}4️⃣ Checking TypeScript compilation...${NC}"

if npx tsc --noEmit 2>/dev/null; then
  echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
  echo -e "${YELLOW}⚠️  TypeScript errors detected${NC}"
  echo "   Run 'npx tsc --noEmit' to see details"
fi

echo ""

# Summary
echo -e "${GREEN}🎉 Automated fixes applied!${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Manual review needed for:${NC}"
echo "1. src/app/pool/[address]/page.tsx - TradingChart usage"
echo "2. src/lib/meteora/useDLMM.ts - Verify activation check logic"
echo "3. Any TypeScript errors reported above"
echo ""
echo "Next steps:"
echo "1. Review MERGE_STRATEGY.md for manual fixes"
echo "2. Test: npm run dev"
echo "3. Visit /discover and click a pool"
echo "4. Test /dlmm/seed-lfg functionality"
echo "5. If all works: git add . && git commit"
echo ""
echo "See MERGE_STRATEGY.md for complete testing checklist"
