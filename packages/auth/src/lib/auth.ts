/**
 * Auth.js Core Configuration
 *
 * SOC 2 certified authentication with OAuth providers.
 * Replaces deprecated Lucia v4 with industry standard.
 */

import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, authSessions as sessions, verificationTokens } from '@platform/db';
import NextAuth from 'next-auth';
import type { NextAuthConfig, Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import Microsoft from 'next-auth/providers/microsoft-entra-id';

/**
 * Auth.js configuration with OAuth providers
 *
 * Database adapter enabled (Migration 007 complete):
 * ✅ Users table: emailVerified and image columns added
 * ✅ Auth sessions: session_token is primary key
 * ✅ Accounts table: snake_case column names
 * ✅ Verification tokens: Composite primary key
 *
 * Custom table names configured for Drizzle adapter:
 * - users → users
 * - accounts → accounts
 * - authSessions → sessions (aliased for adapter)
 * - verificationTokens → verificationTokens
 *
 * See: https://authjs.dev/reference/adapter/drizzle#postgres
 */
export const authConfig: NextAuthConfig = {
  // Drizzle adapter for database sessions (Migration 007 complete)
  // Pass custom table schemas to map our naming to Auth.js defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as any),

  session: {
    strategy: 'database', // Database sessions (via Drizzle adapter)
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },

  // OAuth providers
  providers: [
    /**
     * Google OAuth 2.0
     * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
     *
     * Setup:
     * 1. Create OAuth 2.0 credentials in Google Cloud Console
     * 2. Add authorized redirect URI: https://your-domain.com/api/auth/callback/google
     * 3. Enable Google+ API
     */
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Request email and profile scopes
      authorization: {
        params: {
          scope: 'openid email profile',
          // PKCE flow for enhanced security
          code_challenge_method: 'S256',
        },
      },
    }),

    /**
     * Microsoft OAuth 2.0 (Azure AD / Entra ID)
     * Requires: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID
     *
     * Setup:
     * 1. Register app in Azure Portal (App Registrations)
     * 2. Add redirect URI: https://your-domain.com/api/auth/callback/microsoft-entra-id
     * 3. Enable "ID tokens" in Authentication settings
     * 4. Add API permissions: User.Read, email, profile, openid
     */
    Microsoft({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/v2.0`,
      authorization: {
        params: {
          scope: 'openid email profile User.Read',
          // PKCE flow for enhanced security
          code_challenge_method: 'S256',
        },
      },
    }),
  ],

  // Callbacks to customize behavior
  callbacks: {
    /**
     * JWT Callback - Called when JWT is created or updated
     * Add custom properties to the JWT token
     */
    async jwt({ token, user }) {
      // On sign-in, add user properties to JWT
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },

    /**
     * Session Callback - Called when session is checked (database strategy)
     * Add custom properties to the session object
     */
    async session({ session, user }) {
      // Database strategy: user comes from database
      if (session.user && user) {
        session.user.id = user.id;
        session.user.tenantId = user.tenantId;
        session.user.role = user.role;
      }
      return session;
    },

    /**
     * Sign In Callback - Control user sign-in access
     * Return true to allow sign-in, false to deny
     */
    async signIn({ user }) {
      // Allow sign-in if user exists in database
      // Additional authorization logic can be added here
      if (!user || !user.email) {
        return false;
      }

      // Check if user is associated with a tenant
      // (In production, implement tenant assignment logic)
      return true;
    },

    /**
     * Redirect Callback - Control where to redirect after sign-in
     */
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign-in
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  // Pages configuration
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
    signOut: '/auth/signout', // Custom sign-out page
    error: '/auth/error', // Error page
    verifyRequest: '/auth/verify-request', // Email verification page
  },

  // Events for logging and monitoring
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email} (${user.id})`);
    },
    async signOut() {
      console.log('User signed out');
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email} (${user.id})`);
    },
  },

  // Security configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  trustHost: true, // Trust proxy headers (required for deployment)

  // Debug mode (disable in production)
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Initialize Auth.js with configuration
 *
 * Explicit type annotations required for NextAuth v5 beta (TS2742 error workaround)
 * See: https://github.com/nextauthjs/next-auth/issues/7658
 */
const nextAuth = NextAuth(authConfig);

// Export with explicit types to fix TypeScript inference issues
// Using Request type from Web API standard since Next.js types not available in Fastify context
export const handlers: {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
} = nextAuth.handlers as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};

export const auth: () => Promise<Session | null> = nextAuth.auth as () => Promise<Session | null>;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
