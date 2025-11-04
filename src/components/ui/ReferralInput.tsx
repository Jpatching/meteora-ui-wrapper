'use client';

import { useState, useEffect } from 'react';
import { Input } from './Input';
import { useReferral } from '@/contexts/ReferralContext';
import { isValidReferralCode } from '@/lib/referrals';

interface ReferralInputProps {
  value?: string;
  onChange?: (code: string) => void;
  className?: string;
}

/**
 * ReferralInput Component
 *
 * Input field for referral codes on forms
 * Auto-fills from URL or stored referral code
 */
export function ReferralInput({ value, onChange, className = '' }: ReferralInputProps) {
  const { activeReferralCode, referrerWallet, enabled } = useReferral();
  const [localValue, setLocalValue] = useState(value || '');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local value when active code changes
  useEffect(() => {
    if (activeReferralCode && !value && mounted) {
      setLocalValue(activeReferralCode);
      if (onChange) {
        onChange(activeReferralCode);
      }
    }
  }, [activeReferralCode, value, onChange, mounted]);

  // Don't render if not mounted or referrals disabled
  if (!mounted || !enabled) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().trim();
    setLocalValue(newValue);

    // Validate
    if (newValue && !isValidReferralCode(newValue)) {
      setError('Invalid referral code format (8 characters)');
    } else {
      setError(null);
    }

    if (onChange) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setError(null);
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Input
          label="Referral Code (Optional)"
          placeholder="Enter code"
          value={localValue}
          onChange={handleChange}
          error={error || undefined}
          helperText={
            referrerWallet
              ? `✓ Valid code - You'll get 10% fee discount!`
              : 'Get 10% discount on fees with a referral code'
          }
          className="flex-1"
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-6 px-3 py-2 text-sm text-foreground-secondary hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {referrerWallet && (
        <div className="mt-2 p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success">
            ✓ Referral code applied! You'll save 10% on platform fees.
          </p>
        </div>
      )}
    </div>
  );
}
