/**
 * CSRF Protection Provider (Phase 9)
 * Provides CSRF token context and authenticated fetch wrapper
 * for all Meeting app components
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useCSRF, useAuthenticatedFetch, type UseCSRFResult } from '@platform/auth';

interface CSRFContextValue {
  csrf: UseCSRFResult;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const CSRFContext = createContext<CSRFContextValue | null>(null);

/**
 * CSRF Provider Component
 * Wraps the app to provide CSRF token and authenticated fetch
 */
export function CSRFProvider({ children }: { children: ReactNode }) {
  const csrf = useCSRF();
  const { fetch: authenticatedFetch } = useAuthenticatedFetch();

  return (
    <CSRFContext.Provider value={{ csrf, authenticatedFetch }}>
      {children}
    </CSRFContext.Provider>
  );
}

/**
 * Hook to access CSRF context
 * @returns CSRF token state and authenticated fetch wrapper
 */
export function useCSRFContext() {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRFContext must be used within CSRFProvider');
  }
  return context;
}
