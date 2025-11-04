/**
 * Pool Management Widget
 * Displays user's position and management actions
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { Pool } from '@/lib/jupiter/types';
import Link from 'next/link';

type Action = 'add' | 'remove' | 'claim' | 'close' | null;
type Protocol = 'dlmm' | 'damm-v1' | 'damm-v2' | 'dbc';

export interface PoolManagementWidgetProps {
  pool: Pool;
  position?: {
    liquidity?: number;
    feesEarned?: number;
  };
  protocol?: Protocol;
}

export function PoolManagementWidget({
  pool,
  position,
  protocol = 'dlmm',
}: PoolManagementWidgetProps) {
  const [action, setAction] = useState<Action>(null);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Your Position</span>
          <span className="text-xs font-normal text-foreground-muted">{protocol.toUpperCase()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Summary */}
        {position && (
          <div className="space-y-2 pb-4 border-b border-border-primary">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Liquidity</span>
              <span className="font-semibold text-foreground font-mono">
                ${position.liquidity?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Fees Earned</span>
              <span className="font-semibold text-success font-mono">
                ${position.feesEarned?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons - DLMM */}
        {protocol === 'dlmm' && (
          <div className="space-y-2">
            <Link href={`/dlmm/seed-lfg?pool=${pool.id}`}>
              <Button variant="primary" size="sm" className="w-full">
                Add Liquidity
              </Button>
            </Link>
            <Link href={`/dlmm/remove-liquidity?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Remove Liquidity
              </Button>
            </Link>
            <Link href={`/dlmm/claim-fees?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Claim Fees
              </Button>
            </Link>
            <Link href={`/dlmm/close-position?pool=${pool.id}`}>
              <Button variant="ghost" size="sm" className="w-full text-error">
                Close Position
              </Button>
            </Link>
          </div>
        )}

        {/* Action Buttons - DAMM v2 */}
        {protocol === 'damm-v2' && (
          <div className="space-y-2">
            <Link href={`/damm-v2/add-liquidity?pool=${pool.id}`}>
              <Button variant="primary" size="sm" className="w-full">
                Add Liquidity
              </Button>
            </Link>
            <Link href={`/damm-v2/remove-liquidity?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Remove Liquidity
              </Button>
            </Link>
            <Link href={`/damm-v2/claim-fees?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Claim Fees
              </Button>
            </Link>
            <Link href={`/damm-v2/split-position?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Split Position
              </Button>
            </Link>
          </div>
        )}

        {/* Action Buttons - DBC */}
        {protocol === 'dbc' && (
          <div className="space-y-2">
            <Link href={`/dbc/swap?pool=${pool.id}`}>
              <Button variant="primary" size="sm" className="w-full">
                Swap
              </Button>
            </Link>
            <Link href={`/dbc/claim-fees?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Claim Creator Fees
              </Button>
            </Link>
            <Link href={`/dbc/migrate-v2?pool=${pool.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Migrate to DAMM
              </Button>
            </Link>
          </div>
        )}

        <div className="text-xs text-foreground-muted text-center pt-2">
          Click buttons to manage your position
        </div>
      </CardContent>
    </Card>
  );
}
