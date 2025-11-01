/**
 * Utility Functions for UI Library
 * Includes clsx and tailwind-merge for className composition
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and merges Tailwind classes intelligently
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-blue-500', 'px-4') // 'py-1 bg-blue-500 px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human-readable string
 * @example formatBytes(1536) // '1.5 KB'
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Debounce function calls
 * @example const debouncedSearch = debounce((query) => search(query), 300)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 * @example const throttledScroll = throttle(() => handleScroll(), 100)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Generate a random ID
 * @example generateId() // 'x7k9m2n4'
 */
export function generateId(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * Sleep utility for async operations
 * @example await sleep(1000) // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with fallback
 * @example safeJSONParse('{"key":"value"}', {}) // { key: 'value' }
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if running in browser environment
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Check if running in development mode
 */
export const isDevelopment =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.MODE === 'development';

/**
 * Check if running in production mode
 */
export const isProduction =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.MODE === 'production';
