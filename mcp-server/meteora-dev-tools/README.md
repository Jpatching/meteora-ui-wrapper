# Meteora Dev Tools MCP Server

A Model Context Protocol (MCP) server providing specialized tools for developing and testing Meteora protocol integrations.

## Overview

This MCP server provides 5 powerful tools for Meteora UI Wrapper development:
1. **simulate_transaction** - Test transactions on devnet without sending
2. **validate_fee_atomicity** - Check if fees are atomic with main transaction
3. **analyze_transaction_instructions** - Debug instruction order and content
4. **estimate_compute_units** - Check transaction compute budget
5. **test_referral_split** - Validate fee distribution mathematics

## Installation

### Prerequisites
- Node.js 20+
- Claude Desktop or Claude Code CLI
- Solana CLI tools (optional)

### Setup

1. **Install dependencies:**
```bash
cd mcp-server/meteora-dev-tools
npm install
```

2. **Build the server:**
```bash
npm run build
```

3. **Configure Claude Desktop:**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "meteora-dev-tools": {
      "command": "node",
      "args": ["/absolute/path/to/meteora-ui-wrapper/mcp-server/meteora-dev-tools/dist/index.js"]
    }
  }
}
```

4. **Configure Claude Code:**

Add to `.claude/config.json`:

```json
{
  "mcp": {
    "servers": {
      "meteora-dev-tools": {
        "command": "node",
        "args": ["./mcp-server/meteora-dev-tools/dist/index.js"]
      }
    }
  }
}
```

5. **Restart Claude Desktop or reload Claude Code**

## Tools Documentation

### 1. simulate_transaction

Simulates a Solana transaction on devnet without actually sending it.

**Purpose:**
- Test transactions before submission
- Verify transaction will succeed
- Check for simulation errors
- Validate account states

**Parameters:**
```typescript
{
  transactionBase64: string;  // Base64-encoded transaction
  network?: string;           // devnet|mainnet-beta (default: devnet)
}
```

**Returns:**
```typescript
{
  success: boolean;
  logs: string[];
  unitsConsumed: number;
  error?: string;
}
```

**Example Usage:**
```typescript
const tx = new Transaction().add(...);
const serialized = tx.serialize({requireAllSignatures: false});
const base64 = serialized.toString('base64');

const result = await mcp.simulate_transaction({
  transactionBase64: base64,
  network: 'devnet'
});

if (!result.success) {
  console.error('Simulation failed:', result.error);
}
```

### 2. validate_fee_atomicity

Validates that fee instructions are prepended to the transaction atomically.

**Purpose:**
- Ensure fees won't be lost on transaction failure
- Verify correct instruction ordering
- Check fee transfer instructions exist
- Validate atomic pattern compliance

**Parameters:**
```typescript
{
  transactionBase64: string;  // Base64-encoded transaction
  expectedFeeCount?: number;  // Expected number of fee transfers (default: 3)
}
```

**Returns:**
```typescript
{
  isAtomic: boolean;
  feeInstructionsCount: number;
  feeInstructionsFirst: boolean;
  issues: string[];
  recommendations: string[];
}
```

**Example Usage:**
```typescript
const result = await mcp.validate_fee_atomicity({
  transactionBase64: base64,
  expectedFeeCount: 3  // referral + buyback + treasury
});

if (!result.isAtomic) {
  console.error('Fee atomicity issues:', result.issues);
  console.log('Recommendations:', result.recommendations);
}
```

**Validation Checks:**
- Fee instructions are at the beginning of the transaction
- Correct number of fee transfer instructions
- Fee instructions use SystemProgram.transfer
- No separate fee transaction exists

### 3. analyze_transaction_instructions

Provides detailed analysis of all transaction instructions.

**Purpose:**
- Debug complex transactions
- Understand instruction flow
- Identify program calls
- Inspect account usage

**Parameters:**
```typescript
{
  transactionBase64: string;  // Base64-encoded transaction
  verbose?: boolean;          // Include full account details (default: false)
}
```

**Returns:**
```typescript
{
  instructionCount: number;
  instructions: Array<{
    index: number;
    programId: string;
    programName: string;  // e.g., "System Program", "DLMM Program"
    accounts: string[];
    dataPreview: string;
  }>;
  summary: {
    systemTransfers: number;
    programInvocations: Record<string, number>;
    uniqueAccounts: number;
  };
}
```

**Example Usage:**
```typescript
const analysis = await mcp.analyze_transaction_instructions({
  transactionBase64: base64,
  verbose: true
});

console.log(`Total instructions: ${analysis.instructionCount}`);
console.log(`System transfers: ${analysis.summary.systemTransfers}`);
console.log('Instructions:', analysis.instructions);
```

### 4. estimate_compute_units

Estimates compute units required for transaction execution.

**Purpose:**
- Prevent "exceeded compute budget" errors
- Optimize transaction size
- Plan compute budget allocation
- Identify expensive operations

**Parameters:**
```typescript
{
  transactionBase64: string;  // Base64-encoded transaction
  network?: string;           // devnet|mainnet-beta (default: devnet)
}
```

**Returns:**
```typescript
{
  estimatedUnits: number;
  maxUnits: number;          // 1,400,000 for Solana
  percentageUsed: number;
  withinBudget: boolean;
  recommendation: string;
}
```

**Example Usage:**
```typescript
const estimate = await mcp.estimate_compute_units({
  transactionBase64: base64
});

if (!estimate.withinBudget) {
  console.error('Transaction exceeds compute budget!');
  console.log('Estimated:', estimate.estimatedUnits);
  console.log('Max:', estimate.maxUnits);
  console.log('Recommendation:', estimate.recommendation);
}
```

**Recommendations:**
- Under 50% usage: "Excellent - plenty of room"
- 50-75% usage: "Good - acceptable usage"
- 75-90% usage: "Warning - consider optimization"
- Over 90% usage: "Critical - transaction may fail"

### 5. test_referral_split

Validates referral fee distribution mathematics.

**Purpose:**
- Verify fee split percentages
- Test referral calculations
- Ensure no rounding errors
- Validate distribution logic

**Parameters:**
```typescript
{
  totalFeeLamports: number;
  referralPercentage: number;   // e.g., 10 for 10%
  buybackPercentage: number;    // e.g., 45 for 45%
  treasuryPercentage: number;   // e.g., 45 for 45%
}
```

**Returns:**
```typescript
{
  valid: boolean;
  distribution: {
    referral: { lamports: number; sol: number; percentage: number };
    buyback: { lamports: number; sol: number; percentage: number };
    treasury: { lamports: number; sol: number; percentage: number };
    total: { lamports: number; sol: number };
  };
  errors: string[];
  warnings: string[];
}
```

**Example Usage:**
```typescript
const split = await mcp.test_referral_split({
  totalFeeLamports: 100000000,  // 0.1 SOL
  referralPercentage: 10,
  buybackPercentage: 45,
  treasuryPercentage: 45
});

if (!split.valid) {
  console.error('Invalid split:', split.errors);
}

console.log('Referral:', split.distribution.referral.sol, 'SOL');
console.log('Buyback:', split.distribution.buyback.sol, 'SOL');
console.log('Treasury:', split.distribution.treasury.sol, 'SOL');
```

**Validation Checks:**
- Percentages add up to 100%
- No negative amounts
- No rounding errors (sum equals total)
- Lamports are whole numbers

## Development

### Running in Development

```bash
npm run dev
```

This starts the server with auto-reload on file changes.

### Testing

```bash
npm test
```

Runs the test suite covering all 5 tools.

### Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/`.

## Architecture

```
src/
├── index.ts              # MCP server entry point
├── tools/
│   ├── simulate.ts       # Transaction simulation
│   ├── validate.ts       # Fee atomicity validation
│   ├── analyze.ts        # Instruction analysis
│   ├── compute.ts        # Compute unit estimation
│   └── referral.ts       # Referral split testing
├── utils/
│   ├── solana.ts         # Solana connection utilities
│   ├── transaction.ts    # Transaction parsing
│   └── programs.ts       # Program ID mappings
└── types/
    └── index.ts          # TypeScript interfaces
```

## Integration with Meteora UI Wrapper

### In Development Workflow

1. **Before implementing a new action:**
   ```typescript
   // Use simulate_transaction to test
   const simulation = await simulate_transaction({
     transactionBase64: myTx
   });
   ```

2. **After adding fee integration:**
   ```typescript
   // Validate atomicity
   const validation = await validate_fee_atomicity({
     transactionBase64: myTx
   });
   ```

3. **When debugging issues:**
   ```typescript
   // Analyze instructions
   const analysis = await analyze_transaction_instructions({
     transactionBase64: myTx,
     verbose: true
   });
   ```

4. **Before deployment:**
   ```typescript
   // Check compute budget
   const estimate = await estimate_compute_units({
     transactionBase64: myTx
   });
   ```

### In CI/CD Pipeline

Add automated checks:
```bash
# In GitHub Actions or similar
- name: Validate Fee Atomicity
  run: npm run test:atomicity
```

## Troubleshooting

### "MCP server not found"
- Check Claude Desktop config path
- Verify absolute path to dist/index.js
- Restart Claude Desktop

### "Connection refused"
- Check Node.js is installed
- Verify build was successful (`npm run build`)
- Check logs in Claude Desktop developer tools

### "Transaction simulation failed"
- Ensure using correct network (devnet vs mainnet)
- Check transaction is properly serialized
- Verify Base64 encoding is valid

## Security Notes

⚠️ **Important:**
- This server only simulates transactions, never signs or sends them
- Private keys are NEVER required or accessed
- All simulations run on devnet or test environments
- No production data is stored or transmitted

## License

MIT - Same as Meteora UI Wrapper

## Support

For issues:
1. Check [docs/guides/](../../docs/guides/) for Meteora UI Wrapper documentation
2. Review MCP server logs
3. Test tools individually
4. Report issues in main repository

## Changelog

### v1.0.0 (2025-11-02)
- Initial release
- 5 core tools for transaction testing
- Devnet and mainnet-beta support
- Comprehensive fee atomicity validation
