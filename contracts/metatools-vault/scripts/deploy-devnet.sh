#!/bin/bash

# MetaTools Vault - Devnet Deployment Script
set -e

echo "🚀 MetaTools Vault - Devnet Deployment"
echo "======================================="
echo ""

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

# Set network to devnet
echo "📡 Setting network to devnet..."
solana config set --url devnet
echo ""

# Check balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "   Balance: $BALANCE SOL"
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Warning: Low balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi
echo ""

# Build the program
echo "🔨 Building program..."
cd "$(dirname "$0")/.."
cargo build-sbf
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
    echo "⚠️  Program ID mismatch!"
    echo "   Update api/src/lib.rs with the correct program ID:"
    echo "   declare_id!(\"$PROGRAM_ID\");"
    echo ""
    read -p "   Press Enter after updating the file..."
    echo ""
    echo "🔨 Rebuilding with correct program ID..."
    cargo build-sbf
    echo ""
fi

# Deploy the program
echo "🚀 Deploying to devnet..."
solana program deploy \
    --url devnet \
    target/deploy/metatools_vault_program.so

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Next steps:"
echo "   1. Initialize GlobalConfig (admin only):"
echo "      - Use the SDK to call initialize_config instruction"
echo "      - Set treasury, buyback wallet, and fee parameters"
echo ""
echo "   2. Test vault creation:"
echo "      - Connect with Phantom wallet"
echo "      - Generate session wallet"
echo "      - Call create_vault instruction"
echo ""
echo "   3. Test position opening:"
echo "      - Open a test position"
echo "      - Verify fee distribution (0.7% TVL)"
echo ""
echo "📝 Program ID: $PROGRAM_ID"
echo "   Save this for frontend integration!"
echo ""
