'use client';

import { useEffect, useRef } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface Token {
  symbol: string;
  name: string;
  icon?: string;
  marketCap?: number;
  liquidity?: number;
  volume24h?: number;
  organicScore?: number;
}

interface Pool {
  pool_address: string;
  pool_name: string;
  protocol: 'dlmm' | 'damm-v2' | 'damm-v1';
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  tvl: string;
  volume_24h: string;
  fees_24h: string;
  apr: string;
  metadata?: {
    bin_step?: number;
    base_fee?: number;
    base_fee_percentage?: string;
  };
}

interface SearchDropdownProps {
  isOpen: boolean;
  searchTerm: string;
  tokens: Token[];
  pools: Pool[];
  isLoading: boolean;
  onClose: () => void;
  onTokenClick?: (token: Token) => void;
  onPoolClick?: (pool: Pool) => void;
}

export function SearchDropdown({
  isOpen,
  searchTerm,
  tokens,
  pools,
  isLoading,
  onClose,
  onTokenClick,
  onPoolClick,
}: SearchDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay - more opaque like charting.ag */}
      <div className="fixed inset-0 bg-black/80 z-40" onClick={onClose} />

      {/* Search dropdown - solid background, no transparency */}
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b1e] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-y-auto backdrop-blur-xl"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Tokens section */}
            {tokens.length > 0 && (
              <div className="border-b border-border-light">
                <div className="px-4 py-2 text-xs text-foreground-muted uppercase tracking-wide">
                  Tokens
                </div>
                <div className="divide-y divide-border-light">
                  {tokens.slice(0, 3).map((token, idx) => (
                    <div
                      key={idx}
                      onClick={() => onTokenClick?.(token)}
                      className="px-4 py-3 hover:bg-background-hover cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {token.icon ? (
                          <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{token.symbol}</span>
                            {token.name && (
                              <span className="text-sm text-foreground-muted truncate">{token.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-foreground-muted">
                            {token.marketCap !== undefined && (
                              <span>Market Cap: {formatCurrency(token.marketCap)}</span>
                            )}
                            {token.liquidity !== undefined && (
                              <span>Liquidity: {formatCurrency(token.liquidity)}</span>
                            )}
                            {token.volume24h !== undefined && (
                              <span>Vol: {formatCurrency(token.volume24h)}</span>
                            )}
                            {token.organicScore !== undefined && (
                              <span className={token.organicScore >= 70 ? 'text-success' : ''}>
                                Score: {Math.round(token.organicScore)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pools section */}
            {pools.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs text-foreground-muted uppercase tracking-wide">
                  Pools
                </div>
                <div className="divide-y divide-border-light">
                  {pools.map((pool) => {
                    const tvl = parseFloat(pool.tvl) || 0;
                    const volume24h = parseFloat(pool.volume_24h) || 0;
                    const fees24h = parseFloat(pool.fees_24h) || 0;
                    const feeToTvlRatio = tvl > 0 ? (fees24h / tvl) * 100 : 0;

                    return (
                      <div
                        key={pool.pool_address}
                        onClick={() => onPoolClick?.(pool)}
                        className="px-4 py-3 hover:bg-background-hover cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Pool pair icons - using Jupiter CDN (same as discover page) */}
                          <div className="flex items-center -space-x-2">
                            <img
                              src={`https://cache.jup.ag/static/cdn/strict/${pool.token_a_mint}`}
                              alt={pool.token_a_symbol}
                              className="w-10 h-10 rounded-full border-2 border-[#1a1b1e]"
                              onError={(e) => {
                                // Fallback to default token icon
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%238b5cf6"/><text x="50" y="50" font-size="50" text-anchor="middle" dy=".3em" fill="white">' + pool.token_a_symbol.charAt(0) + '</text></svg>';
                              }}
                            />
                            <img
                              src={`https://cache.jup.ag/static/cdn/strict/${pool.token_b_mint}`}
                              alt={pool.token_b_symbol}
                              className="w-10 h-10 rounded-full border-2 border-[#1a1b1e]"
                              onError={(e) => {
                                // Fallback to default token icon
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%233b82f6"/><text x="50" y="50" font-size="50" text-anchor="middle" dy=".3em" fill="white">' + pool.token_b_symbol.charAt(0) + '</text></svg>';
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{pool.pool_name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase border border-orange-500/50 text-white">
                                {pool.protocol === 'dlmm' ? 'DLMM' : pool.protocol === 'damm-v2' ? 'DYN2' : 'DYN1'}
                              </span>
                              {pool.metadata?.bin_step && (
                                <span className="text-xs text-foreground-muted">
                                  Bin Step: {pool.metadata.bin_step}
                                </span>
                              )}
                              <span className="text-xs text-foreground-muted">
                                Fee: {pool.metadata?.base_fee_percentage || pool.metadata?.base_fee?.toString() || '0.25'}%
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-foreground-muted">
                              <span>TVL: {formatCurrency(tvl)}</span>
                              <span>Vol 24h: {formatCurrency(volume24h)}</span>
                              <span>Fee 24h: {formatCurrency(fees24h)}</span>
                              <span>Fee/TVL: {feeToTvlRatio.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No results */}
            {tokens.length === 0 && pools.length === 0 && !isLoading && searchTerm.length >= 2 && (
              <div className="px-4 py-12 text-center text-foreground-muted">
                No results found for "{searchTerm}"
              </div>
            )}

            {/* ESC hint */}
            <div className="px-4 py-3 border-t border-border-light text-center">
              <span className="text-xs text-foreground-muted">
                <kbd className="px-2 py-1 bg-background-hover rounded text-xs">ESC</kbd> to close
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
