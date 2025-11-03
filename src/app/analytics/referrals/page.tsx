'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { ReferralDisplay } from '@/components/ui/ReferralDisplay';
import { useReferral } from '@/contexts/ReferralContext';

export default function ReferralDashboardPage() {
  const { publicKey } = useWallet();
  const { referralCode, referralEarnings } = useReferral();

  if (!publicKey) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔗</span>
            <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-foreground-muted">
              Connect your wallet to view your referral dashboard
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Referral Dashboard
          </h1>
          <p className="text-foreground-muted">
            Earn 10% of platform fees from users you refer
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover gradient>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Total Earnings</div>
              <div className="text-3xl font-bold text-success font-mono">
                {referralEarnings?.toFixed(4) || '0.0000'} SOL
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                ≈ ${((referralEarnings || 0) * 100).toFixed(2)} USD
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Active Referrals</div>
              <div className="text-3xl font-bold text-primary">
                0
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                Users who used your code
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-foreground">
                0%
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                Clicks to transactions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <ReferralDisplay />
            <div className="mt-6 p-4 bg-background-secondary rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">How It Works</h3>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  <span>Share your referral link with friends</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  <span>When they create pools or add liquidity, they save on fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  <span>You earn 10% of platform fees automatically sent to your wallet</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Card */}
        <Card>
          <CardHeader>
            <CardTitle>Referral Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💰</span>
                  <h4 className="font-semibold text-success">Passive Income</h4>
                </div>
                <p className="text-sm text-foreground-muted">
                  Earn 10% commission on all transactions from your referrals
                </p>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🚀</span>
                  <h4 className="font-semibold text-primary">No Limits</h4>
                </div>
                <p className="text-sm text-foreground-muted">
                  Refer unlimited users and earn from all their activity
                </p>
              </div>

              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚡</span>
                  <h4 className="font-semibold text-warning">Instant Payouts</h4>
                </div>
                <p className="text-sm text-foreground-muted">
                  Earnings are automatically sent to your wallet with each transaction
                </p>
              </div>

              <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📊</span>
                  <h4 className="font-semibold text-secondary">Real-time Tracking</h4>
                </div>
                <p className="text-sm text-foreground-muted">
                  Monitor your referrals and earnings in real-time on the dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics (Coming Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-foreground-muted mb-4">
                Detailed analytics, leaderboards, and tier progression will be available
                once the backend is fully deployed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Earnings Chart
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Leaderboard Ranking
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Tier System
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Transaction History
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Growth Insights
                </span>
              </div>
              <p className="text-sm text-foreground-muted mt-6">
                See <code className="bg-background-secondary px-2 py-1 rounded">BACKEND_IMPLEMENTATION_GUIDE.md</code> for deployment instructions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
