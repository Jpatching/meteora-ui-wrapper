import { NextRequest, NextResponse } from 'next/server';
import lighthouse from '@lighthouse-web3/sdk';
import { TokenMetadata } from '@/lib/storage/ipfs-client';

// Validate metadata
const validateMetadata = (metadata: any): { valid: boolean; error?: string } => {
  if (!metadata.name || typeof metadata.name !== 'string') {
    return { valid: false, error: 'Metadata must include a valid name' };
  }

  if (!metadata.symbol || typeof metadata.symbol !== 'string') {
    return { valid: false, error: 'Metadata must include a valid symbol' };
  }

  if (!metadata.image || typeof metadata.image !== 'string') {
    return { valid: false, error: 'Metadata must include a valid image URI' };
  }

  // Validate image URI format
  if (!metadata.image.startsWith('ipfs://') && !metadata.image.startsWith('http')) {
    return { valid: false, error: 'Image URI must be a valid IPFS or HTTP URL' };
  }

  return { valid: true };
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lighthouse API key is not configured. Please set LIGHTHOUSE_API_KEY in your environment.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const metadata: TokenMetadata = body.metadata;

    if (!metadata) {
      return NextResponse.json(
        { success: false, error: 'No metadata provided' },
        { status: 400 }
      );
    }

    // Validate the metadata
    const validation = validateMetadata(metadata);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Convert metadata to JSON string and Buffer
    const metadataJson = JSON.stringify(metadata, null, 2);
    const buffer = Buffer.from(metadataJson, 'utf-8');

    // Upload to Lighthouse (IPFS)
    // uploadBuffer takes (buffer, apiKey, cidVersion?) - no filename parameter
    const uploadResponse = await lighthouse.uploadBuffer(buffer, apiKey);

    if (!uploadResponse || !uploadResponse.data || !uploadResponse.data.Hash) {
      throw new Error('Failed to get CID from Lighthouse response');
    }

    const cid = uploadResponse.data.Hash;
    const ipfsUri = `ipfs://${cid}`;

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      metadata,
    });
  } catch (error: any) {
    console.error('Metadata upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload metadata to IPFS',
      },
      { status: 500 }
    );
  }
}
