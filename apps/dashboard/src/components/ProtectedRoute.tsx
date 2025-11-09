/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication
 * Redirects to login page if user is not authenticated
 * Shows loading state while checking session
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 */

import { createModuleLogger } from '../utils/logger';
import { useEffect } from 'react';
import { useSession } from '../hooks/useSession';

const logger = createModuleLogger('ProtectedRoute');

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional redirect URL (defaults to /login)
   */
  redirectTo?: string;
  /**
   * Optional loading component (defaults to simple loading div)
   */
  loadingComponent?: React.ReactNode;
}

/**
 * ProtectedRoute component - requires authentication
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  loadingComponent,
}: ProtectedRouteProps) {
  const { session, loading, error } = useSession();

  useEffect(() => {
    // If not loading and no session, redirect to login
    if (!loading && !session) {
      logger.info('No session, redirecting to login');
      window.location.href = redirectTo;
    }
  }, [loading, session, redirectTo]);

  // Show loading state while fetching session
  if (loading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Show error state if session fetch failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load session: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No session - redirect will trigger in useEffect
  if (!session) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}
