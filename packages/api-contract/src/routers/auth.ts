import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { serviceDb, tenants, users, verificationTokens, estateDocuments, willData, poaData } from '@platform/db';
import {
  badRequest,
  conflict,
  createModuleLogger,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from '@platform/shared';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

const logger = createModuleLogger('auth-router');

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

const generateVerificationCodeSchema = z.object({
  identifier: z.string().min(1, 'Phone number or email is required'),
  type: z.enum(['email', 'phone'], {
    errorMap: () => ({ message: 'Type must be either "email" or "phone"' }),
  }),
});

const verifyCodeSchema = z.object({
  identifier: z.string().min(1, 'Phone number or email is required'),
  type: z.enum(['email', 'phone']),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const authRouter = router({
  /**
   * Login with email and password
   * Verifies credentials and creates Auth.js session
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw internalError({
        message: 'Service database not configured.',
      });
    }

    // Find user by email
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated login
    const [user] = await serviceDb
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        passwordHash: users.passwordHash,
        passwordAlgorithm: users.passwordAlgorithm,
        role: users.role,
        name: users.name,
        emailVerified: users.emailVerified,
        mfaEnabled: users.mfaEnabled,
        mfaSecret: users.mfaSecret,
        mfaBackupCodes: users.mfaBackupCodes,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw unauthorized({
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw forbidden({
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
      logger.error('Password verification error', { error });
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

      throw unauthorized({
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw forbidden({
        message: 'Please verify your email before logging in.',
      });
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        throw forbidden({
          message: 'MFA code required',
          meta: { reason: 'MFA_REQUIRED' },
        });
      }

      // Verify MFA code using real MFA service
      if (!user.mfaSecret) {
        throw internalError({
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
        throw unauthorized({
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
      throw internalError({
        message: 'Service database not configured.',
      });
    }

    // Check if user already exists
    // ⚠️ CRITICAL: Use serviceDb to bypass RLS for existence check
    const [existingUser] = await serviceDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser) {
      throw conflict({
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
        throw internalError({
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
        throw internalError({
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
    } catch (error: unknown) {
      // Handle PostgreSQL unique constraint violations
      const pgError = error as { cause?: { code?: string; constraint_name?: string } };
      if (pgError?.cause?.code === '23505') {
        // Unique constraint violation - email already exists
        if (pgError.cause?.constraint_name === 'users_email_unique') {
          throw conflict({
            message: 'User with this email already exists',
          });
        }
      }

      // Re-throw TRPCErrors as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log unexpected errors and throw generic error
      logger.error('Registration error', { error });
      throw internalError({
        message: 'Failed to create account. Please try again.',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Verify email address with token
   */
  verifyEmail: publicProcedure.input(verifyEmailSchema).mutation(async ({ input }) => {
    // Verify service database is available
    if (!serviceDb) {
      throw internalError({
        message: 'Service database not configured.',
      });
    }

    // Find verification token
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated email verification
    const [tokenRecord] = await serviceDb
      .select({
        identifier: verificationTokens.identifier,
        token: verificationTokens.token,
        expires: verificationTokens.expires,
      })
      .from(verificationTokens)
      .where(eq(verificationTokens.token, input.token))
      .limit(1);

    if (!tokenRecord) {
      throw notFound({
        message: 'Invalid or expired verification token',
      });
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      // Delete expired token
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw badRequest({
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await serviceDb
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, tokenRecord.identifier))
      .limit(1);

    if (!user) {
      throw notFound({
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
        throw internalError({
          message: 'Service database not configured.',
        });
      }

      // Find user
      // ⚠️ CRITICAL: Use serviceDb for unauthenticated operation
      const [user] = await serviceDb
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

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
      await serviceDb
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, input.email));

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
        throw internalError({
          message: 'Service database not configured.',
        });
      }

      // Find user
      // ⚠️ CRITICAL: Use serviceDb for unauthenticated operation
      const [user] = await serviceDb
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        };
      }

      // Delete any existing reset tokens for this email
      await serviceDb
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, input.email));

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
      throw internalError({
        message: 'Service database not configured.',
      });
    }

    // Find reset token
    // ⚠️ CRITICAL: Use serviceDb for unauthenticated password reset
    const [tokenRecord] = await serviceDb
      .select({
        identifier: verificationTokens.identifier,
        token: verificationTokens.token,
        expires: verificationTokens.expires,
      })
      .from(verificationTokens)
      .where(eq(verificationTokens.token, input.token))
      .limit(1);

    if (!tokenRecord) {
      throw notFound({
        message: 'Invalid or expired reset token',
      });
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expires) {
      // Delete expired token
      await serviceDb.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw badRequest({
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await serviceDb
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        passwordHash: users.passwordHash,
        passwordAlgorithm: users.passwordAlgorithm,
      })
      .from(users)
      .where(eq(users.email, tokenRecord.identifier))
      .limit(1);

    if (!user) {
      throw notFound({
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

  /**
   * Generate verification code for phone or email
   * Sends code via SMS (Twilio) or email (SendGrid)
   * Fix #3 - SMS verification implementation
   */
  generateVerificationCode: publicProcedure
    .input(generateVerificationCodeSchema)
    .mutation(async ({ input, ctx }) => {
      // Import services dynamically
      const { createVerificationCodeService } = await import('@platform/auth');
      // TEMP: SMS/Email services not yet implemented
      // const { createSMSService } = await import('@platform/api/services/sms');
      // const { createEmailService } = await import('@platform/api/services/email');

      // Get Redis from context
      if (!ctx.redis) {
        throw internalError({
          message: 'Redis not configured',
        });
      }

      // Create verification code service
      const verificationService = createVerificationCodeService(ctx.redis);

      try {
        // Generate code
        const result = await verificationService.generateCode(input.identifier, input.type);

        // TEMP: SMS/Email services not yet implemented - just return code for dev
        logger.info('Verification code generated (not sent - services pending)', {
          identifier: input.identifier.substring(0, 3) + '***',
          type: input.type,
          code: result.code, // TEMP: Remove in production
          expiresAt: result.expiresAt,
        });

        return {
          success: true,
          message: `Verification code generated: ${result.code} (TEMP: SMS/Email services pending)`,
          expiresAt: result.expiresAt,
        };
      } catch (error) {
        // If error is already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle rate limit errors
        if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
          throw badRequest({
            message: error.message,
          });
        }

        logger.error('Failed to generate verification code', { error });
        throw internalError({
          message: 'Failed to generate verification code',
        });
      }
    }),

  /**
   * Verify code for phone or email
   * Validates user-submitted verification code
   * Fix #3 - SMS verification implementation
   */
  verifyVerificationCode: publicProcedure.input(verifyCodeSchema).mutation(async ({ input, ctx }) => {
    // Import verification service
    const { createVerificationCodeService } = await import('@platform/auth');

    // Get Redis from context
    if (!ctx.redis) {
      throw internalError({
        message: 'Redis not configured',
      });
    }

    // Create verification code service
    const verificationService = createVerificationCodeService(ctx.redis);

    try {
      // Verify code
      const result = await verificationService.verifyCode(
        input.identifier,
        input.type,
        input.code
      );

      if (!result.valid) {
        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          EXPIRED: 'Verification code has expired. Please request a new code.',
          INVALID: `Invalid verification code. ${result.attemptsRemaining} attempts remaining.`,
          MAX_ATTEMPTS: 'Maximum verification attempts exceeded. Please request a new code.',
          NOT_FOUND: 'No verification code found. Please request a code first.',
        };

        throw badRequest({
          message: (result.error ? errorMessages[result.error] : 'Verification failed') || 'Verification failed',
        });
      }

      logger.info('Verification code verified successfully', {
        identifier: input.identifier.substring(0, 3) + '***',
        type: input.type,
      });

      return {
        success: true,
        message: 'Verification successful',
      };
    } catch (error) {
      // Re-throw TRPCErrors as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('Failed to verify code', { error });
      throw internalError({
        message: 'Failed to verify code',
      });
    }
  }),
});
