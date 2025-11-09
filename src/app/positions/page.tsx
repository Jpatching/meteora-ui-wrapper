'use client';

import { MainLayout } from '@/components/layout';
import { LivePositionsTracker } from '@/components/positions/LivePositionsTracker';

export default function PositionsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Live Positions Tracker */}
        <LivePositionsTracker />
      </div>
    </MainLayout>
  );
}
