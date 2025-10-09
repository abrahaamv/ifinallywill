/**
 * Auth Provider Component
 * Wraps the app with Auth.js session context
 * Provides user session data globally
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

  // Sign out mutation
  const signOutMutation = trpc.auth.signOut.useMutation();

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
      await signOutMutation.mutateAsync();
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out failed:', error);
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
