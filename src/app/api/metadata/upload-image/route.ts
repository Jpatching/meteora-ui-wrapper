import { NextRequest, NextResponse } from 'next/server';
import lighthouse from '@lighthouse-web3/sdk';

// Validate image file
const validateImage = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PNG, JPG, and WebP images are allowed.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.',
    };
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

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate the image
    const validation = validateImage(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Convert File to Buffer for Lighthouse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Lighthouse (IPFS)
    const uploadResponse = await lighthouse.uploadBuffer(buffer, apiKey, file.name);

    if (!uploadResponse || !uploadResponse.data || !uploadResponse.data.Hash) {
      throw new Error('Failed to get CID from Lighthouse response');
    }

    const cid = uploadResponse.data.Hash;
    const ipfsUri = `ipfs://${cid}`;

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      originalSize: file.size,
      processedSize: file.size,
      compressed: false,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload image to IPFS',
      },
      { status: 500 }
    );
  }
}
