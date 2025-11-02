'use client';

import React, { useState, useEffect } from 'react';
import { TokenMetadata } from '@/lib/storage/ipfs-client';
import { ImageUpload } from './ImageUpload';
import { SocialLinksInput } from './SocialLinksInput';
import { MetadataPreview } from './MetadataPreview';
import { Input, Button } from '@/components/ui';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface MetadataBuilderProps {
  tokenName: string;
  tokenSymbol: string;
  onMetadataGenerated: (uri: string, metadata: TokenMetadata) => void;
  className?: string;
}

export const MetadataBuilder: React.FC<MetadataBuilderProps> = ({
  tokenName,
  tokenSymbol,
  onMetadataGenerated,
  className = '',
}) => {
  const [imageUri, setImageUri] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState<TokenMetadata['social']>({});
  const [generating, setGenerating] = useState(false);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<TokenMetadata | null>(null);

  // Reset metadata when token info changes
  useEffect(() => {
    if (metadataUri) {
      setMetadataUri(null);
      setGeneratedMetadata(null);
    }
  }, [tokenName, tokenSymbol, imageUri, description, externalUrl, socialLinks]);

  const canGenerate = tokenName && tokenSymbol && imageUri;

  const handleGenerateMetadata = async () => {
    if (!canGenerate) {
      toast.error('Please provide token name, symbol, and image');
      return;
    }

    setGenerating(true);
    const loadingToast = toast.loading('Generating metadata and uploading to IPFS...');

    try {
      // Build metadata object
      const metadata: TokenMetadata = {
        name: tokenName,
        symbol: tokenSymbol,
        image: imageUri,
        ...(description && { description }),
        ...(externalUrl && { external_url: externalUrl }),
        ...(Object.keys(socialLinks || {}).length > 0 && { social: socialLinks }),
      };

      // Upload metadata JSON to IPFS
      const response = await fetch('/api/metadata/upload-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      const result = await response.json();

      if (result.success) {
        setMetadataUri(result.uri);
        setGeneratedMetadata(metadata);
        onMetadataGenerated(result.uri, metadata);
        toast.success('Metadata generated and uploaded successfully!', {
          id: loadingToast,
        });
      } else {
        toast.error(result.error || 'Failed to generate metadata', {
          id: loadingToast,
        });
      }
    } catch (error: any) {
      toast.error('Failed to generate metadata: ' + error.message, {
        id: loadingToast,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Instructions */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
        <p className="text-sm text-text-primary">
          <Sparkles className="h-4 w-4 inline text-primary mr-1" />
          Build rich metadata for your token with an image, description, and social links.
          All data is stored on IPFS for permanent, decentralized access.
        </p>
      </div>

      {/* Image Upload */}
      <ImageUpload value={imageUri} onChange={setImageUri} />

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          Description <span className="text-xs text-text-muted">(Optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your token's purpose, utility, or community..."
          rows={4}
          maxLength={500}
          className="
            w-full px-4 py-3 rounded-xl
            bg-bg-secondary border-2 border-border-light
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-primary
            transition-colors resize-none
          "
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-text-muted">
            A compelling description helps users understand your token
          </p>
          <p className="text-xs text-text-muted">
            {description.length}/500
          </p>
        </div>
      </div>

      {/* External URL */}
      <Input
        label={
          <span>
            External URL <span className="text-xs text-text-muted">(Optional)</span>
          </span>
        }
        placeholder="https://yourproject.com"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        helperText="Link to your project's main website or landing page"
      />

      {/* Social Links */}
      <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />

      {/* Generate Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerateMetadata}
          disabled={!canGenerate || generating}
          loading={generating}
          className="flex-1"
        >
          {generating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Metadata...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Metadata URI
            </>
          )}
        </Button>
      </div>

      {!canGenerate && (
        <p className="text-sm text-warning text-center">
          {!imageUri
            ? 'Upload an image to continue'
            : !tokenName || !tokenSymbol
            ? 'Token name and symbol are required'
            : 'Ready to generate metadata'}
        </p>
      )}

      {/* Preview */}
      {generatedMetadata && metadataUri && (
        <div className="pt-6 border-t border-border-light">
          <MetadataPreview metadata={generatedMetadata} metadataUri={metadataUri} />
        </div>
      )}
    </div>
  );
};
