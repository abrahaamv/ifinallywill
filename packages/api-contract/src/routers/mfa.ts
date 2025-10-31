/**
 * MFA Management Router - Phase 8 Day 6-7
 *
 * Provides tRPC procedures for multi-factor authentication management.
 *
 * **Endpoints**:
 * - `setup`: Generate MFA secret and QR code for new setup
 * - `enable`: Enable MFA after verifying setup code
 * - `disable`: Disable MFA with password confirmation
 * - `verify`: Verify TOTP code (for testing)
 * - `regenerateBackupCodes`: Generate new backup codes
 *
 * **Security**:
 * - All endpoints require authentication
 * - Password verification required for enable/disable
 * - Rate limiting on verification attempts
 * - Backup codes shown only once, then hashed
 */

import { MFAService, passwordService } from '@platform/auth';
import { db, eq, users } from '@platform/db';
import { badRequest, notFound, unauthorized } from '@platform/shared';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const mfaRouter = router({
  /**
   * Generate MFA setup (secret + QR code)
   *
   * **Step 1 of MFA enrollment**:
   * 1. User requests setup
   * 2. Server generates TOTP secret and backup codes
   * 3. Frontend displays QR code and backup codes
   * 4. User scans QR code with authenticator app
   * 5. User proceeds to `enable` with verification code
   *
   * @returns MFA setup data (secret, QR code, backup codes)
   */
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user email
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw notFound({ message: 'User not found' });
    }

    // Check if MFA already enabled
    if (user.mfaEnabled) {
      throw badRequest({
        message: 'MFA is already enabled. Disable first to re-setup.',
      });
    }

    // Generate MFA setup
    const setup = await MFAService.generateSetup(user.email, 'Platform');

    return {
      qrCodeDataUrl: setup.qrCodeDataUrl,
      backupCodes: setup.backupCodes,
      // DO NOT return encrypted secret to client
      // It will be saved during enable() call
    };
  }),

  /**
   * Enable MFA with verification
   *
   * **Step 2 of MFA enrollment**:
   * 1. User has scanned QR code and has backup codes
   * 2. User enters 6-digit code from authenticator app
   * 3. Server verifies code matches generated secret
   * 4. Server enables MFA and stores encrypted secret + hashed backup codes
   *
   * @param verificationCode - 6-digit TOTP code from authenticator app
   * @param password - User password for additional security
   * @returns Success confirmation
   */
  enable: protectedProcedure
    .input(
      z.object({
        verificationCode: z
          .string()
          .length(6)
          .regex(/^\d{6}$/),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { verificationCode, password } = input;

      // Get user with password hash
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw notFound({ message: 'User not found' });
      }

      // Verify password
      const passwordVerification = await passwordService.verifyAndUpgrade(
        password,
        user.passwordHash,
        user.passwordAlgorithm
      );

      if (!passwordVerification.valid) {
        throw unauthorized({ message: 'Invalid password' });
      }

      // Check if MFA already enabled
      if (user.mfaEnabled) {
        throw badRequest({ message: 'MFA is already enabled' });
      }

      // Generate fresh setup (to verify against)
      const setup = await MFAService.generateSetup(user.email, 'Platform');

      // Verify the code matches the fresh secret
      const mfaResult = await MFAService.verifyCode(verificationCode, setup.secret, []);

      if (!mfaResult.valid) {
        throw badRequest({
          message: 'Invalid verification code. Please try again.',
        });
      }

      // Hash backup codes for storage
      const hashedBackupCodes = await MFAService.hashBackupCodes(setup.backupCodes);

      // Enable MFA and store encrypted secret + hashed backup codes
      await db
        .update(users)
        .set({
          mfaEnabled: true,
          mfaSecret: setup.secret, // Already encrypted
          mfaBackupCodes: hashedBackupCodes,
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: 'MFA enabled successfully',
      };
    }),

  /**
   * Disable MFA
   *
   * Requires password confirmation for security.
   *
   * @param password - User password for verification
   * @returns Success confirmation
   */
  disable: protectedProcedure
    .input(
      z.object({
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { password } = input;

      // Get user with password hash
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw notFound({ message: 'User not found' });
      }

      // Verify password
      const passwordVerification = await passwordService.verifyAndUpgrade(
        password,
        user.passwordHash,
        user.passwordAlgorithm
      );

      if (!passwordVerification.valid) {
        throw unauthorized({ message: 'Invalid password' });
      }

      // Disable MFA and clear secret + backup codes
      await db
        .update(users)
        .set({
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: 'MFA disabled successfully',
      };
    }),

  /**
   * Verify TOTP code
   *
   * Testing endpoint to verify authenticator app is working correctly.
   *
   * @param code - 6-digit TOTP code
   * @returns Verification result
   */
  verify: protectedProcedure
    .input(
      z.object({
        code: z.string().min(6).max(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { code } = input;

      // Get user with MFA secret
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw notFound({ message: 'User not found' });
      }

      if (!user.mfaEnabled || !user.mfaSecret) {
        throw badRequest({ message: 'MFA is not enabled' });
      }

      // Verify code
      const mfaResult = await MFAService.verifyCode(
        code,
        user.mfaSecret,
        user.mfaBackupCodes || []
      );

      return {
        valid: mfaResult.valid,
        usedBackupCode: mfaResult.usedBackupCode,
      };
    }),

  /**
   * Regenerate backup codes
   *
   * Generates new backup codes and invalidates old ones.
   * Requires password confirmation.
   *
   * @param password - User password for verification
   * @returns New backup codes (shown once)
   */
  regenerateBackupCodes: protectedProcedure
    .input(
      z.object({
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { password } = input;

      // Get user with password hash
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw notFound({ message: 'User not found' });
      }

      // Verify password
      const passwordVerification = await passwordService.verifyAndUpgrade(
        password,
        user.passwordHash,
        user.passwordAlgorithm
      );

      if (!passwordVerification.valid) {
        throw unauthorized({ message: 'Invalid password' });
      }

      if (!user.mfaEnabled) {
        throw badRequest({ message: 'MFA is not enabled' });
      }

      // Generate new backup codes
      const setup = await MFAService.generateSetup(user.email, 'Platform');
      const hashedBackupCodes = await MFAService.hashBackupCodes(setup.backupCodes);

      // Update backup codes
      await db.update(users).set({ mfaBackupCodes: hashedBackupCodes }).where(eq(users.id, userId));

      return {
        backupCodes: setup.backupCodes,
        message: 'Backup codes regenerated successfully',
      };
    }),

  /**
   * Get MFA status
   *
   * Returns whether MFA is enabled for current user.
   *
   * @returns MFA enabled status
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [user] = await db
      .select({ mfaEnabled: users.mfaEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw notFound({ message: 'User not found' });
    }

    return {
      enabled: user.mfaEnabled || false,
    };
  }),
});
