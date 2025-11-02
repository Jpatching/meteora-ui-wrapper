'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select } from '@/components/ui';
import { useTransactionHistory } from '@/contexts/TransactionHistoryContext';
import { useNetwork } from '@/contexts/NetworkContext';
import type { TransactionFilter, ProtocolType, ActionType, TransactionStatus } from '@/types/transactions';
import { formatDistanceToNow } from 'date-fns';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { transactions, getAnalytics, exportData } = useTransactionHistory();

  // Filter state
  const [filter, setFilter] = useState<TransactionFilter>({
    network,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Get user's transactions
  const userTransactions = useMemo(() => {
    if (!publicKey) return [];
    return transactions
      .filter((t) => t.walletAddress.toLowerCase() === publicKey.toBase58().toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, publicKey]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = userTransactions;

    if (filter.protocol) {
      filtered = filtered.filter((t) => t.protocol === filter.protocol);
    }
    if (filter.action) {
      filtered = filtered.filter((t) => t.action === filter.action);
    }
    if (filter.status) {
      filtered = filtered.filter((t) => t.status === filter.status);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.signature.toLowerCase().includes(search) ||
          t.poolAddress?.toLowerCase().includes(search) ||
          t.tokenAddress?.toLowerCase().includes(search) ||
          t.label?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [userTransactions, filter, searchTerm]);

  // Get analytics
  const analytics = useMemo(() => {
    if (!publicKey) return null;
    return getAnalytics(publicKey.toBase58());
  }, [publicKey, getAnalytics, transactions]);

  const handleExport = () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }
    exportData(publicKey.toBase58());
    toast.success('Transaction history exported!');
  };

  if (!publicKey) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-4xl">🔌</span>
                <div>
                  <p className="text-lg font-medium text-warning mb-2">Wallet Not Connected</p>
                  <p className="text-foreground-secondary">
                    Connect your wallet to view your transaction history and analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Analytics Dashboard</h1>
            <p className="text-foreground-secondary mt-2">
              Track your launches, pools, and platform activity
            </p>
          </div>
          <Button onClick={handleExport} variant="primary" size="md">
            💾 Export History
          </Button>
        </div>

        {/* Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Launches */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-secondary">Total Launches</p>
                    <p className="text-3xl font-bold text-primary mt-1">
                      {analytics.totalTransactions}
                    </p>
                  </div>
                  <span className="text-4xl">🚀</span>
                </div>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-secondary">Success Rate</p>
                    <p className="text-3xl font-bold text-success mt-1">
                      {analytics.totalTransactions > 0
                        ? Math.round((analytics.successfulTransactions / analytics.totalTransactions) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                  <span className="text-4xl">✅</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Pools Created */}
            <Card className="border-secondary/20 bg-secondary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-secondary">Pools Created</p>
                    <p className="text-3xl font-bold text-secondary mt-1">
                      {analytics.totalPools}
                    </p>
                  </div>
                  <span className="text-4xl">💧</span>
                </div>
              </CardContent>
            </Card>

            {/* Fees Paid */}
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-secondary">Fees Paid</p>
                    <p className="text-3xl font-bold text-warning mt-1">
                      {(analytics.totalFeesPaid / LAMPORTS_PER_SOL).toFixed(2)} SOL
                    </p>
                  </div>
                  <span className="text-4xl">💰</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Protocol Breakdown */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Protocol Breakdown</CardTitle>
              <CardDescription>Distribution of your launches by protocol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(analytics.protocolBreakdown).map(([protocol, count]) => (
                  <div
                    key={protocol}
                    className="p-4 rounded-lg bg-background-tertiary border border-border-primary hover:border-primary/50 transition-colors"
                  >
                    <p className="text-sm text-foreground-secondary capitalize">{protocol}</p>
                    <p className="text-2xl font-bold text-primary mt-1">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Filter and search your launches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <Input
                placeholder="Search signature, pool, token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Protocol Filter */}
              <Select
                value={filter.protocol || ''}
                onChange={(e) => setFilter({ ...filter, protocol: e.target.value as ProtocolType || undefined })}
              >
                <option value="">All Protocols</option>
                <option value="dlmm">DLMM</option>
                <option value="damm-v1">DAMM v1</option>
                <option value="damm-v2">DAMM v2</option>
                <option value="dbc">DBC</option>
                <option value="alpha-vault">Alpha Vault</option>
                <option value="settings">Settings</option>
              </Select>

              {/* Status Filter */}
              <Select
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as TransactionStatus || undefined })}
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </Select>

              {/* Clear Filters */}
              <Button
                onClick={() => {
                  setFilter({ network });
                  setSearchTerm('');
                }}
                variant="outline"
                size="md"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <span className="text-6xl mb-4 block">📊</span>
                  <p className="text-lg font-medium text-foreground-secondary">
                    {searchTerm || filter.protocol || filter.status
                      ? 'No transactions match your filters'
                      : 'No transaction history yet'}
                  </p>
                  <p className="text-sm text-foreground-secondary mt-2">
                    {searchTerm || filter.protocol || filter.status
                      ? 'Try adjusting your search or filters'
                      : 'Start by creating a pool or token!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((tx) => (
              <Card key={tx.id} hover className="cursor-pointer" onClick={() => {
                window.open(`https://solscan.io/tx/${tx.signature}?cluster=${network}`, '_blank');
              }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Transaction Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'success'
                              ? 'bg-success/10 text-success'
                              : tx.status === 'failed'
                              ? 'bg-error/10 text-error'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {tx.status}
                        </span>

                        {/* Protocol Badge */}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                          {tx.protocol}
                        </span>

                        {/* Time */}
                        <span className="text-xs text-foreground-secondary">
                          {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                        </span>
                      </div>

                      {/* Action */}
                      <p className="font-medium text-lg mb-1 capitalize">
                        {tx.action.replace(/-/g, ' ')}
                      </p>

                      {/* Signature */}
                      <p className="text-sm text-foreground-secondary font-mono truncate">
                        {tx.signature}
                      </p>

                      {/* Addresses */}
                      {(tx.poolAddress || tx.tokenAddress) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {tx.poolAddress && (
                            <span className="text-foreground-secondary">
                              Pool: <span className="font-mono">{tx.poolAddress.slice(0, 8)}...</span>
                            </span>
                          )}
                          {tx.tokenAddress && (
                            <span className="text-foreground-secondary">
                              Token: <span className="font-mono">{tx.tokenAddress.slice(0, 8)}...</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Fee Info */}
                    {tx.platformFee && tx.platformFee > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-foreground-secondary">Platform Fee</p>
                        <p className="text-sm font-medium text-warning">
                          {(tx.platformFee / LAMPORTS_PER_SOL).toFixed(3)} SOL
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Info */}
        {filteredTransactions.length > 0 && (
          <div className="text-center text-sm text-foreground-secondary">
            Showing {filteredTransactions.length} of {userTransactions.length} transactions
          </div>
        )}
      </div>
    </MainLayout>
  );
}
