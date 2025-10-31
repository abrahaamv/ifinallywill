/**
 * tRPC Client Configuration for Widget SDK
 *
 * Type-safe API client for AI chat functionality.
 * Widget uses direct tRPC calls without React Query hooks.
 */

import type { AppRouter } from '@platform/api-contract';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

/**
 * Create tRPC client for widget
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
        headers() {
          return {
            'x-api-key': apiKey,
            // Content-Type is set automatically by tRPC httpBatchLink
          };
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
      }),
    ],
  });
}
