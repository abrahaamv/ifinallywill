/**
 * tRPC Provider Component with CSRF Protection (Phase 9)
 * Wraps the app with tRPC and React Query providers
 * Automatically includes CSRF tokens in all requests
 */

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../utils/trpc';
import { CSRFService } from '@platform/auth/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const { token } = await CSRFService.getToken();
        setCsrfToken(token);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();

    // Refresh token every 30 minutes (before 1 hour expiry)
    const interval = setInterval(fetchCsrfToken, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          headers: () => {
            const headers: Record<string, string> = {};

            // Add auth token from localStorage/sessionStorage if available
            const token = localStorage.getItem('auth_token');
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }

            // Add CSRF token for state-changing requests
            if (csrfToken) {
              headers['X-CSRF-Token'] = csrfToken;
            }

            return headers;
          },
          // Include credentials for cookie-based auth
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
