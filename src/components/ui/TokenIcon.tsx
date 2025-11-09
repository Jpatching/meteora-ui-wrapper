'use client';

import { useState } from 'react';

interface TokenIconProps {
  src?: string;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * TokenIcon component with automatic fallback to gradient placeholder
 * Prevents empty image sources and hydration errors
 */
export function TokenIcon({ src, symbol = '?', size = 'md', className = '' }: TokenIconProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!!src);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-12 h-12 text-sm',
  };

  // Show fallback if no src or error
  if (!src || error) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold ${className}`}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      className={`${sizeClasses[size]} rounded-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity ${className}`}
      onLoad={() => setLoading(false)}
      onError={() => {
        setError(true);
        setLoading(false);
      }}
    />
  );
}
