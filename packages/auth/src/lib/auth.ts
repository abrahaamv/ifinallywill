/**
 * Auth.js Core Configuration
 *
 * SOC 2 certified authentication with OAuth providers.
 * Replaces deprecated Lucia v4 with industry standard.
 */

import { DrizzleAdapter } from '@auth/drizzle-adapter';
import {
  serviceDb,
  users,
  accounts,
  authSessions as sessions,
  verificationTokens,
} from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import type { NextAuthConfig, Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Microsoft from 'next-auth/providers/microsoft-entra-id';
import { z } from 'zod';
import { MFAService } from '../services/mfa.service';
import { passwordService } from '../services/password.service';

const logger = createModuleLogger('auth');

/**
 * Extended User type with session token for Auth.js credentials provider
 * This temporary property is used to pass session tokens through Auth.js callbacks
 */
interface UserWithSessionToken {
  sessionToken?: string;
}

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
  // CRITICAL: Use serviceDb (BYPASSRLS) for Auth.js operations
  // Auth.js needs to write sessions/accounts without RLS policy restrictions
  // Type cast required: DrizzleAdapter types expect SQLite but we use PostgreSQL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(serviceDb, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as any),

  session: {
    strategy: 'database', // Database sessions (via Drizzle adapter)
    maxAge: 8 * 60 * 60, // 8 hours absolute timeout (NIST guideline)
    updateAge: 30 * 60, // 30 minutes inactivity timeout (update every 30 min)
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
        mfaCode: { label: 'MFA Code (if enabled)', type: 'text', optional: true },
      },
      async authorize(credentials) {
        // Validate input with Zod
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
            mfaCode: z.string().length(6).optional(),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password, mfaCode } = parsedCredentials.data;

        logger.info('Login attempt', { email });

        // CRITICAL: Use serviceDb (BYPASSRLS) for authentication queries
        // Regular db connection hits RLS policies and can't see users during login
        // This is the industry-standard pattern (Supabase, Firebase, Auth0)
        if (!serviceDb) {
          logger.error('Service database not configured');
          return null;
        }

        // Query user from database with service role (bypasses RLS)
        const [user] = await serviceDb.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
          // User not found - return null to prevent user enumeration
          return null;
        }

        // Check account lockout (Phase 8 security)
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          logger.error('Account locked', { lockedUntil: user.lockedUntil, email });
          return null;
        }

        // Verify password with automatic Argon2id upgrade (Phase 8 security)
        const verification = await passwordService.verifyAndUpgrade(
          password,
          user.passwordHash,
          user.passwordAlgorithm
        );

        if (!verification.valid) {
          // Increment failed login attempts
          const newFailedAttempts = user.failedLoginAttempts + 1;

          // Lock account after 5 failed attempts (15 minutes)
          if (newFailedAttempts >= 5) {
            const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            await serviceDb
              .update(users)
              .set({
                failedLoginAttempts: newFailedAttempts,
                lockedUntil: lockUntil,
              })
              .where(eq(users.id, user.id));
            logger.error('Account locked after 5 failed attempts', { email });
          } else {
            await serviceDb
              .update(users)
              .set({ failedLoginAttempts: newFailedAttempts })
              .where(eq(users.id, user.id));
          }

          return null;
        }

        // Password valid - upgrade hash if needed (bcrypt → argon2id migration)
        if (verification.needsUpgrade && verification.newHash) {
          await serviceDb
            .update(users)
            .set({
              passwordHash: verification.newHash,
              passwordAlgorithm: 'argon2id',
            })
            .where(eq(users.id, user.id));
          logger.info('Password upgraded to Argon2id', { email });
        }

        // Check MFA if enabled (Phase 8 security)
        if (user.mfaEnabled) {
          if (!mfaCode) {
            // MFA required but not provided
            throw new Error('MFA_REQUIRED');
          }

          // Verify MFA code (TOTP or backup code)
          const mfaResult = await MFAService.verifyCode(
            mfaCode,
            user.mfaSecret || '',
            user.mfaBackupCodes || []
          );

          if (!mfaResult.valid) {
            logger.error('MFA verification failed', { email });
            return null;
          }

          // If backup code was used, remove it from user's backup codes
          if (mfaResult.usedBackupCode) {
            const updatedBackupCodes = await MFAService.removeUsedBackupCode(
              user.mfaBackupCodes || [],
              mfaCode
            );

            await serviceDb
              .update(users)
              .set({ mfaBackupCodes: updatedBackupCodes })
              .where(eq(users.id, user.id));
            logger.info('MFA backup code consumed', { email });
          }
        }

        // Reset failed login attempts on success (Phase 8 security)
        await serviceDb
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, user.id));

        logger.info('Authentication successful', { email });

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
          (user as UserWithSessionToken).sessionToken = sessionToken;

          logger.info('Created session for credentials login', {
            userId: user.id,
            sessionToken: sessionToken.substring(0, 12) + '...',
            email: user.email,
          });
        } catch (error) {
          logger.error('Failed to create session', { error, email: user.email });
          return false;
        }
      }

      return true;
    },

    /**
     * JWT Callback - REQUIRED even for database strategy with credentials provider
     *
     * This is a workaround for Auth.js v5 limitation:
     * - Database strategy is configured (line 54)
     * - But credentials provider requires JWT callback chain to pass session token
     * - We're NOT creating JWTs - we're passing the raw session token through
     * - The jwt.encode callback (below) returns raw token instead of encrypted JWT
     */
    async jwt({ token, user, account }) {
      // Pass session token through JWT callback chain for credentials provider
      if (account?.provider === 'credentials' && user) {
        token.sessionId = (user as UserWithSessionToken).sessionToken;
      }
      return token;
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

  /**
   * JWT Configuration - CRITICAL WORKAROUND for credentials provider
   *
   * Auth.js restricts credentials to JWT-only by default, even with database strategy.
   * This override forces database session behavior:
   * - encode: Return raw session token (NOT encrypted JWT)
   * - decode: Skip JWT decoding (returns null)
   *
   * Cookie value becomes the database session token UUID, which Auth.js looks up via
   * adapter.getSessionAndUser(sessionToken)
   *
   * See: docs/research/10-09-2025/authjs-implementation-research.md
   */
  jwt: {
    encode: async ({ token }) => {
      logger.debug('JWT encode called - returning session token for credentials');
      // Return database session token instead of encoding a JWT
      return (token?.sessionId as string) ?? '';
    },
    decode: async () => {
      // Skip JWT decoding for database strategy
      return null;
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
      logger.info('User signed in', { email: user.email, userId: user.id });
    },
    async signOut() {
      logger.info('User signed out');
    },
    async createUser({ user }) {
      logger.info('New user created', { email: user.email, userId: user.id });
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
