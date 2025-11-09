#!/bin/bash
# Add Devnet Pool to Database
#
# Usage: ./add-pool-to-db.sh <pool-address>
# Example: ./add-pool-to-db.sh 8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1

set -e

POOL_ADDRESS=$1

if [ -z "$POOL_ADDRESS" ]; then
  echo "❌ Error: Pool address required"
  echo "Usage: ./add-pool-to-db.sh <pool-address>"
  exit 1
fi

echo "🔗 Adding devnet pool to database..."
echo "   Pool: $POOL_ADDRESS"
echo ""

# Check if backend is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
  echo "❌ Backend not running at http://localhost:4000"
  echo "💡 Start backend with: npm run backend:dev"
  exit 1
fi

# Add pool via API
echo "📤 Calling API endpoint..."
response=$(curl -s -X POST http://localhost:4000/api/pools/devnet/add \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$POOL_ADDRESS\",
    \"protocol\": \"dlmm\",
    \"name\": \"SOL-USDC\"
  }")

# Check response
if echo "$response" | grep -q '"success":true'; then
  echo "✅ Pool added successfully!"
  echo ""
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""
  echo "💡 Next steps:"
  echo "   1. Switch to devnet in UI network selector"
  echo "   2. Pool should appear in dashboard"
  echo "   3. Click pool to view details and add liquidity"
else
  echo "❌ Failed to add pool"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  exit 1
fi
