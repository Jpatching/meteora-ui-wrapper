/**
 * Full-Screen Loading Component
 * Game-style loading screen with animated logo
 */

'use client';

import { Logo } from './Logo';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="animate-pulse">
          <Logo size="xl" showText={true} />
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>

        {/* Loading Text */}
        <p className="text-sm text-foreground-muted animate-pulse">
          Loading Meteora pools...
        </p>
      </div>
    </div>
  );
}
