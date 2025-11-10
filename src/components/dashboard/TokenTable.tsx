/**
 * Token Table Component
 * Shows aggregated token data with charting.ag-inspired layout
 */

'use client';

import { useState } from 'react';
import { formatUSD, formatNumber } from '@/lib/format/number';
import { TokenIcon } from '@/components/ui/TokenIcon';
import toast from 'react-hot-toast';

export interface TokenData {
  tokenAddress: string;
  symbol: string;
  name: string;
  icon?: string;
  totalVolume24h: number;
  totalLiquidity: number;
  marketCap: number;
  holders: number;
  txCount: number;
  pools: any[]; // Pool type
  priceChange: number;
  twitter?: string;
  createdAt: string;
  organicScore?: number;
  audit?: {
    mintAuthorityDisabled: boolean | undefined;
    freezeAuthorityDisabled: boolean | undefined;
    topHoldersPercentage: number | undefined;
    devBalancePercentage?: number | undefined;
  };
}

export interface TokenTableProps {
  tokens: TokenData[];
  onTokenClick: (token: TokenData) => void;
  sortBy?: 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap';
  onSortChange?: (sort: 'volume' | 'liquidity' | 'holders' | 'txs' | 'marketCap') => void;
}

export function TokenTable({ tokens, onTokenClick, sortBy, onSortChange }: TokenTableProps) {
  const [hoveredScoreIndex, setHoveredScoreIndex] = useState<number | null>(null);

  const formatCount = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const getTokenAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days > 0) {
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days}d ${hours}h`;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes}m`;
  };

  const handleCopyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  };

  return (
    <div className="divide-y divide-gray-800/50">
      {tokens.map((token, index) => (
        <button
          key={token.tokenAddress}
          onClick={() => onTokenClick(token)}
          className="w-full py-8 px-4 hover:bg-gray-800/30 transition-colors text-left"
        >
          {/* Main Container: Left (Token Info) + Right (Metrics) */}
          <div className="flex items-start gap-3">

            {/* LEFT SECTION: Icon + Token Info */}
            <div className="flex items-start gap-3 flex-shrink-0">
              {/* Token Icon - Larger */}
              <TokenIcon
                src={token.icon}
                symbol={token.symbol}
                size="lg"
              />

              {/* Token Details */}
              <div className="flex flex-col gap-1">
                {/* Token Name - Larger */}
                <h3 className="font-bold text-white text-base mb-0.5">
                  {token.symbol}
                </h3>

                {/* Contract Address with Copy */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-gray-400 font-mono">
                    {token.tokenAddress.slice(0, 3)}...{token.tokenAddress.slice(-4)}
                  </span>
                  <button
                    onClick={(e) => handleCopyAddress(token.tokenAddress, e)}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Token Age & Social Links */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    {getTokenAge(token.createdAt)}
                  </span>
                  <span className="text-gray-700">|</span>
                  {token.twitter && (
                    <>
                      <a
                        href={`https://x.com/${token.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-primary transition-colors"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                      <span className="text-gray-700">|</span>
                    </>
                  )}
                  <a
                    href={`https://solscan.io/token/${token.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION: Metrics in 2 Rows x 5 Columns */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Main Metrics Headers */}
              <div className="grid grid-cols-5 gap-x-3 text-[10px] text-gray-500 mb-1">
                <div>Vol</div>
                <div>Market Cap</div>
                <div>Liquidity</div>
                <div>Holder</div>
                <div>TXs</div>
              </div>

              {/* Row 2: Main Metrics Values */}
              <div className="grid grid-cols-5 gap-x-3 text-xs text-white font-medium mb-3">
                <div>{formatUSD(token.totalVolume24h)}</div>
                <div>{formatUSD(token.marketCap)}</div>
                <div>{formatUSD(token.totalLiquidity)}</div>
                <div>{formatCount(token.holders)}</div>
                <div>{formatCount(token.txCount)}</div>
              </div>

              {/* Row 3: Security Metrics Headers */}
              <div className="grid grid-cols-5 gap-x-3 text-[10px] text-gray-500 mb-1">
                <div>Top 10</div>
                <div>Dev H</div>
                <div>Mint</div>
                <div>Freeze</div>
                <div>Score</div>
              </div>

              {/* Row 4: Security Metrics Values */}
              <div className="grid grid-cols-5 gap-x-3 text-xs font-medium">
                <div className="text-white">
                  {token.audit?.topHoldersPercentage !== undefined
                    ? `${token.audit.topHoldersPercentage.toFixed(2)}%`
                    : '0.00%'}
                </div>
                <div className={
                  token.audit?.devBalancePercentage !== undefined && token.audit.devBalancePercentage < 10
                    ? 'text-success'
                    : 'text-white'
                }>
                  {token.audit?.devBalancePercentage !== undefined
                    ? `${token.audit.devBalancePercentage.toFixed(0)}%`
                    : '0%'}
                </div>
                <div className={token.audit?.mintAuthorityDisabled === true ? 'text-success' : 'text-warning'}>
                  {token.audit?.mintAuthorityDisabled === true ? 'No' : 'Yes'}
                </div>
                <div className={token.audit?.freezeAuthorityDisabled === true ? 'text-success' : 'text-warning'}>
                  {token.audit?.freezeAuthorityDisabled === true ? 'No' : 'Yes'}
                </div>
                <div
                  className={`relative ${
                    !token.organicScore ? 'text-error' :
                    token.organicScore >= 70 ? 'text-success' :
                    'text-white'
                  }`}
                  onMouseEnter={() => !token.organicScore && setHoveredScoreIndex(index)}
                  onMouseLeave={() => setHoveredScoreIndex(null)}
                >
                  {token.organicScore ? Math.round(token.organicScore) : '0'}

                  {/* Hover info box for score 0 */}
                  {!token.organicScore && hoveredScoreIndex === index && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                      <div className="text-xs text-gray-300 font-normal">
                        New token - No organic trading activity yet due to age
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-700"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </button>
      ))}

      {tokens.length === 0 && (
        <div className="text-center py-12 text-foreground-muted">
          No tokens found
        </div>
      )}
    </div>
  );
}
