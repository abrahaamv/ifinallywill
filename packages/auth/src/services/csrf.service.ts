/**
 * CSRF Protection Service - Phase 9
 *
 * Provides CSRF token handling for frontend applications.
 * Auth.js automatically validates CSRF tokens on all state-changing requests.
 *
 * **How Auth.js CSRF Protection Works**:
 * 1. Server generates CSRF token on first request
 * 2. Token stored in httpOnly cookie (__Host-next-auth.csrf-token)
 * 3. Token also returned in response body for client-side access
 * 4. Client includes token in all POST/PUT/DELETE requests
 * 5. Server validates token matches cookie value
 *
 * **Security Features**:
 * - Double submit cookie pattern
 * - httpOnly cookies prevent XSS
 * - sameSite=lax prevents CSRF on GET requests
 * - __Host- prefix enforces secure, same-origin only
 *
 * @see https://authjs.dev/concepts/security#csrf-protection
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('CSRFService');

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

/**
 * CSRF Service for frontend CSRF token management
 */
export class CSRFService {
  private static readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Fetch CSRF token from Auth.js /api/auth/csrf endpoint
   *
   * This endpoint is provided by Auth.js automatically and returns
   * a fresh CSRF token for the current session.
   *
   * @returns CSRF token object with token string
   * @throws Error if token fetch fails
   *
   * @example
   * ```typescript
   * const { token } = await CSRFService.getToken();
   * // Use token in form submission
   * ```
   */
  static async getToken(): Promise<CSRFToken> {
    try {
      const response = await fetch(`${CSRFService.API_BASE_URL}/api/auth/csrf`, {
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        throw new Error(`CSRF token fetch failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { csrfToken: string };

      return {
        token: data.csrfToken,
        expiresAt: Date.now() + 3600000, // 1 hour expiry (typical session duration)
      };
    } catch (error) {
      logger.error('Failed to fetch CSRF token', { error });
      throw new Error('CSRF token fetch failed');
    }
  }

  /**
   * Validate CSRF token format
   *
   * Auth.js CSRF tokens are typically UUIDs or base64-encoded random bytes.
   * This performs basic format validation without checking authenticity.
   *
   * @param token - CSRF token to validate
   * @returns true if token format is valid
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Auth.js tokens are typically 36-64 characters (UUID or base64)
    if (token.length < 32 || token.length > 128) {
      return false;
    }

    // Check for valid characters (alphanumeric + hyphens for UUID, or base64)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(token);
  }

  /**
   * Add CSRF token to fetch request headers
   *
   * Use this helper to automatically include CSRF token in API requests.
   *
   * @param token - CSRF token
   * @param options - Fetch RequestInit options
   * @returns Modified RequestInit with CSRF token
   *
   * @example
   * ```typescript
   * const { token } = await CSRFService.getToken();
   * const response = await fetch('/api/data', CSRFService.addTokenToRequest(token, {
   *   method: 'POST',
   *   body: JSON.stringify(data),
   * }));
   * ```
   */
  static addTokenToRequest(token: string, options: RequestInit = {}): RequestInit {
    return {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': token,
      },
      credentials: 'include', // Include cookies for session validation
    };
  }

  /**
   * Create form with CSRF token field
   *
   * For traditional form submissions, add hidden CSRF token field.
   *
   * @param token - CSRF token
   * @returns HTML string for hidden input field
   *
   * @example
   * ```typescript
   * const { token } = await CSRFService.getToken();
   * const csrfField = CSRFService.createFormField(token);
   * // Add to form: formElement.innerHTML += csrfField;
   * ```
   */
  static createFormField(token: string): string {
    return `<input type="hidden" name="csrfToken" value="${token}" />`;
  }

  /**
   * React hook helper for CSRF token management
   *
   * Returns a fetch wrapper that automatically includes CSRF token.
   *
   * @returns Fetch wrapper with automatic CSRF token injection
   *
   * @example
   * ```typescript
   * const authenticatedFetch = await CSRFService.createAuthenticatedFetch();
   * const response = await authenticatedFetch('/api/data', {
   *   method: 'POST',
   *   body: JSON.stringify(data),
   * });
   * ```
   */
  static async createAuthenticatedFetch(): Promise<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  > {
    const { token } = await CSRFService.getToken();

    return (input: RequestInfo | URL, init?: RequestInit) => {
      const modifiedInit = CSRFService.addTokenToRequest(token, init);
      return fetch(input, modifiedInit);
    };
  }
}

/**
 * React Hook for CSRF token management
 *
 * Use this hook in React components to manage CSRF tokens.
 *
 * **Note**: This is re-exported from hooks/useCSRF.ts for convenience.
 * Use `import { useCSRF } from '@platform/auth'` instead.
 *
 * @deprecated Use `useCSRF` hook from hooks/useCSRF.ts
 * @example
 * ```typescript
 * import { useCSRF } from '@platform/auth';
 *
 * function MyComponent() {
 *   const { token, loading, error, refetch } = useCSRF();
 *
 *   const handleSubmit = async (data) => {
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
 * }
 * ```
 */
