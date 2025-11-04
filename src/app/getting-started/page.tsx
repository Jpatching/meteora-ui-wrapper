'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Logo } from '@/components/ui';
import { useCountUp } from '@/hooks/useCountUp';

export default function Home() {
  // Count-up animations for stats
  const poolTypes = useCountUp({ end: 5, duration: 1500 });
  const totalFunctions = useCountUp({ end: 23, duration: 2000 });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          {/* Large Logo */}
          <div className="flex justify-center mb-6 animate-fade-in">
            <Logo size="xl" />
          </div>

          <h1 className="text-5xl font-bold gradient-text-animated hero-3d mb-3">
            Welcome to MetaTools
          </h1>
          <p className="text-foreground-secondary text-xl mb-6">
            Your comprehensive toolkit for Meteora protocols - create and manage pools with ease
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dlmm/create-pool">
              <Button variant="primary" size="lg">
                Create Your First Pool
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" size="lg">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover gradient>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
                  🏊
                </div>
                <div>
                  <p className="text-foreground-muted text-sm font-accent">Pool Types</p>
                  <p ref={poolTypes.ref as any} className="text-2xl font-bold text-foreground font-mono">{poolTypes.count} Protocols</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-2xl">
                  ⚡
                </div>
                <div>
                  <p className="text-foreground-muted text-sm font-accent">Total Actions</p>
                  <p ref={totalFunctions.ref as any} className="text-2xl font-bold text-foreground font-mono">{totalFunctions.count} Functions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center text-2xl">
                  💰
                </div>
                <div>
                  <p className="text-foreground-muted text-sm font-accent">Platform Fee</p>
                  <p className="text-xl font-bold text-foreground font-mono">From 0.0075 SOL</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card hover gradient>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center text-2xl">
                  🎯
                </div>
                <div>
                  <p className="text-foreground-muted text-sm font-accent">Status</p>
                  <p className="text-2xl font-bold text-foreground font-ui">Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Start Guide</CardTitle>
            <CardDescription>
              Follow these steps to start creating and managing Meteora pools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-background-tertiary border border-border-light">
                <h4 className="font-semibold text-foreground mb-2">1. Connect Your Wallet</h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Click "Select Wallet" in the top right corner
                </p>
                <p className="text-xs text-foreground-muted">
                  Supports Phantom, Solflare, Torus, Ledger, and more
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background-tertiary border border-border-light">
                <h4 className="font-semibold text-foreground mb-2">2. Select Network</h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Choose your preferred network from the header
                </p>
                <p className="text-xs text-foreground-muted">
                  Localnet for testing, Devnet for development, Mainnet for production
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background-tertiary border border-border-light">
                <h4 className="font-semibold text-foreground mb-2">3. Configure RPC (Optional)</h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Set custom RPC endpoints in Settings for better performance
                </p>
                <p className="text-xs text-foreground-muted">
                  Default endpoints work fine, premium RPCs offer faster speeds
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background-tertiary border border-border-light">
                <h4 className="font-semibold text-foreground mb-2">4. Create Your Pool</h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Select a protocol from the sidebar and fill in the form
                </p>
                <p className="text-xs text-foreground-muted">
                  Upload config files or enter parameters manually
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fees and Referrals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-warning/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Platform Fees
              </CardTitle>
              <CardDescription>How fees work on this platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Free Tier */}
              <div className="p-3 rounded-lg bg-background-tertiary border border-border-light">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground font-ui">Free Tier</h4>
                  <span className="text-lg font-bold text-success font-mono">0.0075 SOL</span>
                </div>
                <ul className="text-xs text-foreground-secondary space-y-1">
                  <li>• Standard mainnet RPC</li>
                  <li>• Rate limited</li>
                  <li>• Perfect for testing & casual use</li>
                </ul>
              </div>

              {/* Pro Tier */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-primary font-ui">Pro Tier</h4>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary font-ui">
                      Recommended
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary font-mono">0.0085 SOL</span>
                </div>
                <ul className="text-xs text-foreground-secondary space-y-1">
                  <li>• Premium Helius + Alchemy RPCs</li>
                  <li>• Higher rate limits</li>
                  <li>• Faster, more reliable transactions</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-border-primary">
                <p className="text-sm font-medium text-foreground mb-1 font-accent">Fee Distribution</p>
                <ul className="text-xs text-foreground-secondary space-y-1">
                  <li>• 10% - Referral rewards (if applicable)</li>
                  <li>• 45% - Token buyback program</li>
                  <li>• 45% - Treasury & development</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                Referral Program
              </CardTitle>
              <CardDescription>Earn rewards by referring users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">How It Works</p>
                <p className="text-xs text-foreground-secondary">
                  Share your unique referral code with others. When they create transactions, you earn 10% of the platform fee
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Your Benefits</p>
                <ul className="text-xs text-foreground-secondary space-y-1">
                  <li>• Automatic 10% commission on all referred transactions</li>
                  <li>• Track referrals in the Analytics page</li>
                  <li>• Rewards paid directly to your wallet</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-border-primary">
                <p className="text-xs text-foreground-muted">
                  Enter a referral code in any form to support a community member
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Protocol Cards */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Available Protocols</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dlmm/create-pool">
              <Card hover className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    DLMM Pools
                  </CardTitle>
                  <CardDescription>Dynamic Liquidity Market Maker</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground-secondary mb-4">
                    Create concentrated liquidity pools with customizable bin steps and dynamic fee distribution
                  </p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>• Create Pool (with or without new token)</li>
                    <li>• Seed Liquidity (LFG Strategy)</li>
                    <li>• Seed Liquidity (Single Bin)</li>
                    <li>• Enable/Disable Pool Status</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/damm-v2/create-balanced">
              <Card hover className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⚖️</span>
                    DAMM v2
                  </CardTitle>
                  <CardDescription>Dynamic Automated Market Maker v2</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground-secondary mb-4">
                    Advanced constant product AMM with flexible position management and dynamic fees
                  </p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>• Create Balanced Pool</li>
                    <li>• Create One-Sided Pool</li>
                    <li>• Add/Remove Liquidity</li>
                    <li>• Split, Claim Fees, Close Position</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/damm-v1/create-pool">
              <Card hover className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⚖️</span>
                    DAMM v1
                  </CardTitle>
                  <CardDescription>Dynamic Automated Market Maker v1</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground-secondary mb-4">
                    Original DAMM protocol with proven stability and liquidity locking features
                  </p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>• Create Pool</li>
                    <li>• Lock Liquidity</li>
                    <li>• Create Stake2Earn Pool</li>
                    <li>• Lock Stake2Earn Position</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dbc/create-config">
              <Card hover className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    DBC
                  </CardTitle>
                  <CardDescription>Dynamic Bonding Curve</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground-secondary mb-4">
                    Launch tokens with automated bonding curves and seamless migration to full AMM
                  </p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>• Create DBC Config & Pool</li>
                    <li>• Swap on Bonding Curve</li>
                    <li>• Claim Fees & Transfer Creator</li>
                    <li>• Migrate to DAMM v1/v2</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/alpha-vault/create">
              <Card hover className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🔐</span>
                    Alpha Vault
                  </CardTitle>
                  <CardDescription>Advanced Liquidity Management</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground-secondary mb-4">
                    Automated liquidity management vaults with optimized strategies
                  </p>
                  <ul className="text-sm text-foreground-muted space-y-1">
                    <li>• Create Alpha Vault</li>
                    <li>• Automated rebalancing</li>
                    <li>• Optimized fee collection</li>
                    <li>• Advanced strategies</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Platform Features */}
        <Card className="border-info/20 bg-info/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Platform Features
            </CardTitle>
            <CardDescription>Everything you need to manage your DeFi operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>📊</span>
                  Analytics Dashboard
                </h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Track all your transactions, referrals, and earnings in one place
                </p>
                <Link href="/analytics">
                  <span className="text-sm text-primary hover:underline cursor-pointer">
                    View Analytics →
                  </span>
                </Link>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>🔧</span>
                  Custom RPC Configuration
                </h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Configure custom RPC endpoints for better performance and reliability
                </p>
                <Link href="/settings/rpc">
                  <span className="text-sm text-primary hover:underline cursor-pointer">
                    Configure RPC →
                  </span>
                </Link>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>🔑</span>
                  Keypair Management
                </h4>
                <p className="text-sm text-foreground-secondary mb-2">
                  Generate and manage keypairs for local development and testing
                </p>
                <Link href="/settings/keypair">
                  <span className="text-sm text-primary hover:underline cursor-pointer">
                    Manage Keypairs →
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle>📚 Learn More</CardTitle>
            <CardDescription>Additional resources and documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://docs.meteora.ag"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg bg-background-tertiary border border-border-light hover:border-primary transition-colors"
              >
                <h4 className="font-semibold text-foreground mb-1">Meteora Documentation</h4>
                <p className="text-sm text-foreground-secondary">
                  Official docs for all Meteora protocols and features
                </p>
              </a>
              <a
                href="https://meteora.ag"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg bg-background-tertiary border border-border-light hover:border-primary transition-colors"
              >
                <h4 className="font-semibold text-foreground mb-1">Meteora Platform</h4>
                <p className="text-sm text-foreground-secondary">
                  Main Meteora platform for trading and managing pools
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
