/**
 * Date formatting utilities
 */

/**
 * Internationalized date formatter
 */
export class _IntlDate {
  private formatter: Intl.DateTimeFormat;

  constructor(locale = 'en-US', options?: Intl.DateTimeFormatOptions) {
    this.formatter = new Intl.DateTimeFormat(locale, options);
  }

  format(date: Date | number): string {
    return this.formatter.format(date);
  }
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | number, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  if (format === 'long') {
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time ago (e.g., "2 hours ago", "3 days ago")
 */
export function formatTimeAgo(date: Date | number): string {
  const timestamp = typeof date === 'number' ? date : date.getTime();
  return formatRelativeTime(timestamp);
}
