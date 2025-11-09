'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import { usePositions } from '@/lib/hooks/usePositions';
import { PositionsList } from './PositionsList';
import { Card, Badge } from '@/components/ui';
import { rpcLimiter } from '@/lib/utils/rpcRateLimiter';

export function LivePositionsTracker() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const {
    positions,
    totalValue,
    totalPNL,
    totalPNLPercent,
    totalFeesEarned,
    loading,
    error,
    refreshPositions,
  } = usePositions(false); // Disable auto-refresh to save RPC costs

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [rpcStatus, setRPCStatus] = useState({ queueLength: 0, processing: 0, cacheSize: 0 });
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    await refreshPositions();
    setLastRefresh(new Date());
  }, [refreshPositions]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled || !publicKey) return;

    const interval = setInterval(() => {
      handleManualRefresh();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, publicKey, refreshInterval, handleManualRefresh]);

  // Update RPC status every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRPCStatus(rpcLimiter.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time since last refresh
  const getTimeSinceRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const [timeSince, setTimeSince] = useState(getTimeSinceRefresh());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSince(getTimeSinceRefresh());
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  if (!publicKey) {
    return (
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">👛</div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-foreground-muted">
          Connect your wallet to view and manage your positions across all Meteora protocols
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Devnet Testing Banner */}
      {network === 'devnet' && (
        <Card className="p-4 bg-gradient-to-r from-warning/20 to-primary/20 border-warning/50">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🧪</div>
            <div className="flex-1">
              <h3 className="font-semibold text-warning mb-1">Devnet Testing Mode</h3>
              <p className="text-xs text-foreground-muted">
                Testing live positions tracking with devnet pool: TESTA-TESTB (8BPM...E2w1)
              </p>
            </div>
            <a
              href="/pool/8BPMTaKEXhZ5UKkhLqaUDRFZt5emm9kjiUhSqS7ME2w1"
              className="px-3 py-1.5 bg-warning text-white rounded text-sm hover:bg-warning/80 transition-colors"
            >
              View Pool →
            </a>
          </div>
        </Card>
      )}

      {/* Portfolio Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-background-secondary to-background-tertiary">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">Your Positions</h2>
              {network && (
                <Badge variant={network === 'devnet' ? 'warning' : network === 'mainnet-beta' ? 'success' : 'default'}>
                  {network === 'mainnet-beta' ? 'Mainnet' : network.charAt(0).toUpperCase() + network.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground-muted">
              {positions.length} active position{positions.length !== 1 ? 's' : ''} across DLMM, DAMM v2, and DBC
            </p>
          </div>
          <div className="flex gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                autoRefreshEnabled
                  ? 'bg-success text-white hover:bg-success/80'
                  : 'bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80'
              }`}
              title={autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {autoRefreshEnabled ? 'Auto' : 'Manual'}
            </button>
            {/* Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Portfolio Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Total Value
            </p>
            <p className="text-2xl font-bold">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Total PNL
            </p>
            <p className={`text-2xl font-bold ${totalPNL >= 0 ? 'text-success' : 'text-error'}`}>
              {totalPNL >= 0 ? '+' : ''}${totalPNL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              PNL %
            </p>
            <p className={`text-2xl font-bold ${totalPNLPercent >= 0 ? 'text-success' : 'text-error'}`}>
              {totalPNLPercent >= 0 ? '+' : ''}{totalPNLPercent.toFixed(2)}%
            </p>
          </div>

          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fees Earned
            </p>
            <p className="text-2xl font-bold text-success">
              ${totalFeesEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Updated {timeSince}
              </span>
              <span className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${rpcStatus.processing > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                RPC: {rpcStatus.processing} active, {rpcStatus.queueLength} queued
              </span>
              <span className="flex items-center gap-1">
                💾 {rpcStatus.cacheSize} cached
              </span>
            </div>
            {autoRefreshEnabled && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-foreground-muted">Auto-refresh every</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1 bg-background-tertiary rounded text-foreground border border-border-light focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>2m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading positions...
            </div>
          )}
        </div>
      </Card>

      {/* Positions List */}
      <PositionsList
        positions={positions}
        loading={loading}
        onViewDetails={(position) => {
          // Navigate to pool detail page
          window.location.href = `/pool/${position.poolAddress}`;
        }}
      />

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-error/10 border-error">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-error font-semibold mb-1">Error Loading Positions</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <Card className="p-4 bg-background-secondary/50 border-border-light">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-foreground-muted">
            <p className="mb-2">
              <strong className="text-foreground">Cost-Effective Design:</strong> Positions are cached for 60 seconds to minimize RPC calls.
              Use the Refresh button to manually update your positions.
            </p>
            <p>
              This prevents excessive RPC usage (saves $ on API costs) while still providing accurate position tracking.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
