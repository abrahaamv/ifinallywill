/**
 * Application URL Configuration
 *
 * Centralized URL management using environment variables.
 * NO FALLBACKS - fail-fast if environment variables are not set.
 *
 * Phase 2 Task 2.3: Remove Hardcoded URLs
 */

/**
 * Get landing URL from environment
 * @throws Error if VITE_APP_URL is not configured
 */
export function getLandingUrl(): string {
  const url = import.meta.env.VITE_APP_URL;
  if (!url) {
    throw new Error(
      'Configuration error: VITE_APP_URL not set.\n' +
        'Please configure VITE_APP_URL in your .env.local file.\n' +
        'See .env.example for configuration template.'
    );
  }
  return url;
}

/**
 * Get dashboard URL from environment
 * @throws Error if VITE_DASHBOARD_URL is not configured
 */
export function getDashboardUrl(): string {
  const url = import.meta.env.VITE_DASHBOARD_URL;
  if (!url) {
    throw new Error(
      'Configuration error: VITE_DASHBOARD_URL not set.\n' +
        'Please configure VITE_DASHBOARD_URL in your .env.local file.\n' +
        'See .env.example for configuration template.'
    );
  }
  return url;
}

/**
 * Pre-configured app URLs for convenience
 * These will throw errors if environment variables are not set
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
} as const;
