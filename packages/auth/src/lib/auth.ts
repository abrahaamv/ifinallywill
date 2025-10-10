/**
 * Auth.js Core Configuration
 *
 * SOC 2 certified authentication with OAuth providers.
 * Replaces deprecated Lucia v4 with industry standard.
 */

import { DrizzleAdapter } from '@auth/drizzle-adapter';
import {
  db,
  serviceDb,
  users,
  accounts,
  authSessions as sessions,
  verificationTokens,
} from '@platform/db';
import { verify as verifyArgon2 } from 'argon2';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import type { NextAuthConfig, Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
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

  // Authentication providers
  providers: [
    /**
     * Email/Password Credentials Provider
     *
     * SECURITY NOTE: Database strategy requires manual session creation
     * Auth.js v5 doesn't auto-create sessions for credentials provider with database adapter
     * We handle this in the signIn callback below
     */
    Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[Auth] Credentials authorize called');

        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] Missing email or password');
          throw new Error('Email and password required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        console.log('[Auth] Login attempt for email:', email);

        // CRITICAL: Use serviceDb (BYPASSRLS) for authentication queries
        // Regular db connection hits RLS policies and can't see users during login
        // This is the industry-standard pattern (Supabase, Firebase, Auth0)
        if (!serviceDb) {
          console.error('[Auth] Service database not configured');
          throw new Error('Service database not configured - set SERVICE_DATABASE_URL');
        }

        // Query user from database with service role (bypasses RLS)
        const [user] = await serviceDb.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
          console.error('[Auth] User not found:', email);
          throw new Error('Invalid email or password');
        }

        console.log('[Auth] User found:', {
          id: user.id,
          email: user.email,
          algorithm: user.passwordAlgorithm,
          hasHash: !!user.passwordHash,
        });

        // Verify password using Argon2id (OWASP 2025 recommended standard)
        let isValidPassword = false;

        try {
          if (user.passwordAlgorithm !== 'argon2id') {
            console.error('[Auth] Unsupported password algorithm:', user.passwordAlgorithm);
            throw new Error('Invalid email or password');
          }

          console.log('[Auth] Using Argon2id verification');
          isValidPassword = await verifyArgon2(user.passwordHash, password);
          console.log('[Auth] Argon2id verification result:', isValidPassword);
        } catch (error) {
          console.error('[Auth] Password verification error:', error);
          throw new Error('Invalid email or password');
        }

        if (!isValidPassword) {
          console.error('[Auth] Password verification failed for:', email);
          throw new Error('Invalid email or password');
        }

        console.log('[Auth] Authentication successful for:', email);

        // Return user object (Auth.js will handle session creation in signIn callback)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),

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
     * Session Callback - Called when session is checked (database strategy)
     * Add custom properties to the session object from database user record
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
     *
     * CRITICAL: For credentials provider with database strategy,
     * we must manually create the session here.
     * OAuth providers handle this automatically through the adapter.
     */
    async signIn({ user, account }) {
      // Allow sign-in if user exists in database
      if (!user || !user.email) {
        return false;
      }

      // For credentials provider, manually create session
      // Auth.js v5 doesn't auto-create sessions for credentials with database adapter
      if (account?.provider === 'credentials') {
        try {
          // Generate session token and expiry
          const sessionToken = crypto.randomUUID();
          const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          // Create session in database
          await authConfig.adapter!.createSession!({
            sessionToken,
            userId: user.id as string,
            expires: sessionExpiry,
          });

          // Store session token in user object for cookie setting
          (user as any).sessionToken = sessionToken;

          console.log('[Auth] Created session for credentials login:', {
            userId: user.id,
            sessionToken: sessionToken.substring(0, 12) + '...',
          });
        } catch (error) {
          console.error('[Auth] Failed to create session:', error);
          return false;
        }
      }

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
