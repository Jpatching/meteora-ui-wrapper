import { NextRequest, NextResponse } from 'next/server';
import { NFTStorage } from 'nft.storage';
import imageCompression from 'browser-image-compression';

// Initialize NFT.Storage client
const getNFTStorageClient = () => {
  const apiKey = process.env.NFT_STORAGE_API_KEY;
  if (!apiKey) {
    throw new Error('NFT_STORAGE_API_KEY is not configured');
  }
  return new NFTStorage({ token: apiKey });
};

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

// Compress image if needed
const compressImageIfNeeded = async (file: File): Promise<File> => {
  const compressionThreshold = 1 * 1024 * 1024; // 1MB

  if (file.size <= compressionThreshold) {
    return file;
  }

  // Compress the image
  const options = {
    maxSizeMB: 0.8, // Target size
    maxWidthOrHeight: 2048, // Max dimension
    useWebWorker: false, // Disable for Node.js environment
    fileType: file.type as any,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Compression failed, using original file:', error);
    return file;
  }
};

export async function POST(request: NextRequest) {
  try {
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

    // Compress image if needed
    const processedFile = await compressImageIfNeeded(file);

    // Upload to NFT.Storage
    const client = getNFTStorageClient();
    const cid = await client.storeBlob(processedFile);
    const ipfsUri = `ipfs://${cid}`;

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      originalSize: file.size,
      processedSize: processedFile.size,
      compressed: processedFile.size < file.size,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);

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
        error: error.message || 'Failed to upload image to IPFS',
      },
      { status: 500 }
    );
  }
}
