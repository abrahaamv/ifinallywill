/**
 * Auth Provider Component
 * Wraps the app with Auth.js session context
 * Provides user session data globally
 */

import { createModuleLogger } from '../utils/logger';
import { createContext, useContext, useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('AuthProvider');

interface User {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get session from Auth.js
  const { data: session, refetch: refreshSession } = trpc.auth.getSession.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as User);
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [session]);

  const signOut = async () => {
    try {
      // Step 1: Get CSRF token (required by Auth.js for security)
      const csrfResponse = await fetch('/api/auth/csrf', {
        credentials: 'include',
      });

      if (!csrfResponse.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const { csrfToken } = await csrfResponse.json();

      // Step 2: Call Auth.js signOut endpoint with CSRF token
      const signOutResponse = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken,
        }),
        credentials: 'include', // Important: include cookies
      });

      if (!signOutResponse.ok) {
        throw new Error('Sign out failed');
      }

      // Clear local state
      setUser(null);

      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      logger.error('Sign out failed', { error });
      // Even if API call fails, redirect to login and clear local state
      setUser(null);
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshSession: async () => {
      await refreshSession();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
