'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Tooltip } from '@/components/ui';

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
}

export function TokenCreationSection({ data, onChange }: TokenCreationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Configuration</CardTitle>
        <CardDescription>
          Create a new token or use an existing one as the base token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
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
              label="Metadata URI"
              placeholder="https://..."
              type="url"
              required
              value={data.uri}
              onChange={(e) => onChange({ uri: e.target.value })}
              className="col-span-2"
              helperText="JSON metadata URI (logo, description, etc.)"
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
