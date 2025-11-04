# Meteora Configuration Templates

This directory contains example configuration files for all Meteora protocol operations. Each template is documented with inline comments explaining all required and optional fields.

## What are Config Templates?

Config templates are pre-filled JSON files that help you:
- **Save time** - Pre-configure common operations
- **Batch operations** - Configure multiple actions at once
- **Learn parameters** - See all available options with explanations
- **Share configs** - Distribute working configurations to your team
- **Test quickly** - Use example values for devnet testing

## How to Use Templates

1. **Download** a template from the form page or this directory
2. **Edit** the file with your specific values (addresses, amounts, etc.)
3. **Upload** via the "Upload Config" button on any form page
4. **Submit** - The form auto-populates and you can execute immediately

## File Format

Templates use **JSONC** (JSON with Comments) format:
- Standard JSON structure
- Supports `//` single-line comments
- Supports `/* */` multi-line comments
- Comments are stripped during parsing

## Available Templates

### DLMM (Dynamic Liquidity Market Maker)

#### `dlmm-create-pool.example.jsonc`
Create a new DLMM pool with customizable bin steps and fee tiers.
- Supports new token creation or existing tokens
- Configure bin step (1, 5, 25, 100 bps)
- Set activation type (slot or timestamp)
- Optional Alpha Vault integration

#### `dlmm-seed-lfg.example.jsonc`
Seed liquidity across multiple price bins with a bonding curve distribution.
- Define price range (min/max)
- Set curvature (0.0 = uniform, 1.0 = concentrated)
- Configure position and fee ownership
- Lock release points for vesting

### DAMM v1 (Constant Product AMM)

#### `damm-v1-create-pool.example.jsonc`
Create a classic x*y=k constant product AMM pool.
- Simple two-token liquidity pool
- Configure base trading fee
- Supports new token creation

### DAMM v2 (Concentrated Liquidity AMM)

#### `damm-v2-create-balanced.example.jsonc`
Create a concentrated liquidity pool with balanced token amounts.
- Define price range (initial and max price)
- Set trading fees in basis points
- Add liquidity to both sides

#### `damm-v2-add-liquidity.example.jsonc`
Add liquidity to an existing DAMM v2 pool.
- Specify pool address
- Configure token amounts
- Set slippage tolerance

### DBC (Dynamic Bonding Curve)

#### `dbc-create-config.example.jsonc`
Create a configuration for bonding curve pools.
- Set migration threshold (when to convert to AMM)
- Configure trading and protocol fees
- Required before creating DBC pools

#### `dbc-create-pool.example.jsonc`
Create a bonding curve pool for token launches.
- Link to existing DBC config
- Set initial token price
- Automatic price discovery as tokens are bought

#### `dbc-swap.example.jsonc`
Swap tokens on a bonding curve pool.
- Buy (quote → base) or Sell (base → quote)
- Configure slippage tolerance
- Automatic price impact calculation

### Alpha Vault

#### `alpha-vault-create.example.jsonc`
Create a managed vault for automated liquidity strategies.
- Link to existing pool (DLMM, DAMM v1, or DAMM v2)
- Set deposit caps and fees
- Configure vesting schedules
- Optional whitelist mode

## Common Fields

All templates include these standard fields:

### Global Configuration
```jsonc
{
  "rpcUrl": "https://api.devnet.solana.com",  // Solana RPC endpoint
  "dryRun": false,                             // Test mode (no transaction)
  "computeUnitPriceMicroLamports": 1000       // Priority fee
}
```

### Token Creation
```jsonc
{
  "createBaseToken": {
    "name": "Token Name",
    "symbol": "TKN",
    "uri": "https://...",    // Metadata URI
    "decimals": 9,
    "supply": "1000000000"
  }
}
```

Alternatively, use existing token:
```jsonc
{
  "baseMint": "TokenMintAddress..."
}
```

### Common Devnet Tokens
```jsonc
// SOL (Wrapped)
"So11111111111111111111111111111111111111112"

// USDC (Devnet)
"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

// USDT (Devnet)
"EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS"
```

## Best Practices

### For Testing (Devnet)
1. Use `"dryRun": true` first to verify configuration
2. Start with small amounts (1-10 tokens)
3. Use devnet SOL/USDC/USDT addresses
4. Verify all addresses before submitting

### For Production (Mainnet)
1. **Double-check all addresses** - wrong addresses = lost funds
2. **Test on devnet first** with identical config
3. Update `"rpcUrl"` to mainnet endpoint
4. Consider higher `computeUnitPriceMicroLamports` for faster confirmation
5. Review fee settings carefully (fees are in basis points, 1 bp = 0.01%)

### Fee Guidelines
- **Trading fees**: 10-100 bps (0.1% - 1.0%)
  - Low volume: 25-50 bps
  - Medium volume: 10-25 bps
  - High volume: 5-10 bps
- **Protocol fees**: 5-20 bps (0.05% - 0.2%)
- **Performance fees** (vaults): 1000-2000 bps (10% - 20%)
- **Management fees** (vaults): 100-200 bps/year (1% - 2%)

### Slippage Guidelines
- **Stable pairs**: 10-50 bps (0.1% - 0.5%)
- **Volatile pairs**: 100-300 bps (1% - 3%)
- **Low liquidity**: 500+ bps (5%+)

## Validation

When uploading configs, the system validates:
- ✅ Valid JSON structure
- ✅ Required global fields (rpcUrl, dryRun, computeUnitPriceMicroLamports)
- ✅ Token address formats (base58 Solana addresses)
- ✅ Numeric fields are valid numbers
- ✅ Boolean fields are true/false
- ✅ Protocol-specific required fields

## Troubleshooting

### "Invalid config format"
- Ensure valid JSON (no trailing commas, proper quotes)
- Remove comments if uploading raw JSON (not JSONC)
- Check for missing required fields

### "Invalid token address"
- Verify addresses are 32-44 characters (base58)
- No spaces or special characters
- Use correct network addresses (devnet vs mainnet)

### "Transaction failed"
- Check wallet balance (need SOL for gas + tokens for liquidity)
- Verify token accounts exist for specified tokens
- Increase slippage if price moved
- Check pool/config addresses are correct

### "Insufficient funds"
- Need SOL for transaction fees (~0.001-0.01 SOL per tx)
- Need specified token amounts in wallet
- For token creation, need ~0.01 SOL for rent

## Getting Help

- **Documentation**: See TESTING.md for step-by-step testing guide
- **GitHub Issues**: [meteora-ui-wrapper issues](https://github.com/your-org/meteora-ui-wrapper/issues)
- **Meteora Docs**: [https://docs.meteora.ag](https://docs.meteora.ag)

## Template Maintenance

Templates are updated when:
- New SDK versions add/change parameters
- Protocol upgrades modify pool structures
- Community feedback suggests improvements

Last updated: 2025-11-01
