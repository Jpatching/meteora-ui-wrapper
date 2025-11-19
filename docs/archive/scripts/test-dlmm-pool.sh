#!/bin/bash

# Test Script: Create Fresh DLMM Pool for Testing Add Liquidity
# This script creates a clean DLMM pool on devnet with safe parameters

set -e  # Exit on error

echo "🧪 DLMM Pool Test Setup"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from meteora-ui-wrapper directory${NC}"
    exit 1
fi

# Check if meteora-invent exists
INVENT_PATH="../meteora-invent"
if [ ! -d "$INVENT_PATH" ]; then
    echo -e "${RED}❌ Error: meteora-invent not found at $INVENT_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 This script will:${NC}"
echo "  1. Create test tokens on devnet"
echo "  2. Create a fresh DLMM pool with SAFE parameters"
echo "  3. Provide you with the pool address to test"
echo ""
echo -e "${YELLOW}⚙️  Pool Configuration (SAFE for testing):${NC}"
echo "  - Bin Step: 25 basis points (0.25%)"
echo "  - Price Range: Narrow (max 20 bins)"
echo "  - Activation: Instant"
echo "  - Base Fee: 0.1%"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1: Creating test tokens...${NC}"
echo "Running: cd $INVENT_PATH && pnpm studio create-token"
cd "$INVENT_PATH"

# Note: User will need to manually create tokens first or use existing ones
echo ""
echo -e "${YELLOW}⚠️  Token Creation Instructions:${NC}"
echo ""
echo "If you don't have test tokens yet, create them manually:"
echo ""
echo "  cd $INVENT_PATH"
echo "  pnpm studio create-token --name 'Test Token A' --symbol TTA --decimals 9"
echo "  pnpm studio create-token --name 'Test Token B' --symbol TTB --decimals 9"
echo ""
echo "Or use existing devnet tokens:"
echo "  - USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
echo "  - SOL: So11111111111111111111111111111111111111112"
echo ""

read -p "Enter BASE token mint address: " BASE_MINT
read -p "Enter QUOTE token mint address (or press Enter for USDC): " QUOTE_MINT

# Default to USDC if empty
if [ -z "$QUOTE_MINT" ]; then
    QUOTE_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    echo "Using USDC as quote token"
fi

echo ""
echo -e "${GREEN}Step 2: Creating DLMM pool with SAFE parameters...${NC}"
echo ""

# Create a temporary config file with safe parameters
CONFIG_FILE="dlmm_test_config.jsonc"
cat > "$CONFIG_FILE" << EOF
{
  "network": "devnet",
  "baseMint": "$BASE_MINT",
  "quoteMint": "$QUOTE_MINT",
  "binStep": 25,  // 0.25% - wider steps = safer ranges
  "initialPrice": 1.0,
  "activationType": "instant",
  "baseFeePercentage": 0.1,
  "maxFeePercentage": 5.0,
  "protocolFeePercentage": 0.0,
  "hasAlphaVault": false
}
EOF

echo "Config file created: $CONFIG_FILE"
cat "$CONFIG_FILE"
echo ""

echo -e "${YELLOW}Creating pool...${NC}"
pnpm studio dlmm-create-pool --config "$CONFIG_FILE"

echo ""
echo -e "${GREEN}✅ Pool created successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Copy the pool address from above"
echo "2. Open your browser to: http://localhost:3000/pool/[POOL_ADDRESS]"
echo "3. Test add liquidity with SAFE parameters:"
echo "   - Use the strategy presets (they're now limited to 20 bins max)"
echo "   - Spot: 10 bins (very narrow)"
echo "   - Bid-Ask: 15 bins (moderate)"
echo "   - Curve: 20 bins (max safe)"
echo "4. Watch the safety indicator - it will show:"
echo "   - 🟢 Green (0-15 bins): Safe"
echo "   - 🟡 Yellow (16-20 bins): Warning"
echo "   - 🔴 Red (>20 bins): Blocked - will prevent submission"
echo ""
echo -e "${YELLOW}🧪 Testing Checklist:${NC}"
echo ""
echo "✓ Try selecting different strategies - range stays safe"
echo "✓ Manually adjust range to >20 bins - should show error"
echo "✓ Try to submit with >20 bins - should be blocked"
echo "✓ Submit with <20 bins - should succeed"
echo "✓ Use 'Quick Test' section on devnet to test automatically"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"
