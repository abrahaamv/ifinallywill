/**
 * Custom useSession hook for Auth.js
 *
 * Replaces next-auth/react's useSession (which is Next.js specific)
 * Fetches session from Auth.js /api/auth/session endpoint
 *
 * Returns:
 * - session: Auth.js session object or null
 * - loading: true while fetching session
 * - error: error message if session fetch failed
 */

import { useEffect, useState } from 'react';

/**
 * Auth.js User type (extended with platform fields)
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  tenantId?: string;
  role?: 'owner' | 'admin' | 'member';
}

/**
 * Auth.js Session type
 */
export interface Session {
  user: User;
  expires: string;
}

/**
 * useSession return type
 */
export interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch Auth.js session
 *
 * Usage:
 * ```tsx
 * const { session, loading, error } = useSession();
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!session) return <div>Not authenticated</div>;
 *
 * return <div>Welcome, {session.user.name}!</div>;
 * ```
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSession() {
      try {
        setLoading(true);
        setError(null);

        // Fetch session from Auth.js endpoint
        const response = await fetch('/api/auth/session', {
          credentials: 'include', // CRITICAL: Include cookies for session
        });

        if (!response.ok) {
          // Non-200 response means no session or error
          if (isMounted) {
            setSession(null);
            setLoading(false);
          }
          return;
        }

        const sessionData = await response.json();

        if (isMounted) {
          // Auth.js returns empty object {} when no session
          // Check if user exists to determine if session is valid
          if (sessionData && sessionData.user) {
            setSession(sessionData as Session);
          } else {
            setSession(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[useSession] Error fetching session:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch session');
          setSession(null);
          setLoading(false);
        }
      }
    }

    fetchSession();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []); // Empty deps = fetch once on mount

  return { session, loading, error };
}
