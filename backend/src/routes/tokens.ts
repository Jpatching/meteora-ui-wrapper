/**
 * Token Metadata API Routes
 * Provides cached token metadata (logos, names, decimals)
 */

import { Router, Request, Response } from 'express';
import { getTokenMetadata, getMultipleTokenMetadata } from '../services/tokenMetadataService';
import { getTokenCreationTimestamp, getBatchTokenCreationTimestamps } from '../services/tokenCreationService';

const router = Router();

/**
 * GET /api/tokens/:address
 * Get metadata for a single token
 */
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const metadata = await getTokenMetadata(address);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Token metadata not found'
      });
    }

    res.json({
      success: true,
      data: metadata
    });
  } catch (error: any) {
    console.error('❌ Error fetching token metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tokens/batch
 * Get metadata for multiple tokens
 * Body: { addresses: string[] }
 */
router.post('/batch', async (req: Request, res: Response) => {
  const { addresses } = req.body;

  if (!Array.isArray(addresses)) {
    return res.status(400).json({
      success: false,
      error: 'addresses must be an array'
    });
  }

  try {
    const metadataMap = await getMultipleTokenMetadata(addresses);

    // Convert Map to object for JSON response
    const result: Record<string, any> = {};
    metadataMap.forEach((metadata, address) => {
      result[address] = metadata;
    });

    res.json({
      success: true,
      data: result,
      count: metadataMap.size
    });
  } catch (error: any) {
    console.error('❌ Error fetching batch token metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tokens/:address/creation
 * Get token creation timestamp from blockchain (cached)
 */
router.get('/:address/creation', async (req: Request, res: Response) => {
  const { address } = req.params;
  const { rpcUrl } = req.query;

  try {
    const timestamp = await getTokenCreationTimestamp(
      address,
      rpcUrl as string | undefined
    );

    if (timestamp === null) {
      return res.status(404).json({
        success: false,
        error: 'Could not determine token creation timestamp'
      });
    }

    res.json({
      success: true,
      data: {
        mintAddress: address,
        creationTimestamp: timestamp,
        createdAt: new Date(timestamp * 1000).toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching token creation timestamp:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tokens/batch/creation
 * Get creation timestamps for multiple tokens
 * Body: { addresses: string[], rpcUrl?: string }
 */
router.post('/batch/creation', async (req: Request, res: Response) => {
  const { addresses, rpcUrl } = req.body;

  if (!Array.isArray(addresses)) {
    return res.status(400).json({
      success: false,
      error: 'addresses must be an array'
    });
  }

  if (addresses.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'addresses array cannot be empty'
    });
  }

  // Limit batch size to prevent abuse
  if (addresses.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 addresses per batch request'
    });
  }

  try {
    const timestampMap = await getBatchTokenCreationTimestamps(addresses, rpcUrl);

    // Convert Map to object for JSON response
    const result: Record<string, { timestamp: number; createdAt: string } | null> = {};

    timestampMap.forEach((timestamp, address) => {
      if (timestamp !== null) {
        result[address] = {
          timestamp,
          createdAt: new Date(timestamp * 1000).toISOString()
        };
      } else {
        result[address] = null;
      }
    });

    res.json({
      success: true,
      data: result,
      count: timestampMap.size
    });
  } catch (error: any) {
    console.error('❌ Error fetching batch token creation timestamps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
