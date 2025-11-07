/**
 * LP Position Management Routes
 * Handles position creation, fee claiming, and liquidity removal
 * Supports: DLMM and DAMM v2 protocols
 */

import { Router, Request, Response } from 'express';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import AmmImpl from '@meteora-ag/dynamic-amm-sdk';
import BN from 'bn.js';

const router = Router();

// Network RPC endpoints
const RPC_ENDPOINTS: { [key: string]: string } = {
  'mainnet-beta': process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'devnet': process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
  'localnet': process.env.LOCALNET_RPC_URL || 'http://localhost:8899',
};

/**
 * POST /api/positions/create
 * Initialize position and add liquidity to pool
 * Supports both DLMM and DAMM v2 protocols
 */
router.post('/create', async (req: Request, res: Response) => {
  const {
    poolAddress,
    walletAddress,
    tokenAAmount,
    tokenBAmount,
    protocol = 'dlmm', // dlmm or damm-v2
    strategy = 'spot', // spot, curve, bidAsk (DLMM only)
    network = 'mainnet-beta',
  } = req.body;

  console.log(`📝 Creating ${protocol.toUpperCase()} LP position for pool ${poolAddress}`);
  console.log(`   User: ${walletAddress}`);
  console.log(`   Amounts: ${tokenAAmount} / ${tokenBAmount}`);
  console.log(`   Strategy: ${strategy}`);

  try {
    // Validate required parameters
    if (!poolAddress || !walletAddress || (!tokenAAmount && !tokenBAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: poolAddress, walletAddress, and at least one token amount',
      });
    }

    // Get RPC connection
    const rpcEndpoint = RPC_ENDPOINTS[network] || RPC_ENDPOINTS['mainnet-beta'];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);

    if (protocol === 'dlmm') {
      // ===== DLMM Protocol =====
      const dlmmPool = await DLMM.create(
        connection,
        new PublicKey(poolAddress),
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      console.log(`✅ DLMM pool loaded: ${dlmmPool.pubkey.toBase58()}`);
      console.log(`   Active Bin: ${dlmmPool.lbPair.activeId}`);
      console.log(`   Bin Step: ${dlmmPool.lbPair.binStep}`);

      // Determine strategy type
      let strategyType: number;
      if (strategy === 'spot') {
        strategyType = 0; // SpotBalanced
      } else if (strategy === 'curve') {
        strategyType = 1; // Curve
      } else {
        strategyType = 2; // BidAsk
      }

      // Generate position keypair
      const positionKeypair = Keypair.generate();

      // Create position and add liquidity transaction
      const addLiquidityTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        user: userPubkey,
        totalXAmount: new BN(tokenAAmount || 0),
        totalYAmount: new BN(tokenBAmount || 0),
        strategy: {
          maxBinId: dlmmPool.lbPair.activeId + 50,
          minBinId: dlmmPool.lbPair.activeId - 50,
          strategyType,
        },
      });

      console.log(`✅ DLMM position initialized successfully`);

      // Serialize transaction for frontend to sign
      const serializedTx = addLiquidityTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      res.json({
        success: true,
        protocol: 'dlmm',
        data: {
          transaction: serializedTx.toString('base64'),
          positionAddress: positionKeypair.publicKey.toBase58(),
          activeId: dlmmPool.lbPair.activeId,
          binStep: dlmmPool.lbPair.binStep,
          message: 'DLMM position transaction created. Sign with your wallet to complete.',
        },
      });
    } else if (protocol === 'damm-v2' || protocol === 'dammv2') {
      // ===== DAMM v2 Protocol =====
      const dammPool = await AmmImpl.create(
        connection,
        new PublicKey(poolAddress)
      );

      console.log(`✅ DAMM v2 pool loaded: ${poolAddress}`);

      // For DAMM v2, we deposit liquidity proportionally
      // The SDK will handle the optimal distribution
      const depositTx = await dammPool.deposit(
        userPubkey,
        new BN(tokenAAmount || 0),
        new BN(tokenBAmount || 0),
        new BN(0) // Min LP tokens (0 for now, should calculate slippage)
      );

      console.log(`✅ DAMM v2 deposit transaction created`);

      // Serialize transaction
      const serializedTx = depositTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      res.json({
        success: true,
        protocol: 'damm-v2',
        data: {
          transaction: serializedTx.toString('base64'),
          message: 'DAMM v2 deposit transaction created. Sign with your wallet to complete.',
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported protocol: ${protocol}. Supported: dlmm, damm-v2`,
      });
    }
  } catch (error: any) {
    console.error(`❌ Error creating ${protocol} position:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create position',
      details: error.stack,
    });
  }
});

/**
 * POST /api/positions/claim-fees
 * Claim accumulated fees from LP position
 */
router.post('/claim-fees', async (req: Request, res: Response) => {
  const {
    poolAddress,
    positionAddress,
    walletAddress,
    protocol = 'dlmm',
    network = 'mainnet-beta',
  } = req.body;

  console.log(`💰 Claiming fees for ${protocol} position ${positionAddress}`);

  try {
    if (!poolAddress || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: poolAddress, walletAddress',
      });
    }

    const rpcEndpoint = RPC_ENDPOINTS[network] || RPC_ENDPOINTS['mainnet-beta'];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);

    if (protocol === 'dlmm') {
      if (!positionAddress) {
        return res.status(400).json({
          success: false,
          error: 'positionAddress is required for DLMM',
        });
      }

      const dlmmPool = await DLMM.create(
        connection,
        new PublicKey(poolAddress),
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      const positionPubkey = new PublicKey(positionAddress);
      const position = await dlmmPool.getPosition(positionPubkey);

      // Create claim rewards transaction
      const claimTx = await dlmmPool.claimAllRewardsByPosition({
        owner: userPubkey,
        position: position,
      });

      // Handle if result is array of transactions
      const tx = Array.isArray(claimTx) ? claimTx[0] : claimTx;

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      console.log(`✅ DLMM fee claim transaction created`);

      res.json({
        success: true,
        protocol: 'dlmm',
        data: {
          transaction: serializedTx.toString('base64'),
          message: 'Fee claim transaction created. Sign with your wallet to complete.',
        },
      });
    } else if (protocol === 'damm-v2' || protocol === 'dammv2') {
      const dammPool = await AmmImpl.create(
        connection,
        new PublicKey(poolAddress)
      );

      // DAMM v2 fees are automatically compounded, but we can claim admin fees
      // This would be implemented based on DAMM v2 SDK capabilities
      // For now, return a message that fees are auto-compounded
      res.json({
        success: true,
        protocol: 'damm-v2',
        data: {
          message: 'DAMM v2 automatically compounds fees. No claim action needed.',
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported protocol: ${protocol}`,
      });
    }
  } catch (error: any) {
    console.error('❌ Error claiming fees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to claim fees',
      details: error.stack,
    });
  }
});

/**
 * POST /api/positions/remove-liquidity
 * Remove liquidity from LP position
 */
router.post('/remove-liquidity', async (req: Request, res: Response) => {
  const {
    poolAddress,
    positionAddress,
    walletAddress,
    amount, // For DAMM v2: LP token amount to burn
    bps = 10000, // For DLMM: Basis points (10000 = 100%)
    protocol = 'dlmm',
    network = 'mainnet-beta',
  } = req.body;

  console.log(`📤 Removing liquidity from ${protocol} position`);
  console.log(`   Amount/BPS: ${amount || bps}`);

  try {
    if (!poolAddress || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: poolAddress, walletAddress',
      });
    }

    const rpcEndpoint = RPC_ENDPOINTS[network] || RPC_ENDPOINTS['mainnet-beta'];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);

    if (protocol === 'dlmm') {
      if (!positionAddress) {
        return res.status(400).json({
          success: false,
          error: 'positionAddress is required for DLMM',
        });
      }

      const dlmmPool = await DLMM.create(
        connection,
        new PublicKey(poolAddress),
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      const positionPubkey = new PublicKey(positionAddress);
      const position = await dlmmPool.getPosition(positionPubkey);

      // Get bin IDs from position
      const positionData = position.positionData as any;
      const binIds = Array.isArray(positionData)
        ? positionData.map((p: any) => p.binId)
        : [];
      const fromBinId = binIds.length > 0 ? Math.min(...binIds) : 0;
      const toBinId = binIds.length > 0 ? Math.max(...binIds) : 0;

      // Create remove liquidity transaction
      const removeLiquidityTx = await dlmmPool.removeLiquidity({
        position: positionPubkey,
        user: userPubkey,
        fromBinId,
        toBinId,
        bps: new BN(bps),
        shouldClaimAndClose: bps === 10000,
      });

      // Handle if result is array of transactions
      const tx = Array.isArray(removeLiquidityTx) ? removeLiquidityTx[0] : removeLiquidityTx;

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      console.log(`✅ DLMM remove liquidity transaction created`);

      res.json({
        success: true,
        protocol: 'dlmm',
        data: {
          transaction: serializedTx.toString('base64'),
          message: 'Remove liquidity transaction created. Sign with your wallet to complete.',
        },
      });
    } else if (protocol === 'damm-v2' || protocol === 'dammv2') {
      if (!amount) {
        return res.status(400).json({
          success: false,
          error: 'amount (LP tokens) is required for DAMM v2 withdrawal',
        });
      }

      const dammPool = await AmmImpl.create(
        connection,
        new PublicKey(poolAddress)
      );

      // Withdraw liquidity from DAMM v2 pool
      const withdrawTx = await dammPool.withdraw(
        userPubkey,
        new BN(amount),
        new BN(0), // Min token A out
        new BN(0)  // Min token B out
      );

      const serializedTx = withdrawTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      console.log(`✅ DAMM v2 withdraw transaction created`);

      res.json({
        success: true,
        protocol: 'damm-v2',
        data: {
          transaction: serializedTx.toString('base64'),
          message: 'Withdraw transaction created. Sign with your wallet to complete.',
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported protocol: ${protocol}`,
      });
    }
  } catch (error: any) {
    console.error('❌ Error removing liquidity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove liquidity',
      details: error.stack,
    });
  }
});

/**
 * GET /api/positions/user/:walletAddress
 * Get all positions for a user across both protocols
 */
router.get('/user/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const { network = 'mainnet-beta' } = req.query;

  console.log(`🔍 Fetching all positions for user ${walletAddress}`);

  try {
    const rpcEndpoint = RPC_ENDPOINTS[network as string] || RPC_ENDPOINTS['mainnet-beta'];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);

    const positions: any[] = [];

    // Fetch DLMM positions
    try {
      const dlmmPositions = await DLMM.getAllLbPairPositionsByUser(
        connection,
        userPubkey,
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      for (const [positionKey, positionInfo] of dlmmPositions.entries()) {
        const { lbPair, tokenX, tokenY, lbPairPositionsData } = positionInfo;

        positions.push({
          protocol: 'dlmm',
          positionKey,
          poolAddress: (lbPair as any).publicKey?.toString() || '',
          baseToken: {
            mint: (tokenX as any).publicKey?.toString() || '',
            symbol: (tokenX as any).symbol || 'Token X',
          },
          quoteToken: {
            mint: (tokenY as any).publicKey?.toString() || '',
            symbol: (tokenY as any).symbol || 'Token Y',
          },
          binPositions: lbPairPositionsData.length,
        });
      }

      console.log(`✅ Found ${dlmmPositions.size} DLMM positions`);
    } catch (error) {
      console.warn('⚠️ Error fetching DLMM positions:', error);
    }

    // TODO: Add DAMM v2 position fetching when SDK supports it
    // DAMM v2 uses standard SPL token accounts for LP tokens

    res.json({
      success: true,
      data: {
        walletAddress,
        totalPositions: positions.length,
        positions,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching user positions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user positions',
    });
  }
});

/**
 * GET /api/positions/:address
 * Get position details for a specific position
 */
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const { network = 'mainnet-beta', poolAddress, protocol = 'dlmm' } = req.query;

  console.log(`🔍 Fetching ${protocol} position ${address}`);

  try {
    if (!poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'poolAddress query parameter is required',
      });
    }

    const rpcEndpoint = RPC_ENDPOINTS[network as string] || RPC_ENDPOINTS['mainnet-beta'];
    const connection = new Connection(rpcEndpoint, 'confirmed');

    if (protocol === 'dlmm') {
      const dlmmPool = await DLMM.create(
        connection,
        new PublicKey(poolAddress as string),
        { cluster: network as 'mainnet-beta' | 'devnet' | 'localhost' }
      );

      const positionPubkey = new PublicKey(address);
      const position = await dlmmPool.getPosition(positionPubkey);

      res.json({
        success: true,
        protocol: 'dlmm',
        data: {
          address,
          position: position,
        },
      });
    } else {
      res.json({
        success: true,
        protocol: protocol as string,
        data: {
          message: 'Position details for this protocol will be implemented soon',
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Error fetching position:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch position',
    });
  }
});

export default router;
