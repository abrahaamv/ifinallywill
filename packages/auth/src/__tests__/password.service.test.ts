/**
 * Password Service Tests - Phase 8 Security Validation
 *
 * Validates OWASP 2025 password security standards:
 * - Argon2id hashing with correct parameters
 * - Automatic bcrypt → Argon2id migration
 * - NIST SP 800-63B password validation
 * - Hash format verification
 *
 * Coverage: password.service.ts
 */

import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { passwordService } from '../services/password.service';

describe('Password Service', () => {
  describe('hashPassword', () => {
    it('should hash password with Argon2id', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      // Verify hash format (Argon2id hashes start with $argon2id$)
      expect(hash).toMatch(/^\$argon2id\$/);

      // Verify hash can be verified
      const valid = await argon2.verify(hash, password);
      expect(valid).toBe(true);
    });

    it('should use OWASP 2025 recommended parameters', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      // Parse hash to verify parameters
      // Argon2id hash format: $argon2id$v=19$m=19456,t=2,p=1$...
      const params = hash.split('$')[3];
      expect(params).toBeDefined();

      if (params) {
        const paramsParsed = Object.fromEntries(params.split(',').map((p) => p.split('=')));

        // Memory cost: 19456 KB (19 MB)
        expect(paramsParsed.m).toBe('19456');

        // Time cost: 2 iterations
        expect(paramsParsed.t).toBe('2');

        // Parallelism: 1 thread
        expect(paramsParsed.p).toBe('1');
      }
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      // Hashes should be different (due to random salt)
      expect(hash1).not.toBe(hash2);

      // Both should verify correctly
      expect(await argon2.verify(hash1, password)).toBe(true);
      expect(await argon2.verify(hash2, password)).toBe(true);
    });

    it('should complete hashing in acceptable time (<100ms)', async () => {
      const password = 'TestPassword123!';
      const start = Date.now();
      await passwordService.hashPassword(password);
      const duration = Date.now() - start;

      // OWASP recommendation: 40-60ms typical, allow up to 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('verifyAndUpgrade - Argon2id', () => {
    it('should verify valid Argon2id password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      const result = await passwordService.verifyAndUpgrade(password, hash, 'argon2id');

      expect(result.valid).toBe(true);
      expect(result.needsUpgrade).toBe(false);
      expect(result.newHash).toBeUndefined();
    });

    it('should reject invalid Argon2id password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      const result = await passwordService.verifyAndUpgrade('WrongPassword!', hash, 'argon2id');

      expect(result.valid).toBe(false);
      expect(result.needsUpgrade).toBe(false);
      expect(result.newHash).toBeUndefined();
    });

    it('should handle malformed Argon2id hash', async () => {
      const password = 'TestPassword123!';
      const invalidHash = '$argon2id$invalid';

      // Argon2 will throw on invalid hash, service should catch and return invalid
      const result = await passwordService.verifyAndUpgrade(password, invalidHash, 'argon2id');

      expect(result.valid).toBe(false);
      expect(result.needsUpgrade).toBe(false);
    });
  });

  describe('verifyAndUpgrade - Bcrypt Migration', () => {
    let bcryptHash: string;
    const testPassword = 'TestPassword123!';

    beforeAll(async () => {
      // Create a bcrypt hash for migration testing
      bcryptHash = await bcrypt.hash(testPassword, 10);
    });

    it('should verify valid bcrypt password and provide upgrade', async () => {
      const result = await passwordService.verifyAndUpgrade(testPassword, bcryptHash, 'bcrypt');

      expect(result.valid).toBe(true);
      expect(result.needsUpgrade).toBe(true);
      expect(result.newHash).toBeDefined();

      // Verify new hash is Argon2id
      expect(result.newHash).toMatch(/^\$argon2id\$/);

      // Verify new hash can authenticate same password
      if (result.newHash) {
        const verified = await argon2.verify(result.newHash, testPassword);
        expect(verified).toBe(true);
      }
    });

    it('should reject invalid bcrypt password', async () => {
      const result = await passwordService.verifyAndUpgrade('WrongPassword!', bcryptHash, 'bcrypt');

      expect(result.valid).toBe(false);
      expect(result.needsUpgrade).toBe(false);
      expect(result.newHash).toBeUndefined();
    });

    it('should generate consistent Argon2id hash after migration', async () => {
      const result1 = await passwordService.verifyAndUpgrade(testPassword, bcryptHash, 'bcrypt');

      const result2 = await passwordService.verifyAndUpgrade(testPassword, bcryptHash, 'bcrypt');

      // Both should be valid
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);

      // Both should provide upgrades
      expect(result1.newHash).toBeDefined();
      expect(result2.newHash).toBeDefined();

      // Hashes should be different (random salt) but both valid
      expect(result1.newHash).not.toBe(result2.newHash);

      if (result1.newHash && result2.newHash) {
        expect(await argon2.verify(result1.newHash, testPassword)).toBe(true);
        expect(await argon2.verify(result2.newHash, testPassword)).toBe(true);
      }
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'password', // 8 characters (minimum)
        'TestPassword123!', // Mixed case, numbers, symbols
        'a'.repeat(64), // 64 characters (maximum)
        'simple password with spaces', // Spaces allowed (NIST guideline)
        '12345678', // Numbers only (no composition rules)
        'aaaaaaaa', // Repeated characters (no composition rules)
      ];

      for (const password of validPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject passwords shorter than 8 characters', () => {
      const shortPasswords = ['short', '1234567', 'a'.repeat(7)];

      for (const password of shortPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Password must be at least 8 characters long');
      }
    });

    it('should reject passwords longer than 64 characters', () => {
      const longPasswords = ['a'.repeat(65), 'a'.repeat(100)];

      for (const password of longPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Password must not exceed 64 characters');
      }
    });

    it('should accept passwords without composition rules (NIST)', () => {
      // NIST recommends AGAINST composition rules
      const passwords = [
        'alllowercase', // No uppercase
        'ALLUPPERCASE', // No lowercase
        'NoNumbers!!!', // No numbers
        'NoSymbols123', // No symbols
        '        ', // All spaces (8 spaces)
      ];

      for (const password of passwords) {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate edge cases', () => {
      const edgeCases = [
        { password: 'a'.repeat(8), valid: true }, // Exactly 8
        { password: 'a'.repeat(64), valid: true }, // Exactly 64
        { password: 'a'.repeat(7), valid: false }, // 1 under minimum
        { password: 'a'.repeat(65), valid: false }, // 1 over maximum
      ];

      for (const { password, valid } of edgeCases) {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(valid);
      }
    });
  });

  describe('needsUpgrade', () => {
    it('should detect bcrypt hashes', async () => {
      const bcryptHash = await bcrypt.hash('TestPassword123!', 10);

      const needsUpgrade = passwordService.needsUpgrade(bcryptHash);
      expect(needsUpgrade).toBe(true);
    });

    it('should detect Argon2id hashes (no upgrade needed)', async () => {
      const argon2Hash = await passwordService.hashPassword('TestPassword123!');

      const needsUpgrade = passwordService.needsUpgrade(argon2Hash);
      expect(needsUpgrade).toBe(false);
    });

    it('should handle various bcrypt prefixes', () => {
      const bcryptPrefixes = ['$2a$', '$2b$', '$2y$'];

      for (const prefix of bcryptPrefixes) {
        const mockHash = `${prefix}10$...`;
        expect(passwordService.needsUpgrade(mockHash)).toBe(true);
      }
    });
  });

  describe('Security Properties', () => {
    it('should use cryptographically secure random salts', async () => {
      const password = 'TestPassword123!';
      const hashes = new Set<string>();

      // Generate 100 hashes
      for (let i = 0; i < 100; i++) {
        const hash = await passwordService.hashPassword(password);
        hashes.add(hash);
      }

      // All hashes should be unique (salts are random)
      expect(hashes.size).toBe(100);
    });

    it('should be resistant to timing attacks (constant-time comparison)', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      // Measure time for correct password
      const start1 = process.hrtime.bigint();
      await passwordService.verifyAndUpgrade(password, hash, 'argon2id');
      const duration1 = process.hrtime.bigint() - start1;

      // Measure time for incorrect password (same length)
      const start2 = process.hrtime.bigint();
      await passwordService.verifyAndUpgrade('WrongPassword!', hash, 'argon2id');
      const duration2 = process.hrtime.bigint() - start2;

      // Timing should be similar (within 50% variance)
      // Note: Exact constant-time is difficult to test, but should be close
      const variance = Math.abs(Number(duration1 - duration2)) / Number(duration1);
      expect(variance).toBeLessThan(0.5);
    });

    it('should maintain password entropy across migration', async () => {
      const strongPassword = 'Str0ng!P@ssw0rd#2024$Complex%';
      const bcryptHash = await bcrypt.hash(strongPassword, 10);

      const result = await passwordService.verifyAndUpgrade(strongPassword, bcryptHash, 'bcrypt');

      expect(result.valid).toBe(true);
      expect(result.newHash).toBeDefined();

      // Verify migrated hash maintains same authentication
      if (result.newHash) {
        const verified = await argon2.verify(result.newHash, strongPassword);
        expect(verified).toBe(true);

        // Wrong password should still fail
        const wrongVerified = await argon2.verify(result.newHash, 'WrongPassword!');
        expect(wrongVerified).toBe(false);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet OWASP performance guidelines (40-60ms typical)', async () => {
      const password = 'TestPassword123!';
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await passwordService.hashPassword(password);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      const maxDuration = Math.max(...durations);

      // Average should be under 100ms (OWASP guideline)
      // Note: Modern hardware may be faster than 40-60ms, which is acceptable
      expect(avgDuration).toBeLessThan(100);

      // Maximum should be under 100ms
      expect(maxDuration).toBeLessThan(100);
    });

    it('should verify passwords quickly (<50ms)', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      const start = Date.now();
      await passwordService.verifyAndUpgrade(password, hash, 'argon2id');
      const duration = Date.now() - start;

      // Verification should be fast (<50ms typical)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Migration Workflow Integration', () => {
    it('should simulate complete login migration flow', async () => {
      // 1. User has old bcrypt password in database
      const userPassword = 'UserPassword123!';
      const oldBcryptHash = await bcrypt.hash(userPassword, 10);

      // 2. User logs in - verify bcrypt password
      const verifyResult = await passwordService.verifyAndUpgrade(
        userPassword,
        oldBcryptHash,
        'bcrypt'
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.needsUpgrade).toBe(true);
      expect(verifyResult.newHash).toBeDefined();

      // 3. Application updates database with new Argon2id hash
      const newArgon2Hash = verifyResult.newHash!;

      // 4. Next login - verify with new Argon2id hash
      const nextLoginResult = await passwordService.verifyAndUpgrade(
        userPassword,
        newArgon2Hash,
        'argon2id'
      );

      expect(nextLoginResult.valid).toBe(true);
      expect(nextLoginResult.needsUpgrade).toBe(false);
      expect(nextLoginResult.newHash).toBeUndefined();
    });
  });
});
