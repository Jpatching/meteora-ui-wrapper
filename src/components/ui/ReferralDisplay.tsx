'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { useReferral } from '@/contexts/ReferralContext';
import toast from 'react-hot-toast';

interface ReferralDisplayProps {
  variant?: 'card' | 'compact';
  className?: string;
}

/**
 * ReferralDisplay Component
 *
 * Shows user's referral code and link for sharing
 * Includes copy-to-clipboard functionality
 */
export function ReferralDisplay({ variant = 'card', className = '' }: ReferralDisplayProps) {
  const { myReferralCode, myReferralLink, myEarnings, enabled } = useReferral();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted || !enabled || !myReferralCode) {
    return null;
  }

  const handleCopyCode = () => {
    if (myReferralCode) {
      navigator.clipboard.writeText(myReferralCode);
      setCopied('code');
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyLink = () => {
    if (myReferralLink) {
      navigator.clipboard.writeText(myReferralLink);
      setCopied('link');
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1">
          <p className="text-sm text-foreground-secondary">Your Referral Code</p>
          <p className="font-mono font-bold text-primary">{myReferralCode}</p>
        </div>
        <Button onClick={handleCopyCode} variant="outline" size="sm">
          {copied === 'code' ? '✓ Copied' : '📋 Copy'}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎁</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-primary mb-2">Your Referral Code</h3>
            <p className="text-sm text-foreground-secondary mb-4">
              Share your code and earn 10% of platform fees when friends launch pools!
            </p>

            {/* Referral Code */}
            <div className="mb-4">
              <p className="text-xs text-foreground-secondary mb-1">Referral Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-background-tertiary border border-border-primary">
                  <p className="font-mono font-bold text-2xl text-primary text-center">
                    {myReferralCode}
                  </p>
                </div>
                <Button onClick={handleCopyCode} variant="primary" size="md">
                  {copied === 'code' ? '✓ Copied' : '📋 Copy'}
                </Button>
              </div>
            </div>

            {/* Referral Link */}
            <div className="mb-4">
              <p className="text-xs text-foreground-secondary mb-1">Referral Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-background-tertiary border border-border-primary overflow-hidden">
                  <p className="font-mono text-sm text-foreground-secondary truncate">
                    {myReferralLink}
                  </p>
                </div>
                <Button onClick={handleCopyLink} variant="outline" size="md">
                  {copied === 'link' ? '✓ Copied' : '📋 Copy'}
                </Button>
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-primary">
              <div>
                <p className="text-xs text-foreground-secondary">Total Referrals</p>
                <p className="text-xl font-bold text-primary">{myEarnings.totalReferrals}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-secondary">Earnings</p>
                <p className="text-xl font-bold text-success">
                  {(myEarnings.totalEarnings / 1000000000).toFixed(4)} SOL
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
