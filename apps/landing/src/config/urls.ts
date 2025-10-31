/**
 * Application URL Configuration
 *
 * Centralized URL management using environment variables.
 * NO FALLBACKS - fail-fast if environment variables are not set.
 *
 * Phase 2 Task 2.3: Remove Hardcoded URLs
 */

/**
 * Get dashboard URL from environment (login, signup, app access)
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
 * Get meeting app URL from environment
 * @throws Error if VITE_MEET_URL is not configured
 */
export function getMeetingUrl(): string {
  const url = import.meta.env.VITE_MEET_URL;
  if (!url) {
    throw new Error(
      'Configuration error: VITE_MEET_URL not set.\n' +
        'Please configure VITE_MEET_URL in your .env.local file.\n' +
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
