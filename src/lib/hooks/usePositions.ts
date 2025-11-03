/**
 * Unified hook to fetch and manage positions across all Meteora protocols
 * Aggregates positions from DLMM, DAMM v1, DAMM v2, DBC, and Alpha Vault
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/contexts/NetworkContext';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { useDAMMv2 } from '@/lib/meteora/useDAMMv2';
import { useDBC } from '@/lib/meteora/useDBC';
import { UserPosition } from '@/types/positions';
import { fetchMultipleTokenPrices } from '@/lib/prices';
import { calculatePNL, calculatePortfolioMetrics } from '@/lib/pnlCalculations';
import { getWalletPositions, addPosition, updatePosition } from '@/lib/positionStore';

export interface PositionWithPNL extends UserPosition {
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  unclaimedFeesUSD: number;
  healthScore: number;
  apr?: number;
  impermanentLoss?: number;
  impermanentLossPercent?: number;
}

export interface UsePositionsResult {
  positions: PositionWithPNL[];
  totalValue: number;
  totalPNL: number;
  totalPNLPercent: number;
  totalFeesEarned: number;
  loading: boolean;
  error: string | null;
  refreshPositions: () => Promise<void>;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
}

/**
 * Hook to fetch and track all user positions across protocols
 *
 * Features:
 * - Aggregates positions from all Meteora protocols
 * - Calculates real-time PNL using Jupiter prices
 * - Auto-refreshes at configurable intervals
 * - Persists positions to localStorage
 * - Provides portfolio-level metrics
 */
export function usePositions(autoRefresh = false, defaultInterval = 30000): UsePositionsResult {
  const { publicKey } = useWallet();
  const { network } = useNetwork();

  // Protocol hooks
  const dlmm = useDLMM();
  const dammv2 = useDAMMv2();
  const dbc = useDBC();

  // State
  const [positions, setPositions] = useState<PositionWithPNL[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(defaultInterval);

  /**
   * Fetch positions from all protocols and calculate PNL
   */
  const refreshPositions = useCallback(async () => {
    if (!publicKey) {
      setPositions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load cached positions from localStorage
      const cachedPositions = getWalletPositions(publicKey.toBase58());

      // Fetch fresh positions from all protocols in parallel
      // IMPORTANT: Call hook methods directly to avoid dependency issues
      const [dlmmPositions, dammv2Positions, dbcPositions] = await Promise.allSettled([
        dlmm.fetchUserPositions?.() || Promise.resolve([]),
        dammv2.fetchUserPositions?.() || Promise.resolve([]),
        dbc.fetchUserPositions?.() || Promise.resolve([]),
      ]);

      // Combine all positions
      const allPositions: UserPosition[] = [];

      if (dlmmPositions.status === 'fulfilled') {
        allPositions.push(...dlmmPositions.value.map((p: any) => ({
          id: `dlmm-${p.positionKey}`,
          walletAddress: publicKey.toBase58(),
          protocol: 'DLMM' as const,
          poolAddress: p.poolAddress,
          baseMint: p.baseMint,
          quoteMint: p.quoteMint,
          baseSymbol: p.baseSymbol,
          quoteSymbol: p.quoteSymbol,
          baseAmount: p.baseAmount,
          quoteAmount: p.quoteAmount,
          unclaimedFeesBase: p.unclaimedFeesBase || 0,
          unclaimedFeesQuote: p.unclaimedFeesQuote || 0,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          initialBaseAmount: p.baseAmount,
          initialQuoteAmount: p.quoteAmount,
          protocolSpecific: {
            binPositions: p.binPositions,
          },
        })));
      }

      if (dammv2Positions.status === 'fulfilled') {
        allPositions.push(...dammv2Positions.value.map((p: any) => ({
          id: `dammv2-${p.positionKey}`,
          walletAddress: publicKey.toBase58(),
          protocol: 'DAMM v2' as const,
          poolAddress: p.poolAddress,
          baseMint: p.baseMint,
          quoteMint: p.quoteMint,
          baseSymbol: p.baseSymbol || 'TOKEN',
          quoteSymbol: p.quoteSymbol || 'TOKEN',
          baseAmount: p.baseAmount || 0,
          quoteAmount: p.quoteAmount || 0,
          unclaimedFeesBase: p.unclaimedFeesBase || 0,
          unclaimedFeesQuote: p.unclaimedFeesQuote || 0,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          initialBaseAmount: p.baseAmount || 0,
          initialQuoteAmount: p.quoteAmount || 0,
        })));
      }

      if (dbcPositions.status === 'fulfilled') {
        allPositions.push(...dbcPositions.value.map((p: any) => ({
          id: `dbc-${p.positionKey}`,
          walletAddress: publicKey.toBase58(),
          protocol: 'DBC' as const,
          poolAddress: p.poolAddress,
          baseMint: p.baseMint,
          quoteMint: p.quoteMint,
          baseSymbol: p.baseSymbol || 'TOKEN',
          quoteSymbol: p.quoteSymbol || 'TOKEN',
          baseAmount: p.baseAmount || 0,
          quoteAmount: p.quoteAmount || 0,
          unclaimedFeesBase: 0,
          unclaimedFeesQuote: 0,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          initialBaseAmount: p.baseAmount || 0,
          initialQuoteAmount: p.quoteAmount || 0,
        })));
      }

      // Merge with cached positions (to preserve historical data like initialPrices)
      const mergedPositions = allPositions.map(pos => {
        const cached = cachedPositions.find(c =>
          c.protocol === pos.protocol && c.poolAddress === pos.poolAddress
        );
        return cached ? { ...cached, ...pos, lastUpdated: Date.now() } : pos;
      });

      // Fetch prices for all unique mints
      const uniqueMints = Array.from(new Set([
        ...mergedPositions.map(p => p.baseMint),
        ...mergedPositions.map(p => p.quoteMint),
      ]));

      const prices = await fetchMultipleTokenPrices(uniqueMints);

      // Calculate PNL for each position
      const positionsWithPNL: PositionWithPNL[] = mergedPositions.map(position => {
        const basePriceUSD = prices.get(position.baseMint) || 0;
        const quotePriceUSD = prices.get(position.quoteMint) || 0;

        const pnlResult = calculatePNL(position, basePriceUSD, quotePriceUSD);

        return {
          ...position,
          currentValue: pnlResult.currentValue,
          pnl: pnlResult.totalPNL,
          pnlPercent: pnlResult.totalPNLPercent,
          unclaimedFeesUSD: pnlResult.unclaimedFeesUSD,
          healthScore: pnlResult.healthScore,
          apr: pnlResult.apr,
          impermanentLoss: pnlResult.impermanentLoss,
          impermanentLossPercent: pnlResult.impermanentLossPercent,
        };
      });

      // Update localStorage
      positionsWithPNL.forEach(pos => {
        const existing = cachedPositions.find(c => c.id === pos.id);
        if (existing) {
          updatePosition(pos.id, pos);
        } else {
          addPosition(pos);
        }
      });

      setPositions(positionsWithPNL);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');

      // Fall back to cached positions if fetch fails
      if (publicKey) {
        const cached = getWalletPositions(publicKey.toBase58());
        setPositions(cached as PositionWithPNL[]);
      }
    } finally {
      setLoading(false);
    }
    // FIXED: Removed dlmm, dammv2, dbc from dependencies to prevent infinite recursion
    // These hooks return new object references on every render, causing the callback to change infinitely
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, network]);

  // Initial fetch on wallet connect
  useEffect(() => {
    if (!publicKey) return;
    refreshPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]); // Only fetch when wallet connects/changes

  /**
   * AUTO-REFRESH DISABLED TO PREVENT RPC SPAM
   *
   * Previous implementation would make 3+ getProgramAccounts calls every 30 seconds,
   * resulting in excessive RPC usage and potential rate limiting.
   *
   * To re-enable auto-refresh:
   * 1. Implement WebSocket account subscriptions instead of polling
   * 2. Use on-chain account change notifications
   * 3. Increase refresh interval to 5+ minutes minimum
   *
   * Current approach: Manual refresh only via refreshPositions() function
   */

  // Calculate portfolio metrics
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPNL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalInitialValue = positions.reduce(
    (sum, p) => sum + (p.initialValue || 0),
    0
  );
  const totalPNLPercent = totalInitialValue > 0
    ? (totalPNL / totalInitialValue) * 100
    : 0;
  const totalFeesEarned = positions.reduce(
    (sum, p) => sum + p.unclaimedFeesUSD,
    0
  );

  return {
    positions,
    totalValue,
    totalPNL,
    totalPNLPercent,
    totalFeesEarned,
    loading,
    error,
    refreshPositions,
    refreshInterval,
    setRefreshInterval,
  };
}
