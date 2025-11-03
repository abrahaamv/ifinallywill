/**
 * tRPC Provider for Meeting App with CSRF Protection
 * Configures React Query and tRPC client with automatic CSRF token injection
 */

import { CSRFService } from '@platform/auth/client';
import { createModuleLogger } from '@platform/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { httpBatchLink } from '@trpc/client';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('TRPCProvider');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // Use ref to avoid closure issues with csrfToken in headers function
  const csrfTokenRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        // Configure CSRFService with API URL
        CSRFService.configure(API_URL);

        const { token } = await CSRFService.getToken();
        csrfTokenRef.current = token;
        setIsReady(true);
      } catch (error) {
        logger.error('Failed to fetch CSRF token', { error });
        setIsReady(true); // Continue anyway
      }
    };

    fetchCsrfToken();

    // Refresh token every 30 minutes (before 1 hour expiry)
    const interval = setInterval(
      async () => {
        try {
          const { token } = await CSRFService.getToken();
          csrfTokenRef.current = token;
        } catch (error) {
          logger.error('Failed to refresh CSRF token', { error });
        }
      },
      30 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 401 errors (unauthorized)
              if (error instanceof TRPCClientError && error.data?.httpStatus === 401) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          headers: () => {
            const headers: Record<string, string> = {};

            // Add CSRF token for state-changing requests (using ref to avoid closure)
            if (csrfTokenRef.current) {
              headers['X-CSRF-Token'] = csrfTokenRef.current;
            }

            return headers;
          },
          // Include credentials for cookie-based auth
          fetch: async (url, options) => {
            const response = await fetch(url, {
              ...options,
              credentials: 'include',
            } as RequestInit);

            // Handle 401 Unauthorized - session expired or invalid
            if (response.status === 401) {
              logger.warn('401 Unauthorized - Session expired');

              // Check if we're not already on login page
              if (!window.location.pathname.startsWith('/login')) {
                // Show notification
                const shouldRedirect = confirm(
                  'Your session has expired. Please log in again to continue.'
                );
                if (shouldRedirect) {
                  // Store current path for redirect after login
                  sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                  // Redirect to dashboard login (meeting app doesn't have its own login)
                  window.location.href = import.meta.env.VITE_DASHBOARD_URL + '/login';
                }
              }
            }

            return response;
          },
        }),
      ],
    })
  );

  // Don't render children until CSRF token is fetched
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
