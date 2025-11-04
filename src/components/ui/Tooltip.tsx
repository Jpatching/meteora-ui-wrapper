'use client';

import { ReactNode, useState } from 'react';

export interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2
            text-sm text-foreground
            bg-background-tertiary
            border border-border-light
            rounded-lg
            shadow-xl
            whitespace-nowrap
            animate-in fade-in duration-200
            ${positionClasses[position]}
          `}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2
              bg-background-tertiary
              border-border-light
              rotate-45
              ${
                position === 'top'
                  ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b'
                  : position === 'bottom'
                  ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t'
                  : position === 'left'
                  ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t'
                  : 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
              }
            `}
          />
        </div>
      )}
    </div>
  );
}
