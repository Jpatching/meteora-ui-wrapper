#!/bin/bash

# MetaTools Vault - Mainnet Deployment Script
# ⚠️  WARNING: This deploys to MAINNET with REAL SOL
set -e

echo "🚀 MetaTools Vault - MAINNET Deployment"
echo "========================================="
echo "⚠️  WARNING: This will deploy to MAINNET with REAL SOL!"
echo ""

# Confirm deployment
read -p "Are you sure you want to deploy to MAINNET? (type 'yes' to continue): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if Rust/Cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Set network to mainnet
echo "📡 Setting network to mainnet-beta..."
solana config set --url mainnet-beta
echo ""

# Check balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "   Balance: $BALANCE SOL"
if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "❌ Error: Insufficient balance for mainnet deployment"
    echo "   Minimum required: 5 SOL"
    echo "   Your balance: $BALANCE SOL"
    exit 1
fi
echo ""

# Build the program
echo "🔨 Building program for mainnet..."
cd "$(dirname "$0")/.."
cargo build-sbf --release
echo ""

# Get program ID
echo "🔑 Getting program ID..."
PROGRAM_ID=$(solana-keygen pubkey target/deploy/metatools_vault_program-keypair.json)
echo "   Program ID: $PROGRAM_ID"
echo ""

# Check if program ID in code matches
echo "📝 Checking program ID in code..."
DECLARED_ID=$(grep -A 1 "declare_id!" api/src/lib.rs | grep -o '"[^"]*"' | tr -d '"')
echo "   Declared ID: $DECLARED_ID"

if [ "$PROGRAM_ID" != "$DECLARED_ID" ]; then
    echo "❌ Error: Program ID mismatch!"
    echo "   Update api/src/lib.rs with the correct program ID:"
    echo "   declare_id!(\"$PROGRAM_ID\");"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Final confirmation
echo ""
echo "⚠️  FINAL CONFIRMATION"
echo "====================="
echo "Network: mainnet-beta"
echo "Program ID: $PROGRAM_ID"
echo "Estimated cost: ~3-5 SOL"
echo ""
read -p "Deploy to MAINNET now? (type 'DEPLOY' to continue): " final_confirm
if [ "$final_confirm" != "DEPLOY" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Deploy the program
echo ""
echo "🚀 Deploying to mainnet-beta..."
echo "   (This may take several minutes)"
solana program deploy \
    --url mainnet-beta \
    target/deploy/metatools_vault_program.so

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Post-Deployment Checklist:"
echo ""
echo "1. ✅ Program deployed to mainnet"
echo "2. ⏳ Initialize GlobalConfig (ADMIN ONLY - DO THIS NEXT):"
echo "      - treasury: Your treasury wallet"
echo "      - buyback_wallet: Token buyback wallet"
echo "      - fee_bps: 70 (0.7%)"
echo "      - referral_pct: 10 (10%)"
echo "      - buyback_pct: 45 (45%)"
echo "      - treasury_pct: 45 (45%)"
echo ""
echo "3. ⏳ Verify on Solana Explorer:"
echo "      https://explorer.solana.com/address/$PROGRAM_ID"
echo ""
echo "4. ⏳ Update frontend with program ID"
echo "5. ⏳ Test vault creation with small amount first"
echo "6. ⏳ Monitor initial transactions closely"
echo ""
echo "📝 Program ID: $PROGRAM_ID"
echo "   Save this for frontend integration and admin operations!"
echo ""
echo "⚠️  IMPORTANT: Keep your program keypair safe!"
echo "   Location: target/deploy/metatools_vault_program-keypair.json"
echo ""
