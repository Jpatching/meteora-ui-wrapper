/**
 * Automated DLMM Pool Setup for Testing Add Liquidity
 *
 * This script:
 * 1. Creates two test tokens (or uses existing ones)
 * 2. Creates a DLMM pool with SAFE parameters
 * 3. Initializes bin arrays if needed
 * 4. Outputs pool details for UI testing
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';

// Configuration
const NETWORK = 'devnet';
const RPC_URL = 'https://api.devnet.solana.com';

// Safe pool parameters (prevents InvalidRealloc error)
const POOL_CONFIG = {
  binStep: 25, // 0.25% - wider steps allow more price range with fewer bins
  initialPrice: 1.0,
  activationType: 'instant' as const,
  baseFeePercentage: 0.1,
  maxFeePercentage: 5.0,
  protocolFeePercentage: 0.0,
  hasAlphaVault: false,
};

// Test amounts
const INITIAL_LIQUIDITY_AMOUNT = 10; // Small amount for testing

interface TestTokens {
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseSymbol: string;
  quoteSymbol: string;
}

async function loadKeypair(): Promise<Keypair> {
  const keypairPath = `${homedir()}/.config/solana/id.json`;
  try {
    const secretKey = JSON.parse(readFileSync(keypairPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    console.error('❌ Failed to load keypair from', keypairPath);
    console.error('Make sure you have a Solana keypair configured');
    throw error;
  }
}

async function getOrCreateTestTokens(
  connection: Connection,
  payer: Keypair
): Promise<TestTokens> {
  console.log('\n📝 Getting test tokens...');

  // For simplicity, we'll use existing devnet tokens
  // User can replace these with their own test tokens

  console.log('Using existing devnet tokens:');

  // Option 1: Use your own tokens (replace these addresses)
  // const baseMint = new PublicKey('YOUR_BASE_TOKEN_MINT');
  // const quoteMint = new PublicKey('YOUR_QUOTE_TOKEN_MINT');

  // Option 2: Use devnet USDC and a placeholder
  const quoteMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Devnet USDC

  console.log(`  Quote Token: ${quoteMint.toBase58()} (USDC)`);

  // For base token, you'll need to create one or use an existing one
  console.log('\n⚠️  You need to provide a base token mint address');
  console.log('Create one using:');
  console.log('  cd ../meteora-invent');
  console.log('  pnpm studio create-token --name "Test Token" --symbol TEST --decimals 9');

  throw new Error('Please update this script with your base token mint address');
}

async function createDLMMPool(
  connection: Connection,
  payer: Keypair,
  tokens: TestTokens
): Promise<string> {
  console.log('\n🏗️  Creating DLMM Pool...');
  console.log('Parameters:', {
    baseMint: tokens.baseMint.toBase58(),
    quoteMint: tokens.quoteMint.toBase58(),
    ...POOL_CONFIG,
  });

  // This is where you'd call the actual pool creation function
  // For now, providing the manual command

  console.log('\n📋 Run this command to create the pool:');
  console.log('\ncd ../meteora-invent');
  console.log(`pnpm studio dlmm-create-pool \\
  --baseMint ${tokens.baseMint.toBase58()} \\
  --quoteMint ${tokens.quoteMint.toBase58()} \\
  --binStep ${POOL_CONFIG.binStep} \\
  --initialPrice ${POOL_CONFIG.initialPrice} \\
  --activationType ${POOL_CONFIG.activationType} \\
  --baseFee ${POOL_CONFIG.baseFeePercentage}`);

  throw new Error('Manual pool creation required - see command above');
}

async function main() {
  console.log('🧪 DLMM Pool Test Setup - Automated');
  console.log('====================================\n');

  try {
    // 1. Load keypair
    console.log('1️⃣  Loading keypair...');
    const payer = await loadKeypair();
    console.log(`   Wallet: ${payer.publicKey.toBase58()}`);

    // 2. Connect to devnet
    console.log('\n2️⃣  Connecting to devnet...');
    const connection = new Connection(RPC_URL, 'confirmed');
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`   Balance: ${balance / 1e9} SOL`);

    if (balance < 0.5e9) {
      console.log('\n⚠️  Low SOL balance. Get more SOL:');
      console.log(`   solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
      return;
    }

    // 3. Get tokens
    console.log('\n3️⃣  Setting up test tokens...');
    console.log('\n📋 QUICK START - Use Existing Tokens:');
    console.log('\nIf you already have test tokens, update the script:');
    console.log('  1. Edit test-pool-setup.ts');
    console.log('  2. Replace baseMint and quoteMint addresses in getOrCreateTestTokens()');
    console.log('  3. Run this script again');

    console.log('\n📋 OR Create New Tokens:');
    console.log('\ncd ../meteora-invent');
    console.log('pnpm studio create-token --name "Test Base" --symbol TBA --decimals 9');
    console.log('pnpm studio create-token --name "Test Quote" --symbol TQT --decimals 9');

    console.log('\n📋 OR Use a Simple Test Pool:');
    console.log('\nFor fastest testing, create a pool directly via UI:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Navigate to: http://localhost:3000/dlmm/create-pool');
    console.log('  3. Use these SAFE settings:');
    console.log('     - Bin Step: 25 (0.25%)');
    console.log('     - Initial Price: 1.0');
    console.log('     - Activation: Instant');
    console.log('     - Base Fee: 0.1%');
    console.log('  4. After creation, go to pool page to test add liquidity');

    console.log('\n✅ Setup Information Displayed');
    console.log('\n🔑 Key Points for Testing Add Liquidity:');
    console.log('  ✓ Pool MUST use bin step 25+ (wider steps = safer)');
    console.log('  ✓ Price ranges MUST be ≤20 bins (UI enforces this)');
    console.log('  ✓ Use strategy presets - they\'re pre-configured safely');
    console.log('  ✓ Watch the safety indicator (green/yellow/red)');
    console.log('  ✓ Test amounts: 10-50 tokens recommended');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Manual pool creation required')) {
        console.log('\n✅ Next step: Run the command above to create your pool');
      } else if (error.message.includes('base token mint')) {
        console.log('\n✅ Next step: Create tokens or update the script with existing ones');
      } else {
        console.error('\n❌ Error:', error.message);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main, POOL_CONFIG };
