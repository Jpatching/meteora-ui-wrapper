'use client';

import { useEffect, useRef } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { Pool } from '@/lib/jupiter/types';

interface Token {
  symbol: string;
  name: string;
  icon?: string;
  marketCap?: number;
  liquidity?: number;
  volume24h?: number;
  organicScore?: number;
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
                        <TokenIcon
                          src={token.icon}
                          symbol={token.symbol}
                          size="lg"
                        />
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
                    const tvl = pool.baseAsset.liquidity || 0;
                    const volume24h = pool.volume24h || 0;
                    const estimatedFees = volume24h * 0.003; // Assume 0.3% fee
                    const feeToTvlRatio = tvl > 0 ? (estimatedFees / tvl) * 100 : 0;

                    return (
                      <div
                        key={pool.id}
                        onClick={() => onPoolClick?.(pool)}
                        className="px-4 py-3 hover:bg-background-hover cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Pool pair icons - using TokenIcon component (same as discover page) */}
                          <div className="flex items-center -space-x-2">
                            <TokenIcon
                              src={pool.baseAsset.icon}
                              symbol={pool.baseAsset.symbol}
                              size="lg"
                              className="border-2 border-[#1a1b1e]"
                            />
                            <TokenIcon
                              src={pool.quoteAsset?.icon}
                              symbol={pool.quoteAsset?.symbol || 'SOL'}
                              size="lg"
                              className="border-2 border-[#1a1b1e]"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {pool.baseAsset.symbol}-{pool.quoteAsset?.symbol || 'SOL'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase border border-orange-500/50 text-white">
                                {pool.type === 'dlmm' ? 'DLMM' : pool.type === 'damm-v2' ? 'DYN2' : 'DYN1'}
                              </span>
                              {(pool as any).meteoraData?.binStep && (
                                <span className="text-xs text-foreground-muted">
                                  Bin Step: {(pool as any).meteoraData.binStep}
                                </span>
                              )}
                              <span className="text-xs text-foreground-muted">
                                Fee: {(pool as any).meteoraData?.baseFeePercentage || '0.25'}%
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-foreground-muted">
                              <span>TVL: {formatCurrency(tvl)}</span>
                              <span>Vol 24h: {formatCurrency(volume24h)}</span>
                              <span>Fee 24h: {formatCurrency(estimatedFees)}</span>
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
