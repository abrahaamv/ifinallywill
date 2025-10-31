/**
 * React Hook for CSRF Token Management - Phase 9
 *
 * Provides CSRF token state management for React components.
 * Automatically fetches and refreshes CSRF tokens as needed.
 *
 * @example
 * ```typescript
 * import { useCSRF } from '@platform/auth';
 *
 * function MyForm() {
 *   const { token, loading, error, refetch } = useCSRF();
 *
 *   const handleSubmit = async (data) => {
 *     if (!token) {
 *       console.error('No CSRF token available');
 *       return;
 *     }
 *
 *     const response = await fetch('/api/data', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'X-CSRF-Token': token,
 *       },
 *       credentials: 'include',
 *       body: JSON.stringify(data),
 *     });
 *   };
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */

import { createModuleLogger } from '@platform/shared';
import { useCallback, useEffect, useState } from 'react';
import { CSRFService, type CSRFToken } from '../services/csrf.service';

const logger = createModuleLogger('useCSRF');

export interface UseCSRFResult {
  /** Current CSRF token (null if not loaded or error) */
  token: string | null;
  /** Loading state - true during initial fetch */
  loading: boolean;
  /** Error message if token fetch failed */
  error: string | null;
  /** Manually refetch CSRF token */
  refetch: () => Promise<void>;
}

/**
 * React hook for CSRF token management
 *
 * Features:
 * - Automatic token fetching on mount
 * - Automatic token refresh before expiry
 * - Error handling and retry logic
 * - Manual refetch capability
 *
 * @returns CSRF token state and refetch function
 */
export function useCSRF(): UseCSRFResult {
  const [tokenData, setTokenData] = useState<CSRFToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch CSRF token from server
   */
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await CSRFService.getToken();
      setTokenData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      logger.error('CSRF token fetch error', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial token fetch on mount
   */
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  /**
   * Auto-refresh token before expiry
   * Refresh 5 minutes before expiry
   */
  useEffect(() => {
    if (!tokenData) return;

    const timeUntilExpiry = tokenData.expiresAt - Date.now();
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // 5 minutes before expiry

    const timer = setTimeout(() => {
      fetchToken();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [tokenData, fetchToken]);

  return {
    token: tokenData?.token || null,
    loading,
    error,
    refetch: fetchToken,
  };
}

/**
 * React hook for authenticated fetch with automatic CSRF token injection
 *
 * Returns a fetch wrapper that automatically includes CSRF token in requests.
 *
 * @example
 * ```typescript
 * import { useAuthenticatedFetch } from '@platform/auth';
 *
 * function MyComponent() {
 *   const { fetch: authenticatedFetch, loading, error } = useAuthenticatedFetch();
 *
 *   const handleSubmit = async (data) => {
 *     if (error) {
 *       console.error('CSRF error:', error);
 *       return;
 *     }
 *
 *     const response = await authenticatedFetch('/api/data', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data),
 *     });
 *   };
 * }
 * ```
 */
export function useAuthenticatedFetch() {
  const { token, loading, error, refetch } = useCSRF();

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!token) {
        throw new Error('No CSRF token available');
      }

      const modifiedInit = CSRFService.addTokenToRequest(token, init);
      return fetch(input, modifiedInit);
    },
    [token]
  );

  return {
    fetch: authenticatedFetch,
    loading,
    error,
    refetch,
  };
}
