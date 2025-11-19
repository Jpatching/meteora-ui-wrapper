/**
 * Hook to automatically index devnet pools when accessed
 * Triggers backend auto-indexing if pool data is missing
 */

'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface AutoIndexResult {
  indexed: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Automatically index a devnet pool if it's not in the database
 * Only runs on devnet and only if pool data returns empty
 */
export function useAutoIndexPool(
  poolAddress: string | null,
  poolType?: 'dlmm' | 'damm-v2'
): AutoIndexResult {
  const { network } = useNetwork();
  const [indexed, setIndexed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only auto-index on devnet
    if (network !== 'devnet' || !poolAddress || indexed) {
      return;
    }

    async function checkAndIndexPool() {
      try {
        setLoading(true);
        setError(null);

        // First, check if pool exists in database
        const checkResponse = await fetch(
          `${BACKEND_URL}/api/pools/${poolAddress}?network=devnet`
        );

        // If pool exists, don't auto-index
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          if (data.success && data.data) {
            console.log(`[AutoIndex] Pool ${poolAddress} already indexed`);
            setIndexed(true);
            setLoading(false);
            return;
          }
        }

        // Pool doesn't exist - trigger auto-indexing
        console.log(`[AutoIndex] Auto-indexing devnet pool: ${poolAddress}`);

        const indexResponse = await fetch(`${BACKEND_URL}/api/pools/auto-index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: poolAddress, poolType }),
        });

        const result = await indexResponse.json();

        if (result.success) {
          console.log(`[AutoIndex] ✅ Successfully indexed pool ${poolAddress}`);
          setIndexed(true);
        } else {
          console.error(`[AutoIndex] ❌ Failed to index pool:`, result.error);
          setError(result.error || 'Failed to index pool');
        }
      } catch (err: any) {
        console.error(`[AutoIndex] ❌ Error:`, err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkAndIndexPool();
  }, [poolAddress, poolType, network, indexed]);

  return { indexed, loading, error };
}
