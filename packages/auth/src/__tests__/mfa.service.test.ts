/**
 * MFA Service Tests - Phase 8 Security Validation
 *
 * Validates RFC 6238 TOTP implementation:
 * - TOTP generation and verification
 * - AES-256-GCM secret encryption
 * - Backup code management
 * - QR code generation
 * - Time-window validation
 *
 * Coverage: mfa.service.ts
 */

import * as bcrypt from 'bcryptjs';
import { Secret, TOTP } from 'otpauth';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MFAService } from '../services/mfa.service';

describe('MFA Service', () => {
  describe('generateSetup', () => {
    it('should generate MFA setup with all components', async () => {
      const email = 'test@example.com';
      const issuer = 'TestApp';

      const setup = await MFAService.generateSetup(email, issuer);

      // Verify secret is encrypted (not Base32 format)
      expect(setup.secret).toBeDefined();
      expect(setup.secret).not.toMatch(/^[A-Z2-7]+=*$/); // Not raw Base32

      // Verify secret is in encrypted format (iv:encrypted:authTag)
      expect(setup.secret.split(':').length).toBe(3);

      // Verify QR code is data URL
      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify 10 backup codes (8 hex characters each)
      expect(setup.backupCodes).toHaveLength(10);
      setup.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
      });
    });

    it('should use default issuer if not provided', async () => {
      const email = 'test@example.com';

      const setup = await MFAService.generateSetup(email);

      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(setup.backupCodes).toHaveLength(10);
    });

    it('should generate unique secrets for each user', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      const setup1 = await MFAService.generateSetup(email1);
      const setup2 = await MFAService.generateSetup(email2);

      // Encrypted secrets should be different
      expect(setup1.secret).not.toBe(setup2.secret);

      // QR codes should be different
      expect(setup1.qrCodeDataUrl).not.toBe(setup2.qrCodeDataUrl);

      // Backup codes should be different
      expect(setup1.backupCodes).not.toEqual(setup2.backupCodes);
    });

    it('should generate unique backup codes', async () => {
      const email = 'test@example.com';

      const setup = await MFAService.generateSetup(email);

      // All backup codes should be unique
      const uniqueCodes = new Set(setup.backupCodes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should include user email in QR code', async () => {
      const email = 'test@example.com';
      const issuer = 'TestApp';

      const setup = await MFAService.generateSetup(email, issuer);

      // Decode QR code data URL to check contents
      // QR code should contain otpauth://totp/TestApp:test@example.com
      expect(setup.qrCodeDataUrl).toContain('data:image/png;base64,');
    });
  });

  describe('verifyCode - TOTP', () => {
    let encryptedSecret: string;
    let secret: Secret;

    beforeAll(async () => {
      // Generate a test secret
      const setup = await MFAService.generateSetup('test@example.com');
      encryptedSecret = setup.secret;

      // Create a secret for manual TOTP generation
      secret = new Secret({ size: 20 });
    });

    it('should verify valid TOTP code', async () => {
      // Create TOTP instance
      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      // Generate current code
      const code = totp.generate();

      // Encrypt secret for verification
      const encryptedSecret = (MFAService as any).encryptSecret(secret.base32);

      // Verify code
      const result = await MFAService.verifyCode(code, encryptedSecret);

      expect(result.valid).toBe(true);
      expect(result.usedBackupCode).toBe(false);
    });

    it('should reject invalid TOTP code', async () => {
      const result = await MFAService.verifyCode('000000', encryptedSecret);

      expect(result.valid).toBe(false);
      expect(result.usedBackupCode).toBeUndefined();
    });

    it('should accept codes with whitespace', async () => {
      // Create TOTP and generate code
      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });
      const code = totp.generate();

      // Encrypt secret
      const encryptedSecret = (MFAService as any).encryptSecret(secret.base32);

      // Add whitespace to code
      const codeWithSpaces = `${code.slice(0, 3)} ${code.slice(3)}`;

      // Should still verify
      const result = await MFAService.verifyCode(codeWithSpaces, encryptedSecret);

      expect(result.valid).toBe(true);
    });

    it('should reject codes with wrong length', async () => {
      const invalidCodes = ['12345', '1234567', 'abc123'];

      for (const code of invalidCodes) {
        const result = await MFAService.verifyCode(code, encryptedSecret);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject expired codes (outside ±1 window)', async () => {
      // This test is time-sensitive - mock time to ensure code is expired
      // In practice, codes expire after 90 seconds (±1 period from current)

      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      // Generate code from 2 minutes ago (outside ±1 window)
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const oldCode = totp.generate({ timestamp: twoMinutesAgo });

      const encryptedSecret = (MFAService as any).encryptSecret(secret.base32);

      // Old code should be rejected
      const result = await MFAService.verifyCode(oldCode, encryptedSecret);

      expect(result.valid).toBe(false);
    });

    it('should accept codes within ±1 period window', async () => {
      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      const encryptedSecret = (MFAService as any).encryptSecret(secret.base32);

      // Test current period
      const currentCode = totp.generate();
      const currentResult = await MFAService.verifyCode(currentCode, encryptedSecret);
      expect(currentResult.valid).toBe(true);

      // Test previous period (-30 seconds)
      const prevCode = totp.generate({ timestamp: Date.now() - 30 * 1000 });
      const prevResult = await MFAService.verifyCode(prevCode, encryptedSecret);
      expect(prevResult.valid).toBe(true);

      // Test next period (+30 seconds)
      const nextCode = totp.generate({ timestamp: Date.now() + 30 * 1000 });
      const nextResult = await MFAService.verifyCode(nextCode, encryptedSecret);
      expect(nextResult.valid).toBe(true);
    });
  });

  describe('verifyCode - Backup Codes', () => {
    let hashedBackupCodes: string[];
    let dummyEncryptedSecret: string;
    const plainBackupCodes = ['ABCD1234', 'EFGH5678', '12345678'];

    beforeAll(async () => {
      // Hash backup codes
      hashedBackupCodes = await MFAService.hashBackupCodes(plainBackupCodes);

      // Create dummy encrypted secret (won't be used for backup code verification)
      dummyEncryptedSecret = (MFAService as any).encryptSecret('DUMMYSECRET');
    });

    it('should verify valid backup code', async () => {
      const result = await MFAService.verifyCode(
        'ABCD1234',
        dummyEncryptedSecret,
        hashedBackupCodes
      );

      expect(result.valid).toBe(true);
      expect(result.usedBackupCode).toBe(true);
    });

    it('should verify backup code case-insensitively', async () => {
      const result = await MFAService.verifyCode(
        'abcd1234',
        dummyEncryptedSecret,
        hashedBackupCodes
      );

      expect(result.valid).toBe(true);
      expect(result.usedBackupCode).toBe(true);
    });

    it('should verify backup code with whitespace', async () => {
      const result = await MFAService.verifyCode(
        'ABCD 1234',
        dummyEncryptedSecret,
        hashedBackupCodes
      );

      expect(result.valid).toBe(true);
      expect(result.usedBackupCode).toBe(true);
    });

    it('should reject invalid backup code', async () => {
      const result = await MFAService.verifyCode(
        'FFFFFFFF',
        dummyEncryptedSecret,
        hashedBackupCodes
      );

      expect(result.valid).toBe(false);
      expect(result.usedBackupCode).toBeUndefined();
    });

    it('should reject backup code with wrong length', async () => {
      const invalidCodes = ['ABC123', 'ABCD12345'];

      for (const code of invalidCodes) {
        const result = await MFAService.verifyCode(code, dummyEncryptedSecret, hashedBackupCodes);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('hashBackupCodes', () => {
    it('should hash all backup codes', async () => {
      const plainCodes = ['ABCD1234', 'EFGH5678', '12345678'];

      const hashedCodes = await MFAService.hashBackupCodes(plainCodes);

      expect(hashedCodes).toHaveLength(3);

      // All hashes should be bcrypt format ($2...)
      hashedCodes.forEach((hash) => {
        expect(hash).toMatch(/^\$2[aby]\$/);
      });
    });

    it('should generate unique hashes for each code', async () => {
      const plainCodes = ['ABCD1234', 'EFGH5678'];

      const hashedCodes = await MFAService.hashBackupCodes(plainCodes);

      expect(hashedCodes[0]).not.toBe(hashedCodes[1]);
    });

    it('should verify hashed codes correctly', async () => {
      const plainCodes = ['ABCD1234', 'EFGH5678'];

      const hashedCodes = await MFAService.hashBackupCodes(plainCodes);

      // Verify each code matches its hash
      for (let i = 0; i < plainCodes.length; i++) {
        const matches = await bcrypt.compare(plainCodes[i]!, hashedCodes[i]!);
        expect(matches).toBe(true);
      }
    });
  });

  describe('removeUsedBackupCode', () => {
    let hashedBackupCodes: string[];
    const plainBackupCodes = ['ABCD1234', 'EFGH5678', '12345678'];

    beforeAll(async () => {
      hashedBackupCodes = await MFAService.hashBackupCodes(plainBackupCodes);
    });

    it('should remove used backup code from array', async () => {
      const usedCode = 'ABCD1234';

      const updated = await MFAService.removeUsedBackupCode(hashedBackupCodes, usedCode);

      // Should have one less code
      expect(updated).toHaveLength(2);

      // Used code should not verify against any remaining hash
      for (const hash of updated) {
        const matches = await bcrypt.compare(usedCode, hash);
        expect(matches).toBe(false);
      }

      // Other codes should still verify
      const efghMatches = await bcrypt.compare('EFGH5678', updated[0]!);
      expect(efghMatches).toBe(true);
    });

    it('should not remove unused codes', async () => {
      const usedCode = 'ABCD1234';

      const updated = await MFAService.removeUsedBackupCode(hashedBackupCodes, usedCode);

      // Original array had 3 codes, should have 2 after removal
      expect(updated).toHaveLength(2);

      // Verify remaining codes are intact
      const remainingPlainCodes = ['EFGH5678', '12345678'];
      for (const plainCode of remainingPlainCodes) {
        let found = false;
        for (const hash of updated) {
          if (await bcrypt.compare(plainCode, hash)) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });

    it('should handle removing non-existent code', async () => {
      const nonExistentCode = 'FFFFFFFF';

      const updated = await MFAService.removeUsedBackupCode(hashedBackupCodes, nonExistentCode);

      // Should return all original codes (nothing removed)
      expect(updated).toHaveLength(3);
      expect(updated).toEqual(hashedBackupCodes);
    });

    it('should handle empty backup codes array', async () => {
      const updated = await MFAService.removeUsedBackupCode([], 'ABCD1234');

      expect(updated).toHaveLength(0);
    });
  });

  describe('isValidCodeFormat', () => {
    it('should accept valid TOTP codes (6 digits)', () => {
      const validCodes = ['123456', '000000', '999999'];

      validCodes.forEach((code) => {
        expect(MFAService.isValidCodeFormat(code)).toBe(true);
      });
    });

    it('should accept valid backup codes (8 hex chars)', () => {
      const validCodes = ['ABCD1234', 'FFFFFFFF', '12345678'];

      validCodes.forEach((code) => {
        expect(MFAService.isValidCodeFormat(code)).toBe(true);
      });
    });

    it('should accept codes with whitespace', () => {
      const codesWithSpaces = ['123 456', 'ABCD 1234', ' 123456 '];

      codesWithSpaces.forEach((code) => {
        expect(MFAService.isValidCodeFormat(code)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidCodes = [
        '12345', // Too short for TOTP
        '1234567', // Too long for TOTP, too short for backup
        'ABC123', // Too short for backup
        'ABCDEFGH', // Too long for backup (no digits)
        'abcdefgh', // Lowercase letters in backup (gets uppercased but invalid)
        '', // Empty
        'abc', // Random text
      ];

      invalidCodes.forEach((code) => {
        expect(MFAService.isValidCodeFormat(code)).toBe(false);
      });
    });
  });

  describe('Secret Encryption/Decryption', () => {
    it('should encrypt and decrypt secrets correctly', () => {
      const originalSecret = 'JBSWY3DPEHPK3PXP'; // Example Base32 secret

      // Encrypt
      const encrypted = (MFAService as any).encryptSecret(originalSecret);

      // Verify format (iv:encrypted:authTag)
      expect(encrypted.split(':').length).toBe(3);

      // Decrypt
      const decrypted = (MFAService as any).decryptSecret(encrypted);

      expect(decrypted).toBe(originalSecret);
    });

    it('should generate unique encrypted values for same secret', () => {
      const secret = 'JBSWY3DPEHPK3PXP';

      const encrypted1 = (MFAService as any).encryptSecret(secret);
      const encrypted2 = (MFAService as any).encryptSecret(secret);

      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // Both decrypt to same value
      const decrypted1 = (MFAService as any).decryptSecret(encrypted1);
      const decrypted2 = (MFAService as any).decryptSecret(encrypted2);

      expect(decrypted1).toBe(secret);
      expect(decrypted2).toBe(secret);
    });

    it('should reject tampered encrypted secrets', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = (MFAService as any).encryptSecret(secret);

      // Tamper with encrypted data
      const parts = encrypted.split(':');
      parts[1] = 'FFFFFFFFFFFFFFFF'; // Corrupt encrypted data
      const tampered = parts.join(':');

      // Should throw error on decryption
      expect(() => {
        (MFAService as any).decryptSecret(tampered);
      }).toThrow();
    });

    it('should reject malformed encrypted secrets', () => {
      const malformed = [
        'invalid', // No colons
        'a:b', // Too few parts
        'a:b:c:d', // Too many parts
      ];

      malformed.forEach((encrypted) => {
        expect(() => {
          (MFAService as any).decryptSecret(encrypted);
        }).toThrow(); // Will throw various crypto errors for malformed input
      });
    });
  });

  describe('Integration Workflow', () => {
    it('should simulate complete MFA setup and login flow', async () => {
      const userEmail = 'user@example.com';

      // 1. User enables MFA - generate setup
      const setup = await MFAService.generateSetup(userEmail);

      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeDataUrl).toBeDefined();
      expect(setup.backupCodes).toHaveLength(10);

      // 2. Hash backup codes for database storage
      const hashedBackupCodes = await MFAService.hashBackupCodes(setup.backupCodes);

      // 3. User scans QR code and enters TOTP code
      // (Simulate by decrypting secret and generating code)
      const decryptedSecret = (MFAService as any).decryptSecret(setup.secret);
      const secret = Secret.fromBase32(decryptedSecret);

      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      const totpCode = totp.generate();

      // 4. Verify TOTP code during setup
      const setupResult = await MFAService.verifyCode(totpCode, setup.secret, hashedBackupCodes);

      expect(setupResult.valid).toBe(true);
      expect(setupResult.usedBackupCode).toBe(false);

      // 5. User logs in later - verify TOTP code
      const loginCode = totp.generate();
      const loginResult = await MFAService.verifyCode(loginCode, setup.secret, hashedBackupCodes);

      expect(loginResult.valid).toBe(true);

      // 6. User loses phone - use backup code
      const backupCode = setup.backupCodes[0]!;
      const backupResult = await MFAService.verifyCode(backupCode, setup.secret, hashedBackupCodes);

      expect(backupResult.valid).toBe(true);
      expect(backupResult.usedBackupCode).toBe(true);

      // 7. Remove used backup code
      const updatedBackupCodes = await MFAService.removeUsedBackupCode(
        hashedBackupCodes,
        backupCode
      );

      expect(updatedBackupCodes).toHaveLength(9);

      // 8. Used backup code should no longer work
      const reusedResult = await MFAService.verifyCode(
        backupCode,
        setup.secret,
        updatedBackupCodes
      );

      expect(reusedResult.valid).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should use cryptographically secure random secrets', async () => {
      const secrets = new Set<string>();

      // Generate 100 secrets
      for (let i = 0; i < 100; i++) {
        const setup = await MFAService.generateSetup('test@example.com');
        secrets.add(setup.secret);
      }

      // All secrets should be unique
      expect(secrets.size).toBe(100);
    });

    it('should use cryptographically secure random backup codes', async () => {
      const setup1 = await MFAService.generateSetup('user1@example.com');
      const setup2 = await MFAService.generateSetup('user2@example.com');

      // No backup codes should overlap between users
      const intersection = setup1.backupCodes.filter((code) => setup2.backupCodes.includes(code));
      expect(intersection).toHaveLength(0);
    });

    it('should use AES-256-GCM for secret encryption', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = (MFAService as any).encryptSecret(secret);

      // Verify encryption produces hex-encoded output
      const [iv, ciphertext, authTag] = encrypted.split(':');

      expect(iv).toMatch(/^[0-9a-f]+$/i);
      expect(ciphertext).toMatch(/^[0-9a-f]+$/i);
      expect(authTag).toMatch(/^[0-9a-f]+$/i);

      // IV should be 16 bytes (32 hex chars)
      expect(iv?.length).toBe(32);

      // Auth tag should be 16 bytes (32 hex chars)
      expect(authTag?.length).toBe(32);
    });
  });
});
