#!/bin/bash

# Fully Automated DLMM Pool Creation for Testing
# This script creates a fresh pool on devnet ready for add liquidity testing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════╗
║     DLMM Test Pool Creator                           ║
║     Automated Setup for Add Liquidity Testing        ║
╚══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}\n"

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Install it first:${NC}"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check network
NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "   Current network: $NETWORK"

# Get wallet address
WALLET=$(solana address)
echo "   Wallet: $WALLET"

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "   Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1.0" | bc -l) )); then
    echo -e "\n${YELLOW}⚠️  Low balance detected. Getting airdrop...${NC}"
    solana airdrop 2 --url devnet || {
        echo -e "${RED}❌ Airdrop failed. Request manually:${NC}"
        echo "   solana airdrop 2 $WALLET --url devnet"
        exit 1
    }
fi

# Go to meteora-invent directory (parent directory)
INVENT_PATH=".."
if [ ! -f "$INVENT_PATH/package.json" ] || ! grep -q "meteora-invent" "$INVENT_PATH/package.json" 2>/dev/null; then
    echo -e "${RED}❌ meteora-invent not found. Make sure you're running from meteora-ui-wrapper directory${NC}"
    exit 1
fi

cd "$INVENT_PATH"
echo -e "${GREEN}✓ Prerequisites OK${NC}\n"

# Step 1: Create test tokens
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Creating Test Tokens${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Creating Base Token (TEST)..."
BASE_OUTPUT=$(pnpm studio create-token --name "Test Token" --symbol TEST --decimals 9 --supply 1000000 2>&1)
BASE_MINT=$(echo "$BASE_OUTPUT" | grep -oP 'Token Address: \K[A-Za-z0-9]+' | head -1)

if [ -z "$BASE_MINT" ]; then
    echo -e "${RED}❌ Failed to create base token${NC}"
    echo "$BASE_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Base Token: $BASE_MINT${NC}\n"

echo "Creating Quote Token (USDT - for testing)..."
QUOTE_OUTPUT=$(pnpm studio create-token --name "Test USDT" --symbol USDT --decimals 6 --supply 1000000 2>&1)
QUOTE_MINT=$(echo "$QUOTE_OUTPUT" | grep -oP 'Token Address: \K[A-Za-z0-9]+' | head -1)

if [ -z "$QUOTE_MINT" ]; then
    echo -e "${RED}❌ Failed to create quote token${NC}"
    echo "$QUOTE_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Quote Token: $QUOTE_MINT${NC}\n"

# Step 2: Create DLMM Pool with SAFE parameters
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Creating DLMM Pool${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Create config file with SAFE parameters
CONFIG_FILE="test_pool_config.jsonc"
cat > "$CONFIG_FILE" << EOF
{
  // SAFE configuration for testing add liquidity
  "network": "devnet",
  "baseMint": "$BASE_MINT",
  "quoteMint": "$QUOTE_MINT",
  "binStep": 25,  // 0.25% - wider steps = safer (fewer bins per range)
  "initialPrice": 1.0,
  "activationType": "instant",
  "baseFeePercentage": 0.1,
  "maxFeePercentage": 5.0,
  "protocolFeePercentage": 0.0,
  "hasAlphaVault": false
}
EOF

echo "Using configuration:"
cat "$CONFIG_FILE"
echo ""

echo "Creating pool..."
POOL_OUTPUT=$(pnpm studio dlmm-create-pool --config "$CONFIG_FILE" 2>&1)

# Extract pool address
POOL_ADDRESS=$(echo "$POOL_OUTPUT" | grep -oP 'Pool Address: \K[A-Za-z0-9]+' | head -1)

if [ -z "$POOL_ADDRESS" ]; then
    # Try alternative pattern
    POOL_ADDRESS=$(echo "$POOL_OUTPUT" | grep -oP 'DLMM Pool: \K[A-Za-z0-9]+' | head -1)
fi

if [ -z "$POOL_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to create pool${NC}"
    echo "$POOL_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Pool Created: $POOL_ADDRESS${NC}\n"

# Step 3: Summary
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📋 Pool Information:${NC}"
echo "   Pool Address: $POOL_ADDRESS"
echo "   Base Token:   $BASE_MINT (TEST)"
echo "   Quote Token:  $QUOTE_MINT (USDT)"
echo "   Bin Step:     25 (0.25%)"
echo "   Price:        1.0"
echo ""

echo -e "${BLUE}🔗 Quick Links:${NC}"
echo "   Local UI:     http://localhost:3000/pool/$POOL_ADDRESS"
echo "   Solscan:      https://solscan.io/account/$POOL_ADDRESS?cluster=devnet"
echo "   Meteora:      https://devnet.meteora.ag/pools/$POOL_ADDRESS"
echo ""

echo -e "${BLUE}🧪 Testing Add Liquidity:${NC}"
echo ""
echo "1. Start dev server (if not running):"
echo "   cd ../meteora-ui-wrapper && npm run dev"
echo ""
echo "2. Open in browser:"
echo "   http://localhost:3000/pool/$POOL_ADDRESS"
echo ""
echo "3. Test the safety features:"
echo "   ✓ Select strategy presets (auto-limited to 20 bins)"
echo "   ✓ Watch the safety indicator:"
echo "     🟢 Green (0-15 bins): Safe"
echo "     🟡 Yellow (16-20 bins): Approaching limit"
echo "     🔴 Red (>20 bins): Blocked"
echo "   ✓ Try manual range adjustment >20 bins (should block)"
echo "   ✓ Submit with safe range (<20 bins)"
echo ""

echo -e "${BLUE}💡 Test Checklist:${NC}"
echo "   □ Get test tokens from faucet (click 'Need test tokens?')"
echo "   □ Select 'Spot' strategy (10 bins - safest)"
echo "   □ Enter amount: 10-50 tokens"
echo "   □ Click 'Add Liquidity'"
echo "   □ Approve in wallet"
echo "   □ Verify success message"
echo "   □ Check bins populated in chart"
echo ""

# Save pool info to file
POOL_INFO_FILE="./meteora-ui-wrapper/TEST_POOL_INFO.txt"
cat > "$POOL_INFO_FILE" << EOF
DLMM Test Pool Information
==========================
Created: $(date)

Pool Address: $POOL_ADDRESS
Base Token:   $BASE_MINT (TEST, 9 decimals)
Quote Token:  $QUOTE_MINT (USDT, 6 decimals)
Bin Step:     25 basis points (0.25%)
Initial Price: 1.0
Network:      devnet

UI Link:      http://localhost:3000/pool/$POOL_ADDRESS
Solscan:      https://solscan.io/account/$POOL_ADDRESS?cluster=devnet
Meteora:      https://devnet.meteora.ag/pools/$POOL_ADDRESS

Safe Range Limits:
- Max bins: 20
- Spot strategy: 10 bins
- Bid-Ask: 15 bins
- Curve: 20 bins

Test amounts: 10-50 tokens
EOF

echo -e "${GREEN}✓ Pool info saved to: $POOL_INFO_FILE${NC}"
echo ""
echo -e "${GREEN}🚀 Ready to test! Open the UI and try adding liquidity.${NC}"
