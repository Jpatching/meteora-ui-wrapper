'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Tooltip, Badge } from '@/components/ui';
import { MetadataBuilder } from '@/components/metadata/MetadataBuilder';
import { loadMetadataServiceConfig } from '@/lib/fees';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface TokenCreationData {
  createNew: boolean;
  name: string;
  symbol: string;
  uri: string;
  decimals: string;
  supply: string;
  baseMint: string;
}

interface TokenCreationSectionProps {
  data: TokenCreationData;
  onChange: (data: Partial<TokenCreationData>) => void;
  onMetadataServiceToggle?: (useService: boolean) => void;
  metadataServiceEnabled?: boolean;
}

export function TokenCreationSection({
  data,
  onChange,
  onMetadataServiceToggle,
  metadataServiceEnabled = false
}: TokenCreationSectionProps) {
  const [useMetadataService, setUseMetadataService] = useState(false);
  const metadataConfig = loadMetadataServiceConfig();
  const metadataFeeSOL = metadataConfig.feeLamports / LAMPORTS_PER_SOL;

  const handleMetadataServiceToggle = (checked: boolean) => {
    setUseMetadataService(checked);
    onMetadataServiceToggle?.(checked);
    if (!checked) {
      // Clear URI when switching from metadata builder to manual
      onChange({ uri: '' });
    }
  };

  const handleMetadataGenerated = (metadataUri: string) => {
    onChange({ uri: metadataUri });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Configuration</CardTitle>
        <CardDescription>
          Create a new token or use an existing one as the base token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Token Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary">
          <input
            type="checkbox"
            id="createNew"
            checked={data.createNew}
            onChange={(e) => onChange({ createNew: e.target.checked })}
            className="w-5 h-5 text-primary rounded focus:ring-primary"
          />
          <label htmlFor="createNew" className="text-sm font-medium cursor-pointer">
            Create a new token
          </label>
          <Tooltip content="Check this to create a new SPL token for your pool">
            <span className="text-foreground-muted cursor-help">ℹ️</span>
          </Tooltip>
        </div>

        {data.createNew ? (
          <div className="space-y-4">
            {/* Basic Token Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Token Name"
                placeholder="My Awesome Token"
                required
                value={data.name}
                onChange={(e) => onChange({ name: e.target.value })}
                helperText="The full name of your token"
              />
              <Input
                label="Token Symbol"
                placeholder="MAT"
                required
                value={data.symbol}
                onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
                maxLength={10}
                helperText="The ticker symbol (e.g., SOL, USDC)"
              />
              <Input
                label="Decimals"
                type="number"
                required
                value={data.decimals}
                onChange={(e) => onChange({ decimals: e.target.value })}
                min="0"
                max="9"
                helperText="Token decimal places (usually 9)"
              />
              <Input
                label="Total Supply"
                type="number"
                required
                value={data.supply}
                onChange={(e) => onChange({ supply: e.target.value })}
                helperText="Total token supply"
              />
            </div>

            {/* Metadata Service Toggle */}
            {metadataServiceEnabled && metadataConfig.enabled && (
              <div className="border-t border-border-primary pt-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useMetadataService"
                      checked={useMetadataService}
                      onChange={(e) => handleMetadataServiceToggle(e.target.checked)}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <div>
                      <label htmlFor="useMetadataService" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        Use Metadata Service
                        <Badge variant="purple">+ {metadataFeeSOL.toFixed(4)} SOL</Badge>
                      </label>
                      <p className="text-xs text-foreground-secondary mt-0.5">
                        Automated metadata builder with IPFS upload included
                      </p>
                    </div>
                  </div>
                  <Tooltip content="Optionally pay a small fee to use our metadata builder and IPFS hosting. Uncheck to provide your own metadata URI.">
                    <span className="text-foreground-muted cursor-help">ℹ️</span>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Metadata Input */}
            {useMetadataService ? (
              <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
                <MetadataBuilder
                  tokenName={data.name}
                  tokenSymbol={data.symbol}
                  onMetadataGenerated={handleMetadataGenerated}
                />
              </div>
            ) : (
              <Input
                label="Metadata URI"
                placeholder="https://... or ipfs://..."
                type="url"
                required
                value={data.uri}
                onChange={(e) => onChange({ uri: e.target.value })}
                helperText="JSON metadata URI (logo, description, etc.)"
              />
            )}
          </div>
        ) : (
          <Input
            label="Base Token Mint Address"
            placeholder="TokenMint111..."
            required
            value={data.baseMint}
            onChange={(e) => onChange({ baseMint: e.target.value })}
            className="font-mono text-sm"
            helperText="The address of your existing SPL token"
          />
        )}
      </CardContent>
    </Card>
  );
}
