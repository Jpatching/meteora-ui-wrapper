import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

/**
 * MetaTools Logo Component
 *
 * Professional branding for the MetaTools platform - comprehensive tools for Meteora protocols
 */
export function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  // Size mappings
  const sizeMap = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 32, text: 'text-base' },
    lg: { icon: 40, text: 'text-lg' },
    xl: { icon: 56, text: 'text-2xl' },
  };

  const dimensions = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Image */}
      <Image
        src="/metatools-logo.png"
        alt="MetaTools Logo"
        width={dimensions.icon}
        height={dimensions.icon}
        className="flex-shrink-0"
        priority
      />

      {/* Brand text */}
      {showText && (
        <span className={`font-bold gradient-text ${dimensions.text}`}>
          MetaTools
        </span>
      )}
    </div>
  );
}
