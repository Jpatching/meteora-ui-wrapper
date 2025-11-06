/**
 * Collapsible Card Component
 * Card that can be expanded/collapsed to save screen space
 */

'use client';

import { useState, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface CollapsibleCardProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleCard({
  title,
  children,
  defaultExpanded = true,
  className = '',
  headerClassName = '',
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={className}>
      <CardHeader className={headerClassName}>
        <div
          className="flex items-center justify-between cursor-pointer select-none hover:opacity-80 transition-opacity"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle>{title}</CardTitle>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </CardHeader>

      {isExpanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}
