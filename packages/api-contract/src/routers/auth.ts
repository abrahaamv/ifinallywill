import crypto from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { tenants, users, verificationTokens } from '@platform/db';

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

export const authRouter = router({
  /**
   * Register a new user and create their tenant
   * First user becomes owner of new tenant
   */
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    // Check if user already exists
    const [existingUser] = await ctx.db
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

    // Create tenant for the new user
    const apiKey = `pk_live_${crypto.randomBytes(32).toString('hex')}`;
    const [newTenant] = await ctx.db
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
    const [newUser] = await ctx.db
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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await ctx.db.insert(verificationTokens).values({
      identifier: input.email,
      token: verificationToken,
      expires: expiresAt,
    });

    // TODO: Send verification email
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
  }),

  /**
   * Verify email address with token
   */
  verifyEmail: publicProcedure.input(verifyEmailSchema).mutation(async ({ ctx, input }) => {
    // Find verification token
    const [tokenRecord] = await ctx.db
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
      await ctx.db.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await ctx.db
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
    await ctx.db
      .update(users)
      .set({
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Delete verification token
    await ctx.db.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

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
    .mutation(async ({ ctx, input }) => {
      // Find user
      const [user] = await ctx.db
        .select()
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
      await ctx.db.delete(verificationTokens).where(eq(verificationTokens.identifier, input.email));

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires: expiresAt,
      });

      // TODO: Send verification email
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
    .mutation(async ({ ctx, input }) => {
      // Find user
      const [user] = await ctx.db
        .select()
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
      await ctx.db.delete(verificationTokens).where(eq(verificationTokens.identifier, input.email));

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry (shorter than email verification)

      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: resetToken,
        expires: expiresAt,
      });

      // TODO: Send password reset email
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
  resetPassword: publicProcedure.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
    // Find reset token
    const [tokenRecord] = await ctx.db
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
      await ctx.db.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Find user by email
    const [user] = await ctx.db
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
    await ctx.db
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
    await ctx.db.delete(verificationTokens).where(eq(verificationTokens.token, input.token));

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }),
});
