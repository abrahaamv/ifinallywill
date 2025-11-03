/**
 * tRPC Client Configuration for Widget SDK with CSRF Protection
 *
 * Type-safe API client for AI chat functionality.
 * Widget uses direct tRPC calls without React Query hooks.
 * Automatically includes CSRF tokens in all state-changing requests.
 */

import type { AppRouter } from '@platform/api-contract';
import { CSRFService } from '@platform/auth/client';
import { createModuleLogger } from '@platform/shared';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const logger = createModuleLogger('WidgetTRPC');

/**
 * CSRF token cache for widget client
 */
class WidgetCSRFManager {
  private token: string | null = null;
  private tokenExpiry = 0;
  private refreshing: Promise<void> | null = null;

  async getToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.token && this.tokenExpiry > Date.now() + 5 * 60 * 1000) {
      return this.token;
    }

    // Wait for ongoing refresh if any
    if (this.refreshing) {
      await this.refreshing;
      return this.token!;
    }

    // Refresh token
    this.refreshing = this.refreshToken();
    await this.refreshing;
    this.refreshing = null;

    return this.token!;
  }

  private async refreshToken(): Promise<void> {
    try {
      const { token, expiresAt } = await CSRFService.getToken();
      this.token = token;
      this.tokenExpiry = expiresAt;
    } catch (error) {
      logger.error('Widget: Failed to fetch CSRF token', { error });
      // Return empty string to allow requests to continue (backend will reject if CSRF required)
      this.token = '';
      this.tokenExpiry = Date.now() + 5 * 60 * 1000; // Cache failure for 5 minutes
    }
  }
}

const csrfManager = new WidgetCSRFManager();

/**
 * Create tRPC client for widget with CSRF protection
 *
 * @param apiKey - Customer API key for authentication (required)
 * @param apiUrl - Backend API URL - must be explicitly provided (required)
 * @example
 * const client = createWidgetTRPCClient('your-api-key', 'https://api.yourdomain.com/trpc');
 */
export function createWidgetTRPCClient(apiKey: string, apiUrl: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: apiUrl,
        async headers() {
          const headers: Record<string, string> = {
            'x-api-key': apiKey,
            // Content-Type is set automatically by tRPC httpBatchLink
          };

          // Add CSRF token for state-changing requests
          try {
            const csrfToken = await csrfManager.getToken();
            if (csrfToken) {
              headers['X-CSRF-Token'] = csrfToken;
            }
          } catch (error) {
            logger.error('Widget: Failed to get CSRF token for request', { error });
            // Continue without CSRF token - backend will reject if required
          }

          return headers;
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          } as RequestInit);
        },
      }),
    ],
  });
}
