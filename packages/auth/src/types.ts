import type { DefaultSession } from 'next-auth';

/**
 * Extend NextAuth types to include custom fields
 */
declare module 'next-auth' {
  /**
   * Returned by `auth()`, `getSession()`, and `useSession()`
   */
  interface Session {
    user: {
      /** User's tenant ID for multi-tenant isolation */
      tenantId?: string;
      /** User's role within the tenant */
      role?: 'owner' | 'admin' | 'member';
    } & DefaultSession['user'];
  }

  /**
   * User object from database
   */
  interface User {
    /** User's tenant ID */
    tenantId?: string;
    /** User's role within the tenant */
    role?: 'owner' | 'admin' | 'member';
  }
}

declare module '@auth/core/jwt' {
  /**
   * JWT token with custom fields
   */
  interface JWT {
    /** User ID */
    userId?: string;
    /** OAuth access token */
    accessToken?: string;
    /** OAuth provider */
    provider?: string;
  }
}
