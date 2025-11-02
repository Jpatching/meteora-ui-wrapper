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

    // Check image size more explicitly
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use an image under 5MB.`
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer for Lighthouse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Uploading ${file.name} (${file.size} bytes) to Lighthouse...`);

    // Upload to Lighthouse (IPFS) with proper error handling
    let uploadResponse;
    try {
      // uploadBuffer takes (buffer, apiKey, cidVersion?) - no filename parameter
      uploadResponse = await lighthouse.uploadBuffer(buffer, apiKey);
    } catch (lighthouseError: any) {
      console.error('Lighthouse SDK error:', lighthouseError);

      // Check if it's an API key issue
      if (lighthouseError.message?.includes('API Key') || lighthouseError.message?.includes('malformed')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Lighthouse API key. Please check your LIGHTHOUSE_API_KEY environment variable.',
          },
          { status: 500 }
        );
      }

      throw lighthouseError;
    }

    if (!uploadResponse || !uploadResponse.data || !uploadResponse.data.Hash) {
      console.error('Invalid Lighthouse response:', uploadResponse);
      throw new Error('Failed to get CID from Lighthouse response');
    }

    const cid = uploadResponse.data.Hash;
    const ipfsUri = `ipfs://${cid}`;

    console.log(`Successfully uploaded to IPFS: ${ipfsUri}`);

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      originalSize: file.size,
      processedSize: file.size,
      compressed: false,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to upload image to IPFS';

    if (error.message) {
      if (error.message.includes('JSON')) {
        errorMessage = 'Lighthouse API error: Invalid response format. Please check your API key.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to Lighthouse. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
