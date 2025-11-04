'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Analytics page now redirects to /analytics/positions
 * Individual analytics features are split into separate pages:
 * - /analytics/pools - Public Pools Explorer
 * - /analytics/positions - Positions & Health Monitor
 * - /settings/transactions - Transaction History
 */
export default function AnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/analytics/positions');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-foreground-muted">Redirecting to Positions...</p>
      </div>
    </div>
  );
}
