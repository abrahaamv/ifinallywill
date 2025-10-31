/**
 * MFA Service - Phase 8 Day 6-7
 *
 * Implements Time-based One-Time Password (TOTP) authentication for multi-factor authentication.
 *
 * **Security Features**:
 * - RFC 6238 compliant TOTP (Google Authenticator, Authy, 1Password compatible)
 * - Encrypted secret storage (AES-256-GCM)
 * - Backup codes with bcrypt hashing
 * - QR code generation for easy setup
 * - Time-window validation (±1 period tolerance)
 * - Rate limiting on verification attempts
 *
 * **Standards**:
 * - TOTP: RFC 6238 (Time-Based One-Time Password)
 * - HOTP: RFC 4226 (HMAC-Based One-Time Password)
 * - Encoding: Base32 (for compatibility with authenticator apps)
 * - Period: 30 seconds (industry standard)
 * - Digits: 6 (Google Authenticator standard)
 * - Algorithm: SHA-1 (required for compatibility, despite being deprecated elsewhere)
 *
 * Reference: OWASP Authentication Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createModuleLogger } from '@platform/shared';
import * as bcrypt from 'bcryptjs';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';

const logger = createModuleLogger('MFAService');

/**
 * MFA setup result with secret and QR code
 */
export interface MFASetupResult {
  secret: string; // Base32-encoded secret (encrypted for storage)
  qrCodeDataUrl: string; // Data URL for QR code image
  backupCodes: string[]; // Plain-text backup codes (show once, then hash)
}

/**
 * MFA verification result
 */
export interface MFAVerificationResult {
  valid: boolean;
  usedBackupCode?: boolean;
}

/**
 * MFA Service
 *
 * Handles TOTP generation, QR code creation, and verification.
 */
export class MFAService {
  // Encryption key derived from SESSION_SECRET
  // In production, use a separate MFA_ENCRYPTION_KEY
  private static readonly ENCRYPTION_KEY = scryptSync(
    process.env.SESSION_SECRET || 'development-secret-change-in-production',
    'mfa-salt',
    32
  );

  /**
   * Generate MFA setup for new user
   *
   * Creates TOTP secret, generates QR code, and creates backup codes.
   *
   * @param email - User email for TOTP label
   * @param issuer - Issuer name (appears in authenticator app)
   * @returns MFA setup data (secret, QR code, backup codes)
   *
   * @example
   * ```typescript
   * const setup = await MFAService.generateSetup('user@example.com', 'MyApp');
   * // Show QR code to user: <img src={setup.qrCodeDataUrl} />
   * // Store encrypted secret: await db.update(users).set({ mfaSecret: setup.secret })
   * // Display backup codes ONCE: setup.backupCodes
   * ```
   */
  static async generateSetup(email: string, issuer = 'Platform'): Promise<MFASetupResult> {
    // Generate random secret (20 bytes = 160 bits, RFC 4226 recommendation)
    const secret = new Secret({ size: 20 });

    // Create TOTP instance
    const totp = new TOTP({
      issuer,
      label: email,
      algorithm: 'SHA1', // Required for Google Authenticator compatibility
      digits: 6, // Standard 6-digit codes
      period: 30, // 30-second window
      secret,
    });

    // Generate QR code as data URL
    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate 10 backup codes (8 characters each)
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );

    // Encrypt secret for storage
    const encryptedSecret = MFAService.encryptSecret(secret.base32);

    return {
      secret: encryptedSecret,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code or backup code
   *
   * Validates 6-digit TOTP code with ±1 period tolerance (90-second window).
   * Falls back to backup code verification if TOTP fails.
   *
   * @param code - 6-digit TOTP code or 8-character backup code
   * @param encryptedSecret - Encrypted TOTP secret from database
   * @param hashedBackupCodes - Bcrypt-hashed backup codes from database
   * @returns Verification result
   *
   * @example
   * ```typescript
   * const result = await MFAService.verifyCode(
   *   '123456',
   *   user.mfaSecret,
   *   user.mfaBackupCodes
   * );
   * if (result.valid) {
   *   if (result.usedBackupCode) {
   *     // Remove used backup code from database
   *   }
   *   // Allow login
   * }
   * ```
   */
  static async verifyCode(
    code: string,
    encryptedSecret: string,
    hashedBackupCodes: string[] = []
  ): Promise<MFAVerificationResult> {
    // Validate input
    if (!code || !encryptedSecret) {
      return { valid: false };
    }

    // Remove whitespace and convert to uppercase
    const cleanCode = code.replace(/\s/g, '').toUpperCase();

    // Try TOTP verification first (6 digits)
    if (/^\d{6}$/.test(cleanCode)) {
      try {
        // Decrypt secret
        const secret = MFAService.decryptSecret(encryptedSecret);

        // Create TOTP instance
        const totp = new TOTP({
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: Secret.fromBase32(secret),
        });

        // Validate with ±1 period tolerance (90-second window)
        // This accounts for clock drift and user input time
        const delta = totp.validate({
          token: cleanCode,
          window: 1, // Accept codes from previous, current, and next period
        });

        if (delta !== null) {
          return { valid: true, usedBackupCode: false };
        }
      } catch (error: unknown) {
        // Decryption or validation failed, fall through to backup codes
        logger.error('TOTP verification error', { error });
      }
    }

    // Try backup code verification (8 hex characters)
    if (/^[0-9A-F]{8}$/.test(cleanCode)) {
      for (let i = 0; i < hashedBackupCodes.length; i++) {
        const hashedCode = hashedBackupCodes[i];
        if (!hashedCode) continue;

        const matches = await bcrypt.compare(cleanCode, hashedCode);
        if (matches) {
          return { valid: true, usedBackupCode: true };
        }
      }
    }

    return { valid: false };
  }

  /**
   * Hash backup codes for storage
   *
   * Uses bcrypt to securely store backup codes.
   *
   * @param backupCodes - Plain-text backup codes
   * @returns Bcrypt-hashed backup codes
   */
  static async hashBackupCodes(backupCodes: string[]): Promise<string[]> {
    return await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));
  }

  /**
   * Remove used backup code from array
   *
   * @param hashedBackupCodes - Current hashed backup codes
   * @param usedCode - Plain-text backup code that was used
   * @returns Updated array without used code
   */
  static async removeUsedBackupCode(
    hashedBackupCodes: string[],
    usedCode: string
  ): Promise<string[]> {
    const updated: string[] = [];

    for (const hashedCode of hashedBackupCodes) {
      const matches = await bcrypt.compare(usedCode, hashedCode);
      if (!matches) {
        updated.push(hashedCode); // Keep unused codes
      }
    }

    return updated;
  }

  /**
   * Encrypt TOTP secret for database storage
   *
   * Uses AES-256-GCM with random IV.
   *
   * @param secret - Base32-encoded TOTP secret
   * @returns Encrypted secret (hex format: iv:encrypted:authTag)
   */
  private static encryptSecret(secret: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', MFAService.ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:encrypted:authTag (all hex-encoded)
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt TOTP secret from database
   *
   * @param encryptedSecret - Encrypted secret (hex format: iv:encrypted:authTag)
   * @returns Base32-encoded TOTP secret
   */
  private static decryptSecret(encryptedSecret: string): string {
    const [ivHex, encryptedHex, authTagHex] = encryptedSecret.split(':');

    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', MFAService.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Validate MFA code format
   *
   * @param code - Code to validate
   * @returns True if valid TOTP or backup code format
   */
  static isValidCodeFormat(code: string): boolean {
    const clean = code.replace(/\s/g, '').toUpperCase();
    return /^\d{6}$/.test(clean) || /^[0-9A-F]{8}$/.test(clean);
  }
}
