/**
 * Application URL Configuration
 *
 * URLs are injected at build time via vite.config.ts define.
 * Production builds get production URLs, dev builds get localhost.
 *
 * Phase 2 Task 2.3: Remove Hardcoded URLs
 */

// These globals are replaced at build time by Vite's define config
declare const __VITE_MEET_URL__: string;
declare const __VITE_DASHBOARD_URL__: string;
declare const __VITE_APP_URL__: string;

/**
 * Get landing URL - injected at build time
 */
export function getLandingUrl(): string {
  return __VITE_APP_URL__;
}

/**
 * Get dashboard URL - injected at build time
 */
export function getDashboardUrl(): string {
  return __VITE_DASHBOARD_URL__;
}

/**
 * Get meeting URL - injected at build time
 */
export function getMeetingUrl(): string {
  return __VITE_MEET_URL__;
}

/**
 * Pre-configured app URLs for convenience
 * Uses environment variables with sensible fallbacks
 */
export const appUrls = {
  /** Landing app URL (home page) */
  get landing(): string {
    return getLandingUrl();
  },

  /** Dashboard app URL (admin portal) */
  get dashboard(): string {
    return getDashboardUrl();
  },

  /** Meeting app URL */
  get meeting(): string {
    return getMeetingUrl();
  },
} as const;
