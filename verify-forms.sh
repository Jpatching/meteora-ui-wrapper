#!/bin/bash

echo "🔍 Verifying all 23 Meteora forms..."
echo ""

total=0
found=0

# DLMM (4)
echo "📊 DLMM Forms:"
for form in create-pool seed-lfg seed-single set-status; do
  total=$((total + 1))
  if [ -f "src/app/dlmm/$form/page.tsx" ]; then
    echo "  ✅ DLMM $form"
    found=$((found + 1))
  else
    echo "  ❌ DLMM $form - MISSING"
  fi
done
echo ""

# DAMM v2 (7)
echo "📊 DAMM v2 Forms:"
for form in create-balanced create-one-sided add-liquidity remove-liquidity split-position claim-fees close-position; do
  total=$((total + 1))
  if [ -f "src/app/damm-v2/$form/page.tsx" ]; then
    echo "  ✅ DAMM v2 $form"
    found=$((found + 1))
  else
    echo "  ❌ DAMM v2 $form - MISSING"
  fi
done
echo ""

# DAMM v1 (4)
echo "📊 DAMM v1 Forms:"
for form in create-pool lock-liquidity create-stake2earn lock-stake2earn; do
  total=$((total + 1))
  if [ -f "src/app/damm-v1/$form/page.tsx" ]; then
    echo "  ✅ DAMM v1 $form"
    found=$((found + 1))
  else
    echo "  ❌ DAMM v1 $form - MISSING"
  fi
done
echo ""

# DBC (7)
echo "📊 DBC Forms:"
for form in create-config create-pool swap claim-fees migrate-v1 migrate-v2 transfer-creator; do
  total=$((total + 1))
  if [ -f "src/app/dbc/$form/page.tsx" ]; then
    echo "  ✅ DBC $form"
    found=$((found + 1))
  else
    echo "  ❌ DBC $form - MISSING"
  fi
done
echo ""

# Alpha Vault (1)
echo "📊 Alpha Vault Forms:"
total=$((total + 1))
if [ -f "src/app/alpha-vault/create/page.tsx" ]; then
  echo "  ✅ Alpha Vault create"
  found=$((found + 1))
else
  echo "  ❌ Alpha Vault create - MISSING"
fi
echo ""

# Settings (2)
echo "📊 Settings Forms:"
for form in keypair airdrop; do
  total=$((total + 1))
  if [ -f "src/app/settings/$form/page.tsx" ]; then
    echo "  ✅ Settings $form"
    found=$((found + 1))
  else
    echo "  ❌ Settings $form - MISSING"
  fi
done
echo ""

echo "================================"
echo "📈 Results: $found/$total forms found"
echo "================================"

if [ $found -eq $total ]; then
  echo "✅ All forms implemented successfully!"
  exit 0
else
  echo "❌ Missing $((total - found)) forms"
  exit 1
fi
