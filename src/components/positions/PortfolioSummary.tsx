'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface PortfolioSummaryProps {
  totalValue: number;
  totalPNL: number;
  totalPNLPercent: number;
  totalFeesEarned: number;
  positionCount: number;
  loading?: boolean;
}

export function PortfolioSummary({
  totalValue,
  totalPNL,
  totalPNLPercent,
  totalFeesEarned,
  positionCount,
  loading = false,
}: PortfolioSummaryProps) {
  // Format currency
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get PNL color
  const getPNLColor = (pnl: number) => {
    if (pnl > 0) return 'text-success';
    if (pnl < 0) return 'text-error';
    return 'text-foreground-muted';
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-background-tertiary rounded w-24" />
                <div className="h-8 bg-background-tertiary rounded w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover gradient>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="gradient-text">Portfolio Overview</span>
          <span className="text-sm font-normal text-foreground-muted">
            {positionCount} {positionCount === 1 ? 'Position' : 'Positions'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Value */}
          <div className="space-y-2">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-ui">
              Total Value
            </div>
            <div className="text-3xl font-bold gradient-text font-accent">
              {formatUSD(totalValue)}
            </div>
          </div>

          {/* Total PNL */}
          <div className="space-y-2">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-ui">
              Total PNL
            </div>
            <div className={`text-3xl font-bold font-accent ${getPNLColor(totalPNL)}`}>
              {formatUSD(totalPNL)}
              <div className="text-base mt-1">
                {formatPercent(totalPNLPercent)}
              </div>
            </div>
          </div>

          {/* Fees Earned */}
          <div className="space-y-2">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-ui">
              Unclaimed Fees
            </div>
            <div className="text-3xl font-bold text-success font-accent">
              {formatUSD(totalFeesEarned)}
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="space-y-2">
            <div className="text-xs text-foreground-muted uppercase tracking-wide font-ui">
              Performance
            </div>
            <div className="flex items-center gap-2">
              {totalPNL >= 0 ? (
                <>
                  <div className="text-3xl">📈</div>
                  <div>
                    <div className="text-success font-semibold">Profitable</div>
                    <div className="text-xs text-foreground-muted">
                      {positionCount} active {positionCount === 1 ? 'position' : 'positions'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl">📉</div>
                  <div>
                    <div className="text-error font-semibold">Negative</div>
                    <div className="text-xs text-foreground-muted">
                      Review positions
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Visual indicator bar */}
        <div className="mt-6 h-2 bg-background-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              totalPNL >= 0
                ? 'bg-gradient-to-r from-success to-green-400'
                : 'bg-gradient-to-r from-error to-red-400'
            }`}
            style={{
              width: `${Math.min(100, Math.abs(totalPNLPercent))}%`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
