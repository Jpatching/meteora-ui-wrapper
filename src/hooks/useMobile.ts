/**
 * Hook to detect mobile devices
 */

import { useMedia } from 'react-use';

/**
 * Returns true if viewport is mobile-sized (<768px)
 */
export function useMobile(): boolean {
  return useMedia('(max-width: 768px)', false);
}

/**
 * Returns true if viewport is tablet-sized (768px-1024px)
 */
export function useTablet(): boolean {
  return useMedia('(min-width: 768px) and (max-width: 1024px)', false);
}

/**
 * Returns true if viewport is desktop-sized (>1024px)
 */
export function useDesktop(): boolean {
  return useMedia('(min-width: 1024px)', true);
}
