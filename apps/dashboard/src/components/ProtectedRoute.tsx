/**
 * Protected Route Component
 * Ensures users are authenticated before accessing protected pages
 * Redirects to login if unauthenticated
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status using Auth.js session
  const {
    data: session,
    isLoading,
    error,
  } = trpc.auth.getSession.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsAuthenticated(!!session?.user);
      setIsChecking(false);
    }
  }, [session, isLoading]);

  // Show loading spinner while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || error) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
