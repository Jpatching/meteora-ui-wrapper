/**
 * IPFS Client for MetaTools
 *
 * Handles uploading images and metadata JSON to IPFS via Lighthouse (https://lighthouse.storage)
 * Lighthouse offers a "pay once, store forever" model with generous free tier
 * Perfect for token metadata that needs permanent, decentralized storage
 */

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string; // IPFS URI
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
  // Social links (custom extension)
  social?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    github?: string;
    website?: string;
  };
}

export interface UploadImageResponse {
  success: boolean;
  uri?: string;
  url?: string; // Gateway URL
  error?: string;
}

export interface UploadMetadataResponse {
  success: boolean;
  uri?: string;
  url?: string; // Gateway URL
  error?: string;
}

/**
 * Upload an image file to IPFS
 * This is called from the client but proxied through API routes
 */
export async function uploadImageToIPFS(file: File): Promise<UploadImageResponse> {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/metadata/upload-image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload image',
      };
    }

    return {
      success: true,
      uri: data.uri,
      url: data.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload metadata JSON to IPFS
 * This is called from the client but proxied through API routes
 */
export async function uploadMetadataToIPFS(
  metadata: TokenMetadata
): Promise<UploadMetadataResponse> {
  try {
    const response = await fetch('/api/metadata/upload-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload metadata',
      };
    }

    return {
      success: true,
      uri: data.uri,
      url: data.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generate metadata JSON from form data
 */
export function generateMetadata(params: {
  name: string;
  symbol: string;
  description?: string;
  imageUri: string;
  externalUrl?: string;
  social?: TokenMetadata['social'];
  attributes?: TokenMetadata['attributes'];
}): TokenMetadata {
  const metadata: TokenMetadata = {
    name: params.name,
    symbol: params.symbol,
    image: params.imageUri,
  };

  if (params.description) {
    metadata.description = params.description;
  }

  if (params.externalUrl) {
    metadata.external_url = params.externalUrl;
  }

  if (params.social) {
    metadata.social = params.social;
  }

  if (params.attributes && params.attributes.length > 0) {
    metadata.attributes = params.attributes;
  }

  // Standard Metaplex properties
  metadata.properties = {
    files: [
      {
        uri: params.imageUri,
        type: 'image/png', // Or detect from file
      },
    ],
    category: 'token',
  };

  return metadata;
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PNG, JPG, or WebP images.',
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Format IPFS URI for display using Lighthouse gateway
 */
export function formatIPFSUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.lighthouse.storage/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
}
