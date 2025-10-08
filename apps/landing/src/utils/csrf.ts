/**
 * CSRF Utilities for Landing App (Phase 9)
 * Helper functions for form submissions with CSRF protection
 */

import { CSRFService } from '@platform/auth';

/**
 * Submit form with CSRF protection
 * @param url - API endpoint URL
 * @param data - Form data to submit
 * @param options - Additional fetch options
 * @returns Response from server
 */
export async function submitFormWithCSRF(
  url: string,
  data: Record<string, unknown>,
  options: RequestInit = {}
): Promise<Response> {
  // Fetch CSRF token
  const { token } = await CSRFService.getToken();

  // Submit with CSRF token
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...options.headers,
    },
    credentials: 'include',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Create an authenticated fetch wrapper with CSRF token
 * @returns Fetch function with automatic CSRF injection
 */
export async function createAuthenticatedFetch(): Promise<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
> {
  return CSRFService.createAuthenticatedFetch();
}
