/**
 * Widget SDK URL Configuration
 *
 * Centralized URL management using environment variables.
 * NO FALLBACKS - fail-fast if environment variables are not set.
 *
 * Phase 2 Task 2.3: Remove Hardcoded URLs
 *
 * Note: Widget SDK is a library meant to be embedded in customer websites.
 * These configurations are for the demo app only. Production widgets must
 * receive apiUrl from the customer's configuration.
 */

/**
 * Get API URL from environment (for demo app only)
 * @throws Error if VITE_API_URL is not configured
 */
export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    throw new Error(
      'Configuration error: VITE_API_URL not set.\n' +
        'Please configure VITE_API_URL in your .env.local file.\n' +
        'See .env.example for configuration template.\n' +
        'Example: VITE_API_URL=http://localhost:3001/trpc'
    );
  }
  return url;
}

/**
 * Get landing URL from environment (for demo app only)
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
 * Get dashboard URL from environment (for demo app only)
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
 * Pre-configured app URLs for demo app convenience
 * These will throw errors if environment variables are not set
 */
export const appUrls = {
  /** API URL for tRPC backend */
  get api(): string {
    return getApiUrl();
  },

  /** Landing app URL (home page) */
  get landing(): string {
    return getLandingUrl();
  },

  /** Dashboard app URL (admin portal) */
  get dashboard(): string {
    return getDashboardUrl();
  },
} as const;
