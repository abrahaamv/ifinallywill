/**
 * Application URL Configuration
 *
 * Centralized URL management using environment variables.
 * Uses sensible defaults for investor preview deployment.
 *
 * Phase 2 Task 2.3: Remove Hardcoded URLs
 */

// Detect if we're in production based on hostname or env
const isProduction = typeof window !== 'undefined' &&
  (window.location.hostname.includes('visualkit.live') ||
   window.location.hostname.includes('railway.app'));

// Default URLs for production (visualkit.live domain)
const PRODUCTION_DEFAULTS = {
  dashboard: 'https://dashboard.visualkit.live',
  meeting: 'https://meet.visualkit.live',
  landing: 'https://visualkit.live',
};

// Default URLs for local development
const DEV_DEFAULTS = {
  dashboard: 'http://localhost:5174',
  meeting: 'http://localhost:5175',
  landing: 'http://localhost:5173',
};

const defaults = isProduction ? PRODUCTION_DEFAULTS : DEV_DEFAULTS;

/**
 * Get dashboard URL from environment (login, signup, app access)
 * Falls back to sensible defaults for investor preview
 */
export function getDashboardUrl(): string {
  return import.meta.env.VITE_DASHBOARD_URL || defaults.dashboard;
}

/**
 * Get meeting app URL from environment
 * Falls back to sensible defaults for investor preview
 */
export function getMeetingUrl(): string {
  return import.meta.env.VITE_MEET_URL || defaults.meeting;
}

/**
 * Get landing URL from environment
 * Falls back to sensible defaults for investor preview
 */
export function getLandingUrl(): string {
  return import.meta.env.VITE_APP_URL || defaults.landing;
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
