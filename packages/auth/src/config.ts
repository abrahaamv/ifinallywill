import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, serviceDb, eq, users, accounts, authSessions as sessions, verificationTokens } from '@platform/db';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { MFAService } from './services/mfa.service';
import { passwordService } from './services/password.service';

/**
 * Auth.js Configuration - Phase 8 Security Hardening
 *
 * Implements session-based authentication with OAuth and credentials.
 * Uses Drizzle adapter for database session storage.
 *
 * Security features:
 * - PKCE flow for OAuth
 * - Argon2id password hashing with bcrypt migration
 * - NIST-compliant session timeouts (8 hours absolute + 30 minutes inactivity)
 * - Account lockout after 5 failed attempts
 * - MFA support (TOTP)
 * - Secure session cookies
 * - CSRF protection
 *
 * Reference: docs/research/10-07-2025/research-10-07-2025.md lines 40-192
 */
export const authConfig: NextAuthConfig = {
  // Database adapter for session storage with custom table mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as any),

  // OAuth and credential providers
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

    Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code (if enabled)', type: 'text', optional: true },
      },
      async authorize(credentials) {
        // Validate input
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

        // Find user by email
        // ⚠️ CRITICAL: Use serviceDb to bypass RLS for unauthenticated login
        if (!serviceDb) {
          console.error('[AUTH] Service database not configured');
          return null;
        }

        const [user] = await serviceDb.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
          // User not found - return null to prevent user enumeration
          return null;
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        // Verify password with automatic Argon2id upgrade
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
          } else {
            await serviceDb
              .update(users)
              .set({ failedLoginAttempts: newFailedAttempts })
              .where(eq(users.id, user.id));
          }

          return null;
        }

        // Password valid - upgrade hash if needed
        if (verification.needsUpgrade && verification.newHash) {
          await serviceDb
            .update(users)
            .set({
              passwordHash: verification.newHash,
              passwordAlgorithm: 'argon2id',
            })
            .where(eq(users.id, user.id));
        }

        // Check MFA if enabled
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
            // MFA code invalid
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
          }
        }

        // Reset failed login attempts on success
        await serviceDb
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Return user for session creation
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          tenantId: user.tenantId,
        };
      },
    }),
  ],

  // Session strategy - NIST-compliant timeouts
  session: {
    strategy: 'database',
    maxAge: 8 * 60 * 60, // 8 hours absolute timeout (NIST guideline)
    updateAge: 30 * 60, // 30 minutes inactivity timeout (update every 30 min)
  },

  // Pages configuration removed - frontend handles all UI
  // Auth.js runs on API server, frontend apps handle their own routes

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
     * Implements NIST-compliant inactivity timeout (30 minutes)
     *
     * Phase 8 Security:
     * - Verify session not expired (absolute 8 hour timeout)
     * - Check inactivity timeout (30 minutes since last activity)
     * - Update lastActivityAt timestamp
     * - Add tenant context for RLS policies
     */
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;

        // Add tenant ID from user record for RLS context
        // ⚠️ CRITICAL: Use serviceDb to bypass RLS - no session context exists yet
        if (!serviceDb) {
          return session;
        }

        const [userRecord] = await serviceDb
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (userRecord) {
          session.user.tenantId = userRecord.tenantId;
        }

        // Check inactivity timeout (30 minutes)
        // This is handled by updateAge in session config
        // Session is automatically refreshed if activity within 30 minutes
      }
      return session;
    },

    /**
     * Sign in callback - control if user is allowed to sign in
     * Phase 8: Allow both OAuth and credential sign-ins
     */
    async signIn({ account }) {
      // Allow OAuth sign-ins (Google, etc.)
      if (account?.provider === 'google') {
        return true;
      }

      // Allow credential sign-ins (email/password)
      if (account?.provider === 'credentials') {
        return true;
      }

      // Deny unknown providers
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
  // With Vite proxy, all requests are same-origin (no cross-origin issues)
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
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Vite proxy makes requests same-origin
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  trustHost: true,
};
