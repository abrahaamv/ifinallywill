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
 * Get dashboard URL - injected at build time
 */
export function getDashboardUrl(): string {
  return __VITE_DASHBOARD_URL__;
}

/**
 * Get meeting app URL - injected at build time
 */
export function getMeetingUrl(): string {
  return __VITE_MEET_URL__;
}

/**
 * Get landing URL - injected at build time
 */
export function getLandingUrl(): string {
  return __VITE_APP_URL__;
}

/**
 * Pre-configured app URLs for convenience
 * Uses environment variables with sensible fallbacks
 */
export const appUrls = {
  /** Landing page URL */
  get landing(): string {
    return getLandingUrl();
  },

  /** Dashboard app URL (login, signup, main app) */
  get dashboard(): string {
    return getDashboardUrl();
  },

  /** Meeting app URL (video calls) */
  get meeting(): string {
    return getMeetingUrl();
  },

  /** Dashboard login page */
  get login(): string {
    return `${getDashboardUrl()}/login`;
  },

  /** Dashboard signup page */
  get signup(): string {
    return `${getDashboardUrl()}/signup`;
  },
} as const;
