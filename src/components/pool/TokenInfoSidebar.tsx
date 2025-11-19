/**
 * Token Info Sidebar - Left sidebar with token details
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { Badge } from '../ui';

interface TokenInfoSidebarProps {
  pool: Pool;
}

export function TokenInfoSidebar({ pool }: TokenInfoSidebarProps) {
  const token = pool.baseAsset;

  const formatNumber = (num: number | undefined) => {
    if (!num) return '$0';
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Token Header */}
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center gap-4 mb-4">
          {token.icon ? (
            <img
              src={token.icon}
              alt={token.symbol}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white">
              {token.symbol.slice(0, 2)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{token.symbol}</h1>
            <p className="text-sm text-gray-400 truncate">{token.name}</p>
          </div>
        </div>

        {/* Price Info */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">
            {token.usdPrice ? `$${Number(token.usdPrice).toFixed(6)}` : '-'}
          </div>
          {token.stats24h?.priceChange !== undefined && (
            <div className={`text-sm font-semibold ${
              token.stats24h.priceChange >= 0 ? 'text-success' : 'text-error'
            }`}>
              {token.stats24h.priceChange >= 0 ? '+' : ''}
              {token.stats24h.priceChange.toFixed(2)}% (24h)
            </div>
          )}
        </div>

        {/* Protocol Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={pool.type === 'dlmm' ? 'info' : 'success'}>
            {pool.type === 'dlmm' ? 'DLMM' : token.launchpad === 'met-dbc' ? 'DBC' : 'POOL'}
          </Badge>
          {token.isVerified && (
            <Badge variant="success">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Token Metrics */}
      <div className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Token Metrics
        </h3>

        <div className="space-y-3">
          {/* Market Cap */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Market Cap</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(token.mcap)}
            </span>
          </div>

          {/* FDV */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">FDV</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(token.fdv)}
            </span>
          </div>

          {/* Liquidity */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Liquidity</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(token.liquidity)}
            </span>
          </div>

          {/* Holders */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Holders</span>
            <span className="text-sm font-semibold text-white">
              {token.holderCount?.toLocaleString() || '-'}
            </span>
          </div>

          {/* Supply */}
          {token.circSupply && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Circulating Supply</span>
              <span className="text-sm font-semibold text-white">
                {(token.circSupply / 1_000_000).toFixed(2)}M
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Social Links */}
      {(token.twitter || token.telegram || token.website) && (
        <div className="p-6 border-t border-border-light">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
            Social Links
          </h3>

          <div className="flex items-center gap-2">
            {token.twitter && (
              <a
                href={token.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}

            {token.telegram && (
              <a
                href={token.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </a>
            )}

            {token.website && (
              <a
                href={token.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Security Audit */}
      {token.audit && (
        <div className="p-6 border-t border-border-light">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
            Security
          </h3>

          <div className="space-y-2">
            {token.audit.mintAuthorityDisabled && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-gray-300">Mint Authority Disabled</span>
              </div>
            )}

            {token.audit.freezeAuthorityDisabled && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-gray-300">Freeze Authority Disabled</span>
              </div>
            )}

            {token.audit.topHoldersPercentage !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Top 10 Holders</span>
                <span className="text-white font-medium">
                  {token.audit.topHoldersPercentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
