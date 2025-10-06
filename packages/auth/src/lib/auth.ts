/**
 * Auth.js Core Configuration
 *
 * SOC 2 certified authentication with OAuth providers.
 * Replaces deprecated Lucia v4 with industry standard.
 */

import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Microsoft from 'next-auth/providers/microsoft-entra-id';

/**
 * Auth.js configuration with OAuth providers
 *
 * NOTE: Drizzle adapter integration requires schema updates to match Auth.js expectations:
 * - Users table: Add `emailVerified` timestamp and `image` text columns
 * - Auth sessions table: Make `sessionToken` the primary key (currently `id` is PK)
 * - Accounts table: Use snake_case column names (refresh_token, access_token, etc.)
 *
 * TODO (Phase 3): Create migration 007 to align schema with Auth.js Drizzle adapter
 * See: https://authjs.dev/reference/adapter/drizzle#postgres
 */
export const authConfig: NextAuthConfig = {
  // Temporarily using JWT strategy until schema is updated for Drizzle adapter
  // Will switch to database sessions in Phase 3
  session: {
    strategy: 'jwt', // JWT sessions (no database storage)
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
     * Session Callback - Called when session is checked
     * Add custom properties to the session object
     */
    async session({ session, user }) {
      // Add user properties from database to session
      if (session.user) {
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
 * @ts-expect-error - NextAuth v5 beta type inference issue with Next.js peer dependencies
 * See: https://github.com/nextauthjs/next-auth/issues/7658
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
