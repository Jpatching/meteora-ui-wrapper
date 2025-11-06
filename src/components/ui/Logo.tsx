import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  href?: string;
}

/**
 * MetaTools Logo Component
 *
 * Professional branding for the MetaTools platform - comprehensive tools for Meteora protocols
 */
export function Logo({ size = 'md', className = '', showText = true, href }: LogoProps) {
  // Size mappings
  const sizeMap = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 32, text: 'text-base' },
    lg: { icon: 40, text: 'text-lg' },
    xl: { icon: 56, text: 'text-2xl' },
  };

  const dimensions = sizeMap[size];

  const content = (
    <>
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
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {content}
    </div>
  );
}
