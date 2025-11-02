import { NextRequest, NextResponse } from 'next/server';
import { NFTStorage } from 'nft.storage';
import { TokenMetadata } from '@/lib/storage/ipfs-client';

// Initialize NFT.Storage client
const getNFTStorageClient = () => {
  const apiKey = process.env.NFT_STORAGE_API_KEY;
  if (!apiKey) {
    throw new Error('NFT_STORAGE_API_KEY is not configured');
  }
  return new NFTStorage({ token: apiKey });
};

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

    // Convert metadata to JSON blob
    const metadataJson = JSON.stringify(metadata, null, 2);
    const metadataBlob = new Blob([metadataJson], { type: 'application/json' });

    // Upload to NFT.Storage
    const client = getNFTStorageClient();
    const cid = await client.storeBlob(metadataBlob);
    const ipfsUri = `ipfs://${cid}`;

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      metadata,
    });
  } catch (error: any) {
    console.error('Metadata upload error:', error);

    if (error.message?.includes('NFT_STORAGE_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'NFT.Storage API key is not configured. Please set NFT_STORAGE_API_KEY in your environment.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload metadata to IPFS',
      },
      { status: 500 }
    );
  }
}
