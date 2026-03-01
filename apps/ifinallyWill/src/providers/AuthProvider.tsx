/**
 * Auth context provider for IFinallyWill
 * Session management via Auth.js + tRPC
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';

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
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: session, refetch: refreshSession } = trpc.auth.getSession.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as User);
    } else {
      // Restore demo user from localStorage if no backend session
      const stored = localStorage.getItem('ifw_demo_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored) as User);
        } catch {
          localStorage.removeItem('ifw_demo_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, [session]);

  const signIn = (demoUser: User) => {
    setUser(demoUser);
    localStorage.setItem('ifw_demo_user', JSON.stringify(demoUser));
  };

  const signOut = async () => {
    try {
      const csrfResponse = await fetch('/api/auth/csrf', {
        credentials: 'include',
      });

      if (!csrfResponse.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const { csrfToken } = await csrfResponse.json();

      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
        credentials: 'include',
      });

      setUser(null);
      localStorage.removeItem('ifw_demo_user');
      window.location.href = '/login';
    } catch {
      setUser(null);
      localStorage.removeItem('ifw_demo_user');
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
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
