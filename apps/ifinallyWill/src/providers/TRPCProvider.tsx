/**
 * tRPC + React Query Provider for IFinallyWill
 * CSRF token handling, auth redirect on 401
 */

import { CSRFService } from '@platform/auth/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError, httpBatchLink } from '@trpc/client';
import { useEffect, useRef, useState } from 'react';
import { createModuleLogger } from '../utils/logger';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('TRPCProvider');
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '/api');

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const csrfTokenRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        CSRFService.configure(API_URL);
        const { token } = await CSRFService.getToken();
        csrfTokenRef.current = token;
        setIsReady(true);
      } catch (error) {
        logger.error('Failed to fetch CSRF token', { error });
        setIsReady(true);
      }
    };

    fetchCsrfToken();

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
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
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
            if (csrfTokenRef.current) {
              headers['X-CSRF-Token'] = csrfTokenRef.current;
            }
            return headers;
          },
          fetch: async (url, options) => {
            try {
              const response = await fetch(url, {
                ...options,
                credentials: 'include',
              } as RequestInit);

              if (response.status === 401) {
                // Only redirect if we actually reached a backend (not a network error).
                // In demo mode the fetch may succeed with a 401 from a real server,
                // but if we're running without a backend we should NOT redirect.
                const isDemoUser = !!localStorage.getItem('ifw_demo_user');
                if (!isDemoUser) {
                  logger.warn('401 Unauthorized - Session expired');
                  if (!window.location.pathname.startsWith('/login')) {
                    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                    window.location.href = '/login?expired=true';
                  }
                }
              }

              return response;
            } catch {
              // Network error (no backend reachable) — return a synthetic empty
              // response so tRPC treats it as a failure without redirecting.
              if (import.meta.env.DEV) {
                logger.warn('tRPC fetch failed (no backend?) — returning empty response');
              }
              return new Response(JSON.stringify([{ error: { message: 'Network error' } }]), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              });
            }
          },
        }),
      ],
    })
  );

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
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
