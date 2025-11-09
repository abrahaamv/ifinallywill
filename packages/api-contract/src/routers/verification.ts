/**
 * Verification Router
 * SMS and email verification endpoints with direct database operations
 */

import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { endUsers } from '@platform/db';
import { eq } from 'drizzle-orm';
import { badRequest, notFound } from '@platform/shared';

export const verificationRouter = router({
  /**
   * Send SMS verification code to phone number
   * NOTE: Actual SMS sending should be implemented in the API package
   * This router just validates and returns success
   */
  sendSmsCode: publicProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)'),
      })
    )
    .mutation(async () => {
      // TODO: Implement SMS sending in API package using Twilio
      // For now, just return success (SMS service should be in @platform/api)
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
      // TODO: Verify code against stored codes in Redis (implement in API package)
      // For now, accept any 6-digit code for testing
      const isValid = input.code.length === 6;

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

      return { success: true, verified: true };
    }),

  /**
   * Send email verification link
   */
  sendEmailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async () => {
      // TODO: Implement email sending in API package using SendGrid
      // For now, just return success
      return { success: true, message: 'Verification email sent' };
    }),

  /**
   * Verify email token and mark email as verified
   */
  verifyEmailToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(20),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Verify token against stored tokens in database (implement in API package)
      // For now, accept any token for testing
      const isValid = input.token.length >= 20;

      if (!isValid) {
        throw badRequest({
          message: 'Invalid or expired verification token',
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

      return { success: true, verified: true };
    }),

  /**
   * Resend verification email
   */
  resendEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async () => {
      // TODO: Implement email resending with rate limiting in API package
      // For now, just return success
      return { success: true, message: 'Verification email resent' };
    }),
});
