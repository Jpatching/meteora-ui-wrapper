'use client';

import { Select } from '@/components/ui';

interface QuoteMintSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
}

export function QuoteMintSelector({
  value,
  onChange,
  label = 'Quote Token',
  required = true,
  helperText = 'The token to pair with (usually SOL or stablecoin)',
}: QuoteMintSelectorProps) {
  return (
    <Select
      label={label}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
    >
      <option value="So11111111111111111111111111111111111111112">SOL</option>
      <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
      <option value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">USDT</option>
    </Select>
  );
}
