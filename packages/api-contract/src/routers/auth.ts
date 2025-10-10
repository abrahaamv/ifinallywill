import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { serviceDb, tenants, users, verificationTokens } from '@platform/db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

export const authRouter = router({
  /**
   * Login with email and password
   * Verifies credentials and creates Auth.js session
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Service database not configured.',
      });
    }

    // Find user by email
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated login
    const [user] = await serviceDb.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Account is locked due to too many failed login attempts. Try again later.`,
      });
    }

    // Verify password using Argon2id
    let isValidPassword = false;
    try {
      isValidPassword = await verify(user.passwordHash, input.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
    } catch (error) {
      console.error('Password verification error:', error);
      isValidPassword = false;
    }

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 15);
        await serviceDb
          .update(users)
          .set({
            failedLoginAttempts: failedAttempts,
            lockedUntil: lockUntil,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      } else {
        await serviceDb
          .update(users)
          .set({
            failedLoginAttempts: failedAttempts,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Please verify your email before logging in.',
      });
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'MFA code required',
          cause: 'MFA_REQUIRED',
        });
      }

      // Verify MFA code using real MFA service
      if (!user.mfaSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'MFA secret not configured for this account',
        });
      }

      // Import MFA service dynamically to avoid circular dependencies
      const { MFAService } = await import('@platform/auth');
      const verification = await MFAService.verifyCode(
        input.mfaCode,
        user.mfaSecret,
        user.mfaBackupCodes || []
      );

      if (!verification.valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid MFA code',
        });
      }
    }

    // Reset failed login attempts on successful login
    await serviceDb
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Return user data for session creation
    // Note: Actual session creation is handled by Auth.js middleware
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
      },
    };
  }),

  /**
   * Register a new user and create their tenant
   * First user becomes owner of new tenant
   */
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Service database not configured. Set SERVICE_DATABASE_URL environment variable.',
      });
    }

    // Check if user already exists
    // ⚠️ CRITICAL: Use serviceDb to bypass RLS for existence check
    const [existingUser] = await serviceDb
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User with this email already exists',
      });
    }

    // Hash password with Argon2id (OWASP 2025 standard)
    const passwordHash = await hash(input.password, {
      memoryCost: 19456, // 19 MiB
      timeCost: 2, // 2 iterations
      outputLen: 32, // 32 bytes
      parallelism: 1, // 1 thread
    });

    try {
      // Create tenant for the new user
      // ⚠️ CRITICAL: Use serviceDb to bypass RLS for registration
      const apiKey = `pk_live_${crypto.randomBytes(32).toString('hex')}`;
      const [newTenant] = await serviceDb
        .insert(tenants)
        .values({
          name: input.organizationName,
          apiKey,
          plan: 'starter', // Start with starter plan
          settings: {
            maxMonthlySpend: 100, // Starter tier limit
            allowedDomains: [],
            features: ['chat'], // Basic features only
          },
        })
        .returning();

      if (!newTenant) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create tenant',
        });
      }

      // Create user as owner of the tenant
      // ⚠️ CRITICAL: Use serviceDb to bypass RLS for registration
      const [newUser] = await serviceDb
        .insert(users)
        .values({
          tenantId: newTenant.id,
          email: input.email,
          passwordHash,
          passwordAlgorithm: 'argon2id',
          role: 'owner', // First user is always owner
          name: input.name,
          emailVerified: null, // Email not verified yet
        })
        .returning();

      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }

      // Generate email verification token
      // ⚠️ CRITICAL: Use serviceDb to bypass RLS for registration
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

      await serviceDb.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires: expiresAt,
      });

      // Email verification will be implemented in Phase 8 (Email service integration)
      // For now, return token for testing purposes
      // In production, this should be sent via email and not returned

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
        },
        // DEVELOPMENT ONLY - Remove in production
        verificationToken,
      };
    } catch (error: any) {
      // Handle PostgreSQL unique constraint violations
      if (error?.cause?.code === '23505') {
        // Unique constraint violation - email already exists
        if (error.cause.constraint_name === 'users_email_unique') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with this email already exists',
          });
        }
      }

      // Re-throw TRPCErrors as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log unexpected errors and throw generic error
      console.error('Registration error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create account. Please try again.',
      });
    }
  }),

  /**
   * Verify email address with token
   */
  verifyEmail: publicProcedure.input(verifyEmailSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Service database not configured.',
      });
    }

    // Find verification token
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated email verification
    const [tokenRecord] = await serviceDb
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, input.token))
      .limit(1);

    if (!tokenRecord) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid or expired verification token',
      });
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      // Delete expired token
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await serviceDb
      .select()
      .from(users)
      .where(eq(users.email, tokenRecord.identifier))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Update user email verified status
    await serviceDb
      .update(users)
      .set({
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Delete verification token
    await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }),

  /**
   * Resend email verification token
   */
  resendVerification: publicProcedure
    .input(resendVerificationSchema)
    .mutation(async ({ input }) => {
      // Verify service database is available
      if (!serviceDb) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Service database not configured.',
        });
      }

      // Find user
      // ⚠️ CRITICAL: Use serviceDb for unauthenticated operation
      const [user] = await serviceDb.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: 'If the email exists, a verification link has been sent.',
        };
      }

      // Check if already verified
      if (user.emailVerified) {
        return {
          success: true,
          message: 'Email is already verified.',
        };
      }

      // Delete any existing verification tokens for this email
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.identifier, input.email));

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

      await serviceDb.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires: expiresAt,
      });

      // Email verification will be implemented in Phase 8 (Email service integration)
      // For now, log token for testing purposes

      return {
        success: true,
        message: 'If the email exists, a verification link has been sent.',
        // DEVELOPMENT ONLY - Remove in production
        verificationToken,
      };
    }),

  /**
   * Request password reset
   */
  resetPasswordRequest: publicProcedure
    .input(resetPasswordRequestSchema)
    .mutation(async ({ input }) => {
      // Verify service database is available
      if (!serviceDb) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Service database not configured.',
        });
      }

      // Find user
      // ⚠️ CRITICAL: Use serviceDb for unauthenticated operation
      const [user] = await serviceDb.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        };
      }

      // Delete any existing reset tokens for this email
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.identifier, input.email));

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry (shorter than email verification)

      await serviceDb.insert(verificationTokens).values({
        identifier: input.email,
        token: resetToken,
        expires: expiresAt,
      });

      // Password reset emails will be implemented in Phase 8 (Email service integration)
      // For now, log token for testing purposes

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
        // DEVELOPMENT ONLY - Remove in production
        resetToken,
      };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure.input(resetPasswordSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Service database not configured.',
      });
    }

    // Find reset token
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated password reset
    const [tokenRecord] = await serviceDb
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, input.token))
      .limit(1);

    if (!tokenRecord) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid or expired reset token',
      });
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      // Delete expired token
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await serviceDb
      .select()
      .from(users)
      .where(eq(users.email, tokenRecord.identifier))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Hash new password with Argon2id
    const passwordHash = await hash(input.password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Update user password and clear account lockout
    await serviceDb
      .update(users)
      .set({
        passwordHash,
        passwordAlgorithm: 'argon2id',
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Delete reset token
    await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }),

  /**
   * Get current Auth.js session
   * Returns user data if authenticated, null otherwise
   */
  getSession: publicProcedure.query(async ({ ctx }) => {
    // Return session directly from context (already populated by createContext)
    return { user: ctx.session?.user || null };
  }),

  /**
   * Sign out current user
   * Clears Auth.js session
   */
  signOut: publicProcedure.mutation(async () => {
    // Auth.js signOut is handled by /api/auth/signout endpoint
    // This endpoint just returns success to trigger client-side redirect
    return {
      success: true,
      message: 'Signed out successfully',
    };
  }),
});
