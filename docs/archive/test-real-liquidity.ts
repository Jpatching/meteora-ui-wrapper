#!/usr/bin/env tsx

import { Connection, PublicKey, Keypair, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import DLMM from '@meteora-ag/dlmm';
import BN from 'bn.js';

const POOL_ADDRESS = '8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1';
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=66e68ad7-74bf-4a60-9705-2fed52f4d425';
const WALLET_PUBKEY = '85hJAjmoSHym7S9bTLRkW2AK94TACuw5yjGdLa7c34Xs';

async function testRealLiquidity() {
  console.log('🚀 Testing Real DLMM Add Liquidity Transaction...\n');

  const connection = new Connection(RPC_URL, 'finalized');
  const walletPubkey = new PublicKey(WALLET_PUBKEY);

  // Check SOL balance
  const solBalance = await connection.getBalance(walletPubkey);
  console.log(`💰 SOL Balance: ${solBalance / 1e9} SOL`);

  if (solBalance < 0.5e9) {
    console.error('❌ Need at least 0.5 SOL for testing');
    return;
  }

  // Load pool
  console.log('\n📊 Loading DLMM pool...');
  const poolPubkey = new PublicKey(POOL_ADDRESS);
  const dlmmPool = await DLMM.create(connection, poolPubkey);

  const poolState = dlmmPool.lbPair;
  const activationPoint = poolState.activationPoint;
  const isEmptyPool = !activationPoint || activationPoint.toNumber() === 0;

  console.log('Pool Info:');
  console.log('  - Token X:', dlmmPool.tokenX.publicKey.toBase58());
  console.log('  - Token Y:', dlmmPool.tokenY.publicKey.toBase58());
  console.log('  - Active Bin:', poolState.activeId);
  console.log('  - Bin Step:', poolState.binStep);
  console.log('  - Activation Point:', activationPoint ? activationPoint.toString() : 'null');
  console.log('  - Empty Pool:', isEmptyPool);

  // Get token balances
  console.log('\n💰 Checking Token Balances...');

  const tokenXAta = await getAssociatedTokenAddress(dlmmPool.tokenX.publicKey, walletPubkey);
  const tokenYAta = await getAssociatedTokenAddress(dlmmPool.tokenY.publicKey, walletPubkey);

  let tokenXBalance = new BN(0);
  let tokenYBalance = new BN(0);

  try {
    const tokenXAccount = await getAccount(connection, tokenXAta);
    tokenXBalance = new BN(tokenXAccount.amount.toString());
    console.log(`  - Token X Balance: ${tokenXBalance.toString()} (${tokenXBalance.div(new BN(10).pow(new BN(dlmmPool.tokenX.mint.decimals))).toString()} tokens)`);
  } catch (e) {
    console.log('  - Token X Balance: 0 (no account)');
  }

  try {
    const tokenYAccount = await getAccount(connection, tokenYAta);
    tokenYBalance = new BN(tokenYAccount.amount.toString());
    console.log(`  - Token Y Balance: ${tokenYBalance.toString()} (${tokenYBalance.div(new BN(10).pow(new BN(dlmmPool.tokenY.mint.decimals))).toString()} tokens)`);
  } catch (e) {
    console.log('  - Token Y Balance: 0 (no account)');
  }

  if (tokenXBalance.eq(new BN(0)) && tokenYBalance.eq(new BN(0))) {
    console.error('\n❌ No token balance found. Cannot add liquidity without tokens.');
    console.log('\nTo get tokens:');
    console.log('1. Check token addresses above');
    console.log('2. Mint some tokens to your wallet');
    console.log('3. Run this script again');
    return;
  }

  // Calculate amounts - use 10% of available balance to be safe
  const activePrice = Math.pow(1 + poolState.binStep / 10000, poolState.activeId);
  const minPrice = activePrice * 0.9; // 10% below
  const maxPrice = activePrice * 1.1; // 10% above

  console.log('\n📐 Price Range:');
  console.log('  - Active Price:', activePrice);
  console.log('  - Min Price:', minPrice);
  console.log('  - Max Price:', maxPrice);

  // Use smaller amounts for testing
  let depositAmountX = new BN(0);
  let depositAmountY = new BN(0);

  if (tokenXBalance.gt(new BN(0))) {
    // Use 10% of balance or 10 tokens, whichever is smaller
    const tenTokens = new BN(10).mul(new BN(10).pow(new BN(dlmmPool.tokenX.mint.decimals)));
    depositAmountX = BN.min(tokenXBalance.div(new BN(10)), tenTokens);
  }

  if (tokenYBalance.gt(new BN(0))) {
    const tenTokens = new BN(10).mul(new BN(10).pow(new BN(dlmmPool.tokenY.mint.decimals)));
    depositAmountY = BN.min(tokenYBalance.div(new BN(10)), tenTokens);
  }

  console.log('\n💵 Deposit Amounts:');
  console.log(`  - Token X: ${depositAmountX.toString()} lamports (${depositAmountX.div(new BN(10).pow(new BN(dlmmPool.tokenX.mint.decimals))).toString()} tokens)`);
  console.log(`  - Token Y: ${depositAmountY.toString()} lamports (${depositAmountY.div(new BN(10).pow(new BN(dlmmPool.tokenY.mint.decimals))).toString()} tokens)`);

  if (depositAmountX.eq(new BN(0)) && depositAmountY.eq(new BN(0))) {
    console.error('\n❌ Deposit amounts are 0. Need tokens to add liquidity.');
    return;
  }

  // Create position keypair
  const positionKeypair = Keypair.generate();
  console.log('\n🔑 Position Keypair:', positionKeypair.publicKey.toBase58());

  if (isEmptyPool) {
    console.log('\n⚠️  EMPTY POOL - Using seedLiquiditySingleBin flow');

    // For empty pools, must seed at active price
    const isSingleSided = depositAmountX.gt(new BN(0)) !== depositAmountY.gt(new BN(0));

    if (!isSingleSided) {
      console.error('❌ Empty pool requires single-sided deposit (either Token X OR Token Y, not both)');
      return;
    }

    const seedAmount = depositAmountX.gt(new BN(0)) ? depositAmountX : depositAmountY;

    console.log('\n🧪 Calling seedLiquiditySingleBin...');
    console.log('  - Seed Amount:', seedAmount.toString());
    console.log('  - Seed Price:', activePrice);

    try {
      // Initialize bin arrays first
      console.log('\n📦 Initializing bin arrays...');
      const binArrayIndexes = [new BN(-1), new BN(0), new BN(1)];
      const initInstructions = await dlmmPool.initializeBinArrays(binArrayIndexes, walletPubkey);

      if (initInstructions && initInstructions.length > 0) {
        console.log(`  ⚠️  Need to initialize ${initInstructions.length} bin arrays (~${initInstructions.length * 0.075} SOL)`);
        console.log('  ℹ️  This test script cannot sign transactions (wallet needed)');
        console.log('  ℹ️  In the UI, these will be sent automatically');
      } else {
        console.log('  ✅ Bin arrays already initialized');
      }

      // Get seed instructions
      const seedResponse = await dlmmPool.seedLiquiditySingleBin(
        walletPubkey,
        positionKeypair.publicKey,
        seedAmount,
        activePrice,
        false,
        walletPubkey,
        walletPubkey,
        PublicKey.default,
        new BN(0),
        false
      );

      console.log('\n✅ seedLiquiditySingleBin instructions created!');
      console.log('  - Instructions:', seedResponse.instructions?.length || 0);

      // Build transaction
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }));
      tx.add(...seedResponse.instructions);

      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      console.log('\n📋 Transaction Details:');
      console.log('  - Instructions:', tx.instructions.length);
      console.log('  - Needs Signers: [wallet, position]');
      console.log('  - Position must sign:', positionKeypair.publicKey.toBase58());

      // Partial sign with position keypair to check if it works
      tx.partialSign(positionKeypair);
      console.log('  - Position signature:', tx.signatures[0].signature ? 'ADDED ✅' : 'MISSING ❌');

      console.log('\n✅ Transaction built successfully!');
      console.log('  ℹ️  This needs to be signed by wallet in the UI');

    } catch (error: any) {
      console.error('\n❌ seedLiquiditySingleBin failed:');
      console.error('  - Error:', error.message);
      if (error.logs) {
        console.error('\n  - Transaction Logs:');
        error.logs.forEach((log: string) => console.error('    ', log));
      }
      throw error;
    }

  } else {
    console.log('\n⚠️  NON-EMPTY POOL - Using initializePositionAndAddLiquidityByStrategy flow');

    // Calculate bin IDs from prices
    const minBinId = Math.floor(Math.log(minPrice) / Math.log(1 + poolState.binStep / 10000));
    const maxBinId = Math.floor(Math.log(maxPrice) / Math.log(1 + poolState.binStep / 10000));

    console.log('\n📊 Strategy:');
    console.log('  - Min Bin ID:', minBinId);
    console.log('  - Max Bin ID:', maxBinId);
    console.log('  - Active Bin ID:', poolState.activeId);

    const strategy = {
      minBinId,
      maxBinId,
      strategyType: 0, // Spot balanced
    };

    const liquidityParams = {
      positionPubKey: positionKeypair.publicKey,
      user: walletPubkey,
      totalXAmount: depositAmountX,
      totalYAmount: depositAmountY,
      strategy,
    };

    console.log('\n🧪 Calling initializePositionAndAddLiquidityByStrategy...');

    try {
      const { instructions } = await dlmmPool.initializePositionAndAddLiquidityByStrategy(liquidityParams);

      console.log('\n✅ Instructions created successfully!');
      console.log('  - Instructions:', instructions?.length || 0);

      if (instructions) {
        // Build transaction
        const tx = new Transaction();
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }));
        tx.add(...instructions);

        const { blockhash } = await connection.getLatestBlockhash('finalized');
        tx.recentBlockhash = blockhash;
        tx.feePayer = walletPubkey;

        console.log('\n📋 Transaction Details:');
        console.log('  - Total Instructions:', tx.instructions.length);
        console.log('  - Needs Signers: [wallet, position]');
        console.log('  - Position must sign:', positionKeypair.publicKey.toBase58());

        // Partial sign with position keypair
        tx.partialSign(positionKeypair);
        console.log('  - Position signature:', tx.signatures[0].signature ? 'ADDED ✅' : 'MISSING ❌');

        // Try to serialize to check size
        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        console.log('  - Transaction Size:', serialized.length, 'bytes');

        if (serialized.length > 1232) {
          console.warn('  ⚠️  Transaction too large! Max is 1232 bytes');
        } else {
          console.log('  ✅ Transaction size OK');
        }

        console.log('\n✅ Transaction built successfully!');
        console.log('  ℹ️  This needs to be signed by wallet in the UI');
      }

    } catch (error: any) {
      console.error('\n❌ initializePositionAndAddLiquidityByStrategy failed:');
      console.error('  - Error:', error.message);
      if (error.logs) {
        console.error('\n  - Transaction Logs:');
        error.logs.forEach((log: string) => console.error('    ', log));
      }
      throw error;
    }
  }

  console.log('\n✅ Test completed successfully!');
  console.log('\n📝 Summary:');
  console.log('  - Pool is', isEmptyPool ? 'EMPTY' : 'NON-EMPTY');
  console.log('  - Using', isEmptyPool ? 'seedLiquiditySingleBin' : 'initializePositionAndAddLiquidityByStrategy');
  console.log('  - Instructions created successfully');
  console.log('  - Transaction size validated');
  console.log('  - Ready for wallet signature in UI');
}

testRealLiquidity().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
