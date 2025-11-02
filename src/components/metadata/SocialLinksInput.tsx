'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui';
import {
  Twitter,
  MessageCircle,
  Send,
  Github,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TokenMetadata } from '@/lib/storage/ipfs-client';

interface SocialLinksInputProps {
  value: TokenMetadata['social'];
  onChange: (social: TokenMetadata['social']) => void;
}

export const SocialLinksInput: React.FC<SocialLinksInputProps> = ({
  value = {},
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (platform: keyof NonNullable<TokenMetadata['social']>, url: string) => {
    onChange({
      ...value,
      [platform]: url || undefined,
    });
  };

  const validateUrl = (url: string, platform: string): boolean => {
    if (!url) return true; // Empty is valid (optional field)

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

      // Platform-specific validation
      switch (platform) {
        case 'twitter':
          return urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com');
        case 'discord':
          return urlObj.hostname.includes('discord.gg') || urlObj.hostname.includes('discord.com');
        case 'telegram':
          return urlObj.hostname.includes('t.me') || urlObj.hostname.includes('telegram.me');
        case 'github':
          return urlObj.hostname.includes('github.com');
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const getPlaceholder = (platform: string): string => {
    switch (platform) {
      case 'twitter':
        return 'https://twitter.com/yourproject';
      case 'discord':
        return 'https://discord.gg/invite-code';
      case 'telegram':
        return 'https://t.me/yourproject';
      case 'github':
        return 'https://github.com/yourproject';
      case 'website':
        return 'https://yourproject.com';
      default:
        return '';
    }
  };

  const hasAnyLinks = Object.values(value || {}).some(v => v);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-secondary">
          Social Links <span className="text-xs text-text-muted">(Optional)</span>
        </label>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {hasAnyLinks ? 'Edit' : 'Add'} social links
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 p-4 rounded-lg bg-bg-tertiary border border-border-light">
          {/* Twitter */}
          <div className="space-y-2">
            <Input
              label={
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                  <span>Twitter / X</span>
                </div>
              }
              placeholder={getPlaceholder('twitter')}
              value={value?.twitter || ''}
              onChange={(e) => handleChange('twitter', e.target.value)}
              error={
                value?.twitter && !validateUrl(value.twitter, 'twitter')
                  ? 'Please enter a valid Twitter/X URL'
                  : undefined
              }
            />
          </div>

          {/* Discord */}
          <div className="space-y-2">
            <Input
              label={
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#5865F2]" />
                  <span>Discord</span>
                </div>
              }
              placeholder={getPlaceholder('discord')}
              value={value?.discord || ''}
              onChange={(e) => handleChange('discord', e.target.value)}
              error={
                value?.discord && !validateUrl(value.discord, 'discord')
                  ? 'Please enter a valid Discord invite URL'
                  : undefined
              }
            />
          </div>

          {/* Telegram */}
          <div className="space-y-2">
            <Input
              label={
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#0088cc]" />
                  <span>Telegram</span>
                </div>
              }
              placeholder={getPlaceholder('telegram')}
              value={value?.telegram || ''}
              onChange={(e) => handleChange('telegram', e.target.value)}
              error={
                value?.telegram && !validateUrl(value.telegram, 'telegram')
                  ? 'Please enter a valid Telegram URL'
                  : undefined
              }
            />
          </div>

          {/* GitHub */}
          <div className="space-y-2">
            <Input
              label={
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-text-primary" />
                  <span>GitHub</span>
                </div>
              }
              placeholder={getPlaceholder('github')}
              value={value?.github || ''}
              onChange={(e) => handleChange('github', e.target.value)}
              error={
                value?.github && !validateUrl(value.github, 'github')
                  ? 'Please enter a valid GitHub URL'
                  : undefined
              }
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Input
              label={
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Website</span>
                </div>
              }
              placeholder={getPlaceholder('website')}
              value={value?.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              error={
                value?.website && !validateUrl(value.website, 'website')
                  ? 'Please enter a valid website URL'
                  : undefined
              }
            />
          </div>

          <p className="text-xs text-text-muted mt-2">
            Adding social links helps build trust and community around your token.
          </p>
        </div>
      )}

      {!expanded && hasAnyLinks && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-bg-tertiary border border-border-light">
          {value?.twitter && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary text-xs">
              <Twitter className="h-3 w-3 text-[#1DA1F2]" />
              <span className="text-text-secondary">Twitter</span>
            </div>
          )}
          {value?.discord && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary text-xs">
              <MessageCircle className="h-3 w-3 text-[#5865F2]" />
              <span className="text-text-secondary">Discord</span>
            </div>
          )}
          {value?.telegram && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary text-xs">
              <Send className="h-3 w-3 text-[#0088cc]" />
              <span className="text-text-secondary">Telegram</span>
            </div>
          )}
          {value?.github && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary text-xs">
              <Github className="h-3 w-3 text-text-primary" />
              <span className="text-text-secondary">GitHub</span>
            </div>
          )}
          {value?.website && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary text-xs">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-text-secondary">Website</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
