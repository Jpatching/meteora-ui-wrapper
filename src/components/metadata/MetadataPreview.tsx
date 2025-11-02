'use client';

import React, { useState } from 'react';
import { TokenMetadata } from '@/lib/storage/ipfs-client';
import { Button } from '@/components/ui';
import {
  Copy,
  Check,
  Eye,
  Code,
  Twitter,
  MessageCircle,
  Send,
  Github,
  Globe,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MetadataPreviewProps {
  metadata: TokenMetadata;
  metadataUri?: string;
}

export const MetadataPreview: React.FC<MetadataPreviewProps> = ({
  metadata,
  metadataUri,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [copied, setCopied] = useState(false);

  const handleCopyUri = () => {
    if (metadataUri) {
      navigator.clipboard.writeText(metadataUri);
      setCopied(true);
      toast.success('URI copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatIPFSUri = (uri: string) => {
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      return `https://nftstorage.link/ipfs/${cid}`;
    }
    return uri;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-text-primary">
          Metadata Preview
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('visual')}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${
                viewMode === 'visual'
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }
            `}
          >
            <Eye className="h-4 w-4 inline mr-1" />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setViewMode('json')}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${
                viewMode === 'json'
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }
            `}
          >
            <Code className="h-4 w-4 inline mr-1" />
            JSON
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div className="p-6 rounded-xl bg-bg-tertiary border border-border-light space-y-6">
          {/* Image and Basic Info */}
          <div className="flex gap-6">
            {metadata.image && (
              <div className="flex-shrink-0">
                <img
                  src={formatIPFSUri(metadata.image)}
                  alt={metadata.name}
                  className="w-32 h-32 rounded-lg object-cover border-2 border-border-light"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wide">
                  Name
                </label>
                <p className="text-lg font-semibold text-text-primary">
                  {metadata.name}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wide">
                  Symbol
                </label>
                <p className="text-base font-mono text-text-primary">
                  {metadata.symbol}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {metadata.description && (
            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide">
                Description
              </label>
              <p className="text-sm text-text-secondary mt-1">
                {metadata.description}
              </p>
            </div>
          )}

          {/* Social Links */}
          {metadata.social && Object.keys(metadata.social).length > 0 && (
            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide mb-2 block">
                Social Links
              </label>
              <div className="flex flex-wrap gap-2">
                {metadata.social.twitter && (
                  <a
                    href={metadata.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-light transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                    <span className="text-sm text-text-primary">Twitter</span>
                    <ExternalLink className="h-3 w-3 text-text-muted" />
                  </a>
                )}
                {metadata.social.discord && (
                  <a
                    href={metadata.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-light transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-[#5865F2]" />
                    <span className="text-sm text-text-primary">Discord</span>
                    <ExternalLink className="h-3 w-3 text-text-muted" />
                  </a>
                )}
                {metadata.social.telegram && (
                  <a
                    href={metadata.social.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-light transition-colors"
                  >
                    <Send className="h-4 w-4 text-[#0088cc]" />
                    <span className="text-sm text-text-primary">Telegram</span>
                    <ExternalLink className="h-3 w-3 text-text-muted" />
                  </a>
                )}
                {metadata.social.github && (
                  <a
                    href={metadata.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-light transition-colors"
                  >
                    <Github className="h-4 w-4 text-text-primary" />
                    <span className="text-sm text-text-primary">GitHub</span>
                    <ExternalLink className="h-3 w-3 text-text-muted" />
                  </a>
                )}
                {metadata.social.website && (
                  <a
                    href={metadata.social.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-light transition-colors"
                  >
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm text-text-primary">Website</span>
                    <ExternalLink className="h-3 w-3 text-text-muted" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* External URL */}
          {metadata.external_url && (
            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide">
                External URL
              </label>
              <a
                href={metadata.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                {metadata.external_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <pre className="p-4 rounded-xl bg-bg-secondary border border-border-light overflow-x-auto text-xs">
            <code className="text-text-primary font-mono">
              {JSON.stringify(metadata, null, 2)}
            </code>
          </pre>
        </div>
      )}

      {/* Metadata URI */}
      {metadataUri && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/30">
          <label className="text-xs text-success uppercase tracking-wide mb-2 block">
            Metadata URI (IPFS)
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm text-text-primary font-mono overflow-x-auto">
              {metadataUri}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUri}
              className="flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
