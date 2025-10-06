import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@platform/db';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Auth.js Configuration
 *
 * Implements session-based authentication with OAuth providers.
 * Uses Drizzle adapter for database session storage.
 *
 * Security features:
 * - PKCE flow for OAuth
 * - Secure session cookies
 * - CSRF protection
 * - Session refresh on window focus
 */
export const authConfig: NextAuthConfig = {
  // Database adapter for session storage
  adapter: DrizzleAdapter(db),

  // OAuth providers
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  // Session strategy
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Pages configuration
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },

  // Callbacks for customization
  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     * We use database sessions, so this is only for token creation
     */
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },

    /**
     * Session callback - runs when session is checked
     * Add custom user data to session object
     */
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Add tenant ID from user record
        // This will be used for tenant context in database queries
        session.user.tenantId = (user as { tenantId?: string }).tenantId;
      }
      return session;
    },

    /**
     * Sign in callback - control if user is allowed to sign in
     * Add custom authentication logic here
     */
    async signIn({ account }) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        return true;
      }

      // Deny by default
      return false;
    },

    /**
     * Redirect callback - control where user is redirected after sign in/out
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  // Events for logging and monitoring
  events: {
    async signIn({ user, account }) {
      console.log('User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
      });
    },
    async signOut() {
      console.log('User signed out');
    },
    async createUser({ user }) {
      console.log('New user created:', {
        userId: user.id,
        email: user.email,
      });
    },
    async linkAccount({ user, account }) {
      console.log('Account linked:', {
        userId: user.id,
        provider: account.provider,
      });
    },
  },

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Security options
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};
