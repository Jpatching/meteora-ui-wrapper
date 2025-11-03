/**
 * Pool Info Component
 * Display detailed pool information
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useState } from 'react';

export interface PoolInfoProps {
  pool: Pool;
}

export function PoolInfo({ pool }: PoolInfoProps) {
  const { baseAsset } = pool;
  const [copied, setCopied] = useState(false);

  const copyPoolAddress = () => {
    navigator.clipboard.writeText(pool.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border-light">
      <CardHeader>
        <CardTitle className="text-base">Pool Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Protocol Type */}
        <div>
          <div className="text-xs text-foreground-muted mb-1">Protocol</div>
          <div className="text-sm font-medium text-foreground">
            {baseAsset.launchpad === 'met-dbc' ? 'Meteora DBC' : 'DLMM'}
          </div>
        </div>

        {/* Bonding Curve (if DBC) */}
        {pool.bondingCurve !== undefined && (
          <div>
            <div className="text-xs text-foreground-muted mb-1">Bonding Curve</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background-tertiary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${pool.bondingCurve}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground">{pool.bondingCurve.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Audit Status */}
        {baseAsset.audit && (
          <div>
            <div className="text-xs text-foreground-muted mb-1">Security</div>
            <div className="flex gap-2">
              {baseAsset.audit.mintAuthorityDisabled && (
                <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                  ✓ Mint Disabled
                </span>
              )}
              {baseAsset.audit.freezeAuthorityDisabled && (
                <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                  ✓ Freeze Disabled
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pool Address */}
        <div>
          <div className="text-xs text-foreground-muted mb-1">Pool Address</div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyPoolAddress}
            className="w-full justify-between font-mono text-xs"
          >
            <span className="truncate">{pool.id.substring(0, 12)}...{pool.id.substring(pool.id.length - 12)}</span>
            <span className="ml-2">{copied ? '✓' : '📋'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
