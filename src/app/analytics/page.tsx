'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ApolloProvider } from '@apollo/client/react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select } from '@/components/ui';
import { useTransactionHistory } from '@/contexts/TransactionHistoryContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { usePositions } from '@/lib/hooks/usePositions';
import { PortfolioSummary, PositionsList } from '@/components/positions';
import { TradingChart } from '@/components/charts/TradingChart';
import { useChartData } from '@/lib/hooks/useChartData';
import { bitqueryClient } from '@/lib/services/bitquery';
import type { TransactionFilter, ProtocolType, ActionType, TransactionStatus } from '@/types/transactions';
import type { ChartType, TimeInterval } from '@/components/charts/TradingChart';
import { formatDistanceToNow } from 'date-fns';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

// Charts Tab Component
function ChartsTab({
  positions,
  loading,
  selectedPosition,
  onSelectPosition,
  chartType,
  chartInterval,
  onChartTypeChange,
  onIntervalChange,
}: {
  positions: any[];
  loading: boolean;
  selectedPosition: number | null;
  onSelectPosition: (index: number | null) => void;
  chartType: ChartType;
  chartInterval: TimeInterval;
  onChartTypeChange: (type: ChartType) => void;
  onIntervalChange: (interval: TimeInterval) => void;
}) {
  const position = selectedPosition !== null ? positions[selectedPosition] : null;

  const {
    data: chartData,
    loading: chartLoading,
    error: chartError,
    currentPrice,
    priceChange24h,
    refetch,
  } = useChartData({
    poolAddress: position?.poolAddress || '',
    interval: chartInterval,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Format price
  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  // Format percentage
  const formatPercent = (percent: number | null) => {
    if (percent === null) return '-';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Position Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Position to Chart</CardTitle>
          <CardDescription>View real-time price charts for your liquidity pools</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-foreground-muted mt-3">Loading positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-foreground-muted">No active positions found</p>
              <p className="text-sm text-foreground-secondary mt-2">Create a pool and seed liquidity to see charts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map((pos, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPosition(idx)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPosition === idx
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-background-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold">
                      {pos.baseSymbol}/{pos.quoteSymbol}
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary capitalize">
                      {pos.protocol}
                    </span>
                  </div>
                  <div className="text-sm text-foreground-muted">
                    Pool: {pos.poolAddress.slice(0, 8)}...{pos.poolAddress.slice(-6)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {position && (
        <>
          {/* Pool Info */}
          <Card hover gradient>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Pool</div>
                  <div className="text-2xl font-bold gradient-text">
                    {position.baseSymbol}/{position.quoteSymbol}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Current Price</div>
                  <div className="text-2xl font-bold">{formatPrice(currentPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-foreground-muted uppercase tracking-wide mb-1">24h Change</div>
                  <div className={`text-2xl font-bold ${priceChange24h && priceChange24h >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatPercent(priceChange24h)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Position Value</div>
                  <div className="text-2xl font-bold text-primary">
                    ${position.currentValueUSD?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {chartError && (
            <Card className="border-warning">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-warning">Chart data unavailable</div>
                    <div className="text-sm text-foreground-muted mt-1">{chartError.message}</div>
                    {chartError.message.includes('Authorization') && (
                      <div className="mt-2 text-xs text-foreground-muted">
                        Note: Bitquery API token is configured. On devnet, price data may be limited.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart */}
          <Card>
            <CardContent className="pt-6">
              <TradingChart
                data={chartData}
                chartType={chartType}
                interval={chartInterval}
                height={600}
                showVolume={true}
                loading={chartLoading}
                onIntervalChange={onIntervalChange}
                onChartTypeChange={onChartTypeChange}
              />
            </CardContent>
          </Card>

          {/* Chart Info */}
          {chartData.length > 0 && (
            <div className="text-center text-sm text-foreground-muted">
              Showing {chartData.length} candles • Last updated: {new Date().toLocaleTimeString()}
              {' • '}
              <button onClick={() => refetch()} className="text-primary hover:underline">
                Refresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { transactions, getAnalytics, exportData } = useTransactionHistory();

  // Position tracking
  const {
    positions,
    totalValue,
    totalPNL,
    totalPNLPercent,
    totalFeesEarned,
    loading: positionsLoading,
    error: positionsError,
    refreshPositions,
  } = usePositions();

  // Filter state
  const [filter, setFilter] = useState<TransactionFilter>({
    network,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'charts'>('positions');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [chartInterval, setChartInterval] = useState<TimeInterval>('15m');

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
              Track your positions, PNL, launches, and platform activity
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshPositions} variant="secondary" size="md" disabled={positionsLoading}>
              🔄 {positionsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={handleExport} variant="primary" size="md">
              💾 Export
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'positions'
                ? 'text-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Live Positions & PNL
            {activeTab === 'positions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'charts'
                ? 'text-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            📊 Interactive Charts
            {activeTab === 'charts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'transactions'
                ? 'text-primary'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Transaction History
            {activeTab === 'transactions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <PortfolioSummary
              totalValue={totalValue}
              totalPNL={totalPNL}
              totalPNLPercent={totalPNLPercent}
              totalFeesEarned={totalFeesEarned}
              positionCount={positions.length}
              loading={positionsLoading}
            />

            {/* Error State */}
            {positionsError && (
              <Card className="border-error/20 bg-error/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <p className="font-medium text-error">Failed to load positions</p>
                      <p className="text-sm text-foreground-muted">{positionsError}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Positions List */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Positions</h2>
              <PositionsList
                positions={positions}
                loading={positionsLoading}
                onClaim={(position) => {
                  toast.success(`Claiming fees for ${position.baseSymbol}/${position.quoteSymbol}...`);
                  // TODO: Implement claim logic
                }}
                onClose={(position) => {
                  toast.success(`Closing position ${position.baseSymbol}/${position.quoteSymbol}...`);
                  // TODO: Implement close logic
                }}
                onViewDetails={(position) => {
                  // TODO: Navigate to position details page
                  console.log('View details:', position);
                }}
              />
            </div>
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <ApolloProvider client={bitqueryClient}>
            <ChartsTab
              positions={positions}
              loading={positionsLoading}
              selectedPosition={selectedPosition}
              onSelectPosition={setSelectedPosition}
              chartType={chartType}
              chartInterval={chartInterval}
              onChartTypeChange={setChartType}
              onIntervalChange={setChartInterval}
            />
          </ApolloProvider>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">

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
        )}
      </div>
    </MainLayout>
  );
}
