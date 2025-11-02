#!/usr/bin/env node

/**
 * Meteora Dev Tools MCP Server
 *
 * Provides specialized tools for developing and testing Meteora protocol integrations:
 * - simulate_transaction: Test transactions on devnet without sending
 * - validate_fee_atomicity: Check if fees are atomic with main transaction
 * - analyze_transaction_instructions: Debug instruction order and content
 * - estimate_compute_units: Check transaction compute budget
 * - test_referral_split: Validate fee distribution mathematics
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { simulateTransaction } from './tools/simulate.js';
import { validateFeeAtomicity } from './tools/validate.js';
import { analyzeTransactionInstructions } from './tools/analyze.js';
import { estimateComputeUnits } from './tools/compute.js';
import { testReferralSplit } from './tools/referral.js';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'simulate_transaction',
    description: 'Simulates a Solana transaction on devnet or mainnet without sending it. Returns simulation results including success status, logs, and compute units consumed.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionBase64: {
          type: 'string',
          description: 'Base64-encoded serialized transaction',
        },
        network: {
          type: 'string',
          enum: ['devnet', 'mainnet-beta'],
          description: 'Network to simulate on (default: devnet)',
        },
      },
      required: ['transactionBase64'],
    },
  },
  {
    name: 'validate_fee_atomicity',
    description: 'Validates that fee instructions are prepended to the transaction atomically. Checks instruction order, count, and identifies potential issues with non-atomic fee payments.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionBase64: {
          type: 'string',
          description: 'Base64-encoded serialized transaction',
        },
        expectedFeeCount: {
          type: 'number',
          description: 'Expected number of fee transfer instructions (default: 3 for referral+buyback+treasury)',
        },
      },
      required: ['transactionBase64'],
    },
  },
  {
    name: 'analyze_transaction_instructions',
    description: 'Provides detailed analysis of all transaction instructions including program IDs, accounts, and data. Useful for debugging complex transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionBase64: {
          type: 'string',
          description: 'Base64-encoded serialized transaction',
        },
        verbose: {
          type: 'boolean',
          description: 'Include full account details (default: false)',
        },
      },
      required: ['transactionBase64'],
    },
  },
  {
    name: 'estimate_compute_units',
    description: 'Estimates compute units required for transaction execution. Helps prevent "exceeded compute budget" errors by analyzing transaction complexity.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionBase64: {
          type: 'string',
          description: 'Base64-encoded serialized transaction',
        },
        network: {
          type: 'string',
          enum: ['devnet', 'mainnet-beta'],
          description: 'Network to estimate on (default: devnet)',
        },
      },
      required: ['transactionBase64'],
    },
  },
  {
    name: 'test_referral_split',
    description: 'Validates referral fee distribution mathematics. Ensures percentages add up, no rounding errors, and amounts are correct.',
    inputSchema: {
      type: 'object',
      properties: {
        totalFeeLamports: {
          type: 'number',
          description: 'Total fee amount in lamports',
        },
        referralPercentage: {
          type: 'number',
          description: 'Referral percentage (e.g., 10 for 10%)',
        },
        buybackPercentage: {
          type: 'number',
          description: 'Buyback percentage (e.g., 45 for 45%)',
        },
        treasuryPercentage: {
          type: 'number',
          description: 'Treasury percentage (e.g., 45 for 45%)',
        },
      },
      required: ['totalFeeLamports', 'referralPercentage', 'buybackPercentage', 'treasuryPercentage'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'meteora-dev-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'simulate_transaction':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await simulateTransaction(
                  args.transactionBase64 as string,
                  args.network as string | undefined
                ),
                null,
                2
              ),
            },
          ],
        };

      case 'validate_fee_atomicity':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await validateFeeAtomicity(
                  args.transactionBase64 as string,
                  args.expectedFeeCount as number | undefined
                ),
                null,
                2
              ),
            },
          ],
        };

      case 'analyze_transaction_instructions':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await analyzeTransactionInstructions(
                  args.transactionBase64 as string,
                  args.verbose as boolean | undefined
                ),
                null,
                2
              ),
            },
          ],
        };

      case 'estimate_compute_units':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await estimateComputeUnits(
                  args.transactionBase64 as string,
                  args.network as string | undefined
                ),
                null,
                2
              ),
            },
          ],
        };

      case 'test_referral_split':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await testReferralSplit(
                  args.totalFeeLamports as number,
                  args.referralPercentage as number,
                  args.buybackPercentage as number,
                  args.treasuryPercentage as number
                ),
                null,
                2
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            tool: name,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('Meteora Dev Tools MCP Server started');
  console.error('Available tools:', TOOLS.map(t => t.name).join(', '));
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
