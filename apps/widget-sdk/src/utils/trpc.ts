/**
 * tRPC Client Configuration for Widget SDK
 *
 * Type-safe API client for AI chat functionality.
 * Widget uses direct tRPC calls without React Query hooks.
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@platform/api-contract';

/**
 * Create tRPC client for widget
 *
 * @param apiKey - Customer API key for authentication
 * @param apiUrl - Backend API URL (default: http://localhost:3001/trpc)
 */
export function createWidgetTRPCClient(apiKey: string, apiUrl = 'http://localhost:3001/trpc') {
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
