'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ReferralDisplay } from '@/components/ui/ReferralDisplay';
import { referralAPI, userAPI, UserStats } from '@/lib/api/backend';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function ReferralDashboardPage() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch referral stats from backend
  useEffect(() => {
    if (!publicKey) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // First, ensure user exists in backend
        const userResponse = await userAPI.createUser({
          wallet_address: publicKey.toBase58(),
        });

        if (!userResponse.success) {
          console.error('Failed to create/get user:', userResponse.error);
        }

        // Then fetch referral stats
        const response = await referralAPI.getUserStats(publicKey.toBase58());

        if (response.success && response.data) {
          setStats(response.data);
        } else {
          console.error('Failed to fetch stats:', response.error);
          toast.error('Failed to load referral stats');
        }
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [publicKey]);

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

  if (loading && !stats) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground-muted">Loading referral dashboard...</p>
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
                {stats?.total_referral_earnings.toFixed(4) || '0.0000'} SOL
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                ≈ ${((stats?.total_referral_earnings || 0) * 100).toFixed(2)} USD
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Active Referrals</div>
              <div className="text-3xl font-bold text-primary">
                {stats?.active_referrals || 0}
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                Users who made transactions
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.conversion_rate.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-foreground-muted mt-2">
                Active / Total referrals
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Referral Code */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.referral_code ? (
              <div className="mb-6">
                <div className="flex items-center gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div>
                    <div className="text-sm text-foreground-muted mb-1">Your Code</div>
                    <div className="text-2xl font-bold font-mono gradient-text">
                      {stats.referral_code}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}?ref=${stats.referral_code}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Referral link copied!');
                    }}
                    className="ml-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-background-secondary rounded-lg border border-border">
                <p className="text-foreground-muted">Generating referral code...</p>
              </div>
            )}

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

        {/* Your Referrals */}
        {stats && stats.referrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals ({stats.total_referrals})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.referrals.map((referral, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="font-mono text-sm text-foreground">
                        {referral.referee_wallet.slice(0, 4)}...{referral.referee_wallet.slice(-4)}
                      </div>
                      <div className="text-xs text-foreground-muted mt-1">
                        Joined {new Date(referral.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">
                        {referral.total_earnings.toFixed(4)} SOL
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {referral.total_transactions} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Recent Earnings */}
        {stats && stats.recent_earnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recent_earnings.map((earning: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border border-border"
                  >
                    <div className="text-sm text-foreground-muted">
                      {new Date(earning.created_at).toLocaleString()}
                    </div>
                    <div className="font-bold text-success">
                      +{earning.referral_amount.toFixed(4)} SOL
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
