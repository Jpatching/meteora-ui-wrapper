#!/bin/bash
# Complete Devnet Pool Setup
#
# This script:
# 1. Creates a SOL-USDC DLMM pool on devnet
# 2. Seeds liquidity (single-sided + dual-sided)
# 3. Adds pool to backend database
#
# Prerequisites:
# - Devnet SOL in wallet (~5 SOL)
# - Devnet USDC in wallet (~500 USDC) OR use faucet
# - Wallet at ~/.config/solana/id.json
# - Backend running at localhost:4000
#
# Usage: ./setup-complete-devnet-pool.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🚀 Complete Devnet Pool Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check wallet exists
WALLET_PATH="${WALLET_PATH:-$HOME/.config/solana/id.json}"
if [ ! -f "$WALLET_PATH" ]; then
  echo "❌ Wallet not found at $WALLET_PATH"
  echo "💡 Create with: solana-keygen new --outfile ~/.config/solana/id.json"
  exit 1
fi

WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
echo "👛 Wallet: $WALLET_ADDRESS"
echo ""

# Check balance
echo "💰 Checking balance..."
BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet | awk '{print $1}')
echo "   Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 3" | bc -l) )); then
  echo "⚠️  Low balance! Need at least 3 SOL"
  echo "   Get devnet SOL: https://faucet.solana.com/"
  echo "   Address: $WALLET_ADDRESS"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 1: Creating DLMM Pool"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create pool
tsx scripts/create-sol-usdc-devnet-pool.ts | tee /tmp/pool-creation.log

# Extract pool address from output
POOL_ADDRESS=$(grep -oP 'Pool Address: \K[A-Za-z0-9]+' /tmp/pool-creation.log | head -1)

if [ -z "$POOL_ADDRESS" ]; then
  echo "❌ Failed to create pool or extract pool address"
  exit 1
fi

echo ""
echo "✅ Pool created: $POOL_ADDRESS"
echo ""

# Wait for on-chain confirmation
echo "⏳ Waiting 10 seconds for on-chain confirmation..."
sleep 10

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 2: Seeding Liquidity"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Seed liquidity
tsx scripts/seed-devnet-pool.ts "$POOL_ADDRESS"

if [ $? -ne 0 ]; then
  echo "⚠️  Liquidity seeding failed, but continuing..."
  echo "   You can seed manually later with:"
  echo "   tsx scripts/seed-devnet-pool.ts $POOL_ADDRESS"
fi

echo ""
echo "⏳ Waiting 10 seconds for liquidity to settle..."
sleep 10

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Step 3: Adding Pool to Database"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Add to database
./scripts/add-pool-to-db.sh "$POOL_ADDRESS"

if [ $? -ne 0 ]; then
  echo "⚠️  Failed to add pool to database"
  echo "💡 Add manually with:"
  echo "   ./scripts/add-pool-to-db.sh $POOL_ADDRESS"
  echo ""
  echo "   Or start backend if not running:"
  echo "   npm run backend:dev"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🏊 Pool Address: $POOL_ADDRESS"
echo ""
echo "🔗 Links:"
echo "   Explorer: https://explorer.solana.com/address/$POOL_ADDRESS?cluster=devnet"
echo "   Birdeye: https://birdeye.so/token/$POOL_ADDRESS?chain=solana"
echo ""
echo "📝 Next Steps:"
echo "   1. Open UI at http://localhost:3000"
echo "   2. Switch to 'Devnet' in network selector"
echo "   3. Pool should appear in dashboard"
echo "   4. Click pool to view details"
echo "   5. Test adding/removing liquidity"
echo "   6. Test opening/closing positions"
echo ""
echo "🎯 Test Checklist:"
echo "   [ ] Pool appears on home page"
echo "   [ ] Pool detail page loads (no 404)"
echo "   [ ] Liquidity distribution chart shows bins"
echo "   [ ] Add liquidity (single-sided) works"
echo "   [ ] Add liquidity (dual-sided with strategy) works"
echo "   [ ] User positions display correctly"
echo "   [ ] Remove liquidity works"
echo "   [ ] Chart updates after transactions"
echo ""
