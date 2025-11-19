'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { PoolExplorer } from '@/components/pools/PoolExplorer';
import { toast } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function PublicPoolsPage() {
  const router = useRouter();

  return (
    <MainLayout>
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Public Pools Explorer</h1>
          <p className="text-foreground-muted">
            Browse DBC, DAMM, and DLMM pools created in the last 7 days
          </p>
        </div>

        {/* Pool Explorer */}
        <PoolExplorer
          onSelectPool={(pool) => {
            // Navigate to position page to view chart
            router.push(`/position/${pool.id}`);
          }}
        />
      </div>
    </MainLayout>
  );
}
