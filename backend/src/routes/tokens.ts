/**
 * Token Metadata API Routes
 * Provides cached token metadata (logos, names, decimals)
 */

import { Router, Request, Response } from 'express';
import { getTokenMetadata, getMultipleTokenMetadata } from '../services/tokenMetadataService';

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

export default router;
