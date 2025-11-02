# Meteora Dev Tools MCP Server - Installation Guide

Complete guide to installing and configuring the Meteora Dev Tools MCP server for use with Claude Desktop and Claude Code.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Usage Examples](#usage-examples)

## Prerequisites

Before installing, ensure you have:

### Required
- **Node.js 20+** and npm
  ```bash
  node --version  # Should be v20.0.0 or higher
  npm --version
  ```

- **Claude Desktop** or **Claude Code CLI**
  - Claude Desktop: Download from https://claude.ai/download
  - Claude Code: Install via `npm install -g @anthropic-ai/claude-code`

### Optional
- **Solana CLI** (for advanced testing)
  ```bash
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
  ```

## Installation Steps

### Step 1: Navigate to MCP Server Directory

```bash
cd /path/to/meteora-ui-wrapper/mcp-server/meteora-dev-tools
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@solana/web3.js` - Solana blockchain interaction
- `@solana/spl-token` - SPL token utilities
- Development tools (TypeScript, tsx, etc.)

### Step 3: Build the Server

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

**Verify build:**
```bash
ls -la dist/
# Should see: index.js, tools/, etc.
```

## Configuration

### Option A: Claude Desktop (Recommended for GUI users)

1. **Locate config file:**

   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Edit config file:**

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

   **Important:** Replace `/absolute/path/to/` with your actual path!

   **Example:**
   ```json
   {
     "mcpServers": {
       "meteora-dev-tools": {
         "command": "node",
         "args": ["/Users/yourname/projects/meteora-ui-wrapper/mcp-server/meteora-dev-tools/dist/index.js"]
       }
     }
   }
   ```

3. **Save and close the file**

4. **Restart Claude Desktop**
   - Fully quit Claude Desktop (Cmd+Q on macOS)
   - Reopen Claude Desktop

### Option B: Claude Code CLI (Recommended for terminal users)

1. **Navigate to project root:**
   ```bash
   cd /path/to/meteora-ui-wrapper
   ```

2. **Create or edit `.claude/config.json`:**
   ```bash
   mkdir -p .claude
   nano .claude/config.json
   ```

3. **Add MCP server configuration:**
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

   Note: Relative paths work in Claude Code since it's run from the project directory.

4. **Save and exit** (Ctrl+X, Y, Enter in nano)

5. **Reload Claude Code:**
   ```bash
   claude code reload
   ```

## Verification

### Check if MCP Server is Loaded

#### In Claude Desktop:

1. Open Claude Desktop
2. Start a new conversation
3. Type: "List available MCP tools"
4. You should see: `simulate_transaction`, `validate_fee_atomicity`, `analyze_transaction_instructions`, `estimate_compute_units`, `test_referral_split`

#### In Claude Code:

```bash
claude code
# In conversation:
# > List MCP tools
```

### Test a Tool

Try the referral split tester (safest to test - no blockchain interaction):

**Prompt:**
```
Use the test_referral_split tool with:
- totalFeeLamports: 100000000 (0.1 SOL)
- referralPercentage: 10
- buybackPercentage: 45
- treasuryPercentage: 45
```

**Expected Output:**
```json
{
  "valid": true,
  "distribution": {
    "referral": { "lamports": 10000000, "sol": 0.01, "percentage": 10 },
    "buyback": { "lamports": 45000000, "sol": 0.045, "percentage": 45 },
    "treasury": { "lamports": 45000000, "sol": 0.045, "percentage": 45 },
    "total": { "lamports": 100000000, "sol": 0.1 }
  },
  "errors": [],
  "warnings": []
}
```

## Troubleshooting

### Issue: "MCP server 'meteora-dev-tools' not found"

**Solutions:**
1. Check config file path is correct for your OS
2. Verify absolute path to `dist/index.js` is correct
3. Ensure config JSON is valid (use https://jsonlint.com/)
4. Restart Claude Desktop/Code after config changes

**Debug:**
```bash
# Verify path exists
ls -la /absolute/path/to/meteora-ui-wrapper/mcp-server/meteora-dev-tools/dist/index.js

# Test server manually
node /absolute/path/to/meteora-ui-wrapper/mcp-server/meteora-dev-tools/dist/index.js
# Should show: "Meteora Dev Tools MCP Server started"
```

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
cd mcp-server/meteora-dev-tools
npm install
npm run build
```

### Issue: "Permission denied" when running server

**Solution:**
```bash
chmod +x mcp-server/meteora-dev-tools/dist/index.js
```

### Issue: Server starts but tools don't work

**Check:**
1. Node.js version (must be 20+)
   ```bash
   node --version
   ```

2. Check server logs in Claude Desktop:
   - macOS: `~/Library/Logs/Claude/`
   - Look for error messages

3. Test tools individually:
   ```bash
   cd mcp-server/meteora-dev-tools
   npm test
   ```

### Issue: "Connection refused" or timeout

**Solutions:**
1. Rebuild the server:
   ```bash
   npm run clean
   npm run build
   ```

2. Check no other process is using the MCP port
3. Restart your computer (rare, but can help)

### Issue: Tools work but simulations fail

**Check:**
1. Network connectivity (required for devnet/mainnet RPC)
2. Try different network (devnet vs mainnet-beta)
3. Check Solana status: https://status.solana.com/

## Usage Examples

### Example 1: Validate Fee Atomicity

```javascript
// In your development workflow:

// 1. Build a transaction
const transaction = new Transaction();
transaction.add(/* your SDK instructions */);

// 2. Add fee instructions
const feeInstructions = await getFeeDistributionInstructions(publicKey);
feeInstructions.reverse().forEach(ix => transaction.instructions.unshift(ix));

// 3. Serialize for testing
const serialized = transaction.serialize({requireAllSignatures: false});
const base64 = serialized.toString('base64');

// 4. Ask Claude to validate
// "Use validate_fee_atomicity with transactionBase64: [paste base64]"
```

### Example 2: Simulate Before Sending

```javascript
// Before sending a transaction to devnet:

const base64 = transaction.serialize().toString('base64');

// Ask Claude:
// "Simulate this transaction on devnet: [paste base64]"

// Check if it will succeed before sending with real wallet
```

### Example 3: Debug Complex Transaction

```javascript
// When transaction fails and you need to understand why:

const base64 = failedTransaction.serialize().toString('base64');

// Ask Claude:
// "Analyze instructions in this transaction: [paste base64]"
// "Use verbose mode"

// See exact program calls, accounts, and instruction order
```

### Example 4: Check Compute Budget

```javascript
// Before deploying to mainnet:

const base64 = complexTransaction.serialize().toString('base64');

// Ask Claude:
// "Estimate compute units for: [paste base64]"

// Ensure transaction won't fail due to compute limit
```

### Example 5: Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Test Fee Atomicity
  run: |
    cd mcp-server/meteora-dev-tools
    npm test
```

## Advanced Configuration

### Custom RPC Endpoints

Modify `src/tools/simulate.ts` and `src/tools/compute.ts`:

```typescript
const RPC_ENDPOINTS = {
  devnet: 'https://your-custom-devnet-rpc.com',
  'mainnet-beta': 'https://your-custom-mainnet-rpc.com',
};
```

Then rebuild:
```bash
npm run build
```

### Development Mode with Auto-Reload

For development:
```bash
npm run dev
```

Server will reload automatically on file changes.

### Adding Custom Meteora Program IDs

Edit `src/tools/analyze.ts`:

```typescript
const PROGRAM_NAMES: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program',
  // Add your program IDs:
  'DLMMProgramID...': 'DLMM Program',
  'DAMMProgramID...': 'DAMM Program',
};
```

## Updating

To update the MCP server:

```bash
cd mcp-server/meteora-dev-tools
git pull  # If tracking in git
npm install
npm run build
```

Then restart Claude Desktop/Code.

## Uninstalling

### Remove from Claude Desktop:

Edit `claude_desktop_config.json` and remove the `meteora-dev-tools` entry.

### Remove from Claude Code:

Edit `.claude/config.json` and remove the server entry.

### Delete Files:

```bash
rm -rf mcp-server/meteora-dev-tools
```

## Security Notes

✅ **Safe:**
- Server only simulates transactions
- Never requires private keys
- Never sends transactions
- Only reads public blockchain data

⚠️ **Remember:**
- Always test on devnet first
- Never share private keys with any tool
- Validate all transactions before sending

## Support

For issues:
1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review [docs/guides/](../../docs/guides/) for project documentation
3. Check MCP server logs
4. Test each tool individually
5. Report issues in the main repository

## Next Steps

After installation:
1. Review [README.md](README.md) for tool documentation
2. Try each tool with test data
3. Integrate into your development workflow
4. Use `/fix-atomic-fees` slash command for automated audits

---

**Installation Complete!** 🎉

You can now use all 5 Meteora Dev Tools in Claude Desktop or Claude Code.
