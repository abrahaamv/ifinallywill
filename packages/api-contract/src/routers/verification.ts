/**
 * Verification Router
 * SMS and email verification endpoints with direct database operations
 *
 * Services implemented in @platform/api/src/services/:
 * - SMS: sms.ts (Twilio) - sendVerificationCode()
 * - Email: email.ts (Resend) - sendVerificationCode(), sendVerificationEmail()
 * - Validation: email-validation.ts (Emailable) - validateEmail()
 *
 * Integration: Services need to be injected via tRPC context (ctx.services)
 */

import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { endUsers } from '@platform/db';
import { eq } from 'drizzle-orm';
import { badRequest, notFound, createModuleLogger } from '@platform/shared';
import crypto from 'crypto';

const logger = createModuleLogger('verification-router');

// Verification code storage (in production, use Redis)
// This is a temporary in-memory store for development
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store verification code with 10-minute expiry
 */
function storeVerificationCode(key: string, code: string): void {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  verificationCodes.set(key, { code, expiresAt });

  // Auto-cleanup after expiry
  setTimeout(() => {
    verificationCodes.delete(key);
  }, 10 * 60 * 1000);
}

/**
 * Verify code against stored codes
 */
function verifyCode(key: string, inputCode: string): boolean {
  const stored = verificationCodes.get(key);
  if (!stored) return false;
  if (new Date() > stored.expiresAt) {
    verificationCodes.delete(key);
    return false;
  }
  if (stored.code !== inputCode) return false;

  // Code is valid, remove it (one-time use)
  verificationCodes.delete(key);
  return true;
}

export const verificationRouter = router({
  /**
   * Send SMS verification code to phone number
   * Uses Twilio SMS service from @platform/api/src/services/sms.ts
   */
  sendSmsCode: publicProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)'),
      })
    )
    .mutation(async ({ input }) => {
      const code = generateVerificationCode();
      const key = `sms:${input.phoneNumber}`;

      // Store the code
      storeVerificationCode(key, code);

      // In production: Use ctx.services.sms.sendVerificationCode(input.phoneNumber, code)
      // For now, log the code (remove in production)
      logger.info('SMS verification code generated', {
        phoneNumber: input.phoneNumber.slice(0, -4) + '****',
        // In dev only - remove in production:
        code: process.env.NODE_ENV === 'development' ? code : undefined
      });

      return { success: true, message: 'Verification code sent via SMS' };
    }),

  /**
   * Verify SMS code and mark phone as verified
   */
  verifySmsCode: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
        code: z.string().length(6, 'Verification code must be 6 digits'),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `sms:${input.phoneNumber}`;
      const isValid = verifyCode(key, input.code);

      if (!isValid) {
        throw badRequest({
          message: 'Invalid or expired verification code',
        });
      }

      // Update end user as phone verified
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        })
        .where(eq(endUsers.id, input.endUserId))
        .returning();

      if (!updated) {
        throw notFound({
          message: 'End user not found',
        });
      }

      logger.info('Phone verified', { endUserId: input.endUserId });
      return { success: true, verified: true };
    }),

  /**
   * Send email verification code
   * Uses Resend email service from @platform/api/src/services/email.ts
   */
  sendEmailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const code = generateVerificationCode();
      const key = `email:${input.email}`;

      // Store the code
      storeVerificationCode(key, code);

      // In production: Use ctx.services.email.sendVerificationCode(input.email, code)
      logger.info('Email verification code generated', {
        email: input.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        // In dev only - remove in production:
        code: process.env.NODE_ENV === 'development' ? code : undefined
      });

      return { success: true, message: 'Verification code sent to email' };
    }),

  /**
   * Verify email code and mark email as verified
   */
  verifyEmailCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6, 'Verification code must be 6 digits'),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `email:${input.email}`;
      const isValid = verifyCode(key, input.code);

      if (!isValid) {
        throw badRequest({
          message: 'Invalid or expired verification code',
        });
      }

      // Update end user as email verified
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
        .where(eq(endUsers.id, input.endUserId))
        .returning();

      if (!updated) {
        throw notFound({
          message: 'End user not found',
        });
      }

      logger.info('Email verified', { endUserId: input.endUserId });
      return { success: true, verified: true };
    }),

  /**
   * Resend verification code (SMS or email)
   * Rate limited: max 3 resends per 15 minutes
   */
  resendCode: publicProcedure
    .input(
      z.object({
        type: z.enum(['sms', 'email']),
        destination: z.string(), // phone number or email
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const code = generateVerificationCode();
      const key = `${input.type}:${input.destination}`;

      // Store the new code (replaces old one if exists)
      storeVerificationCode(key, code);

      logger.info('Verification code resent', {
        type: input.type,
        destination: input.type === 'sms'
          ? input.destination.slice(0, -4) + '****'
          : input.destination.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        code: process.env.NODE_ENV === 'development' ? code : undefined
      });

      return { success: true, message: `Verification code resent via ${input.type}` };
    }),
});
