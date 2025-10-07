import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

/**
 * Password Service - Phase 8 Security Implementation
 *
 * Implements OWASP 2025 password security standards:
 * - Argon2id hashing (19MB memory, 2 iterations)
 * - Automatic migration from bcrypt
 * - Password strength validation
 *
 * Reference: docs/research/10-07-2025/research-10-07-2025.md lines 327-420
 */

export interface PasswordVerificationResult {
  valid: boolean;
  needsUpgrade: boolean;
  newHash?: string;
}

export const passwordService = {
  /**
   * Hash password with Argon2id (OWASP 2025 standard)
   *
   * Configuration:
   * - Algorithm: Argon2id (hybrid mode - resistant to side-channel and GPU attacks)
   * - Memory: 19MB (19,456 KB) - OWASP recommendation
   * - Iterations: 2 time cost
   * - Parallelism: 1 (single-threaded)
   *
   * Cost: ~40-60ms on modern hardware (acceptable for login flow)
   */
  async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19MB
      timeCost: 2,
      parallelism: 1,
    });
  },

  /**
   * Verify password and automatically upgrade from bcrypt to Argon2id
   *
   * Migration strategy:
   * 1. Detect algorithm from hash prefix ($2 = bcrypt, $argon2id = Argon2id)
   * 2. Verify password against current hash
   * 3. If bcrypt and valid, generate new Argon2id hash for upgrade
   * 4. Caller updates user record with new hash and algorithm
   *
   * @param password - Plain text password
   * @param hash - Current password hash (bcrypt or Argon2id)
   * @param algorithm - Current hashing algorithm
   * @returns Verification result with upgrade flag and new hash if needed
   */
  async verifyAndUpgrade(
    password: string,
    hash: string,
    algorithm: 'bcrypt' | 'argon2id'
  ): Promise<PasswordVerificationResult> {
    let valid = false;

    if (algorithm === 'bcrypt') {
      // Verify with bcrypt
      valid = await bcrypt.compare(password, hash);

      if (valid) {
        // Generate Argon2id hash for upgrade
        const newHash = await this.hashPassword(password);
        return {
          valid: true,
          needsUpgrade: true,
          newHash,
        };
      }
    } else {
      // Verify with Argon2id (already upgraded)
      valid = await argon2.verify(hash, password);

      if (valid) {
        return {
          valid: true,
          needsUpgrade: false,
        };
      }
    }

    // Password verification failed
    return {
      valid: false,
      needsUpgrade: false,
    };
  },

  /**
   * Validate password meets minimum security requirements
   *
   * NIST Guidelines (SP 800-63B):
   * - Minimum 8 characters
   * - Maximum 64 characters (prevent DoS)
   * - No composition rules required (letters, numbers, symbols)
   * - Check against common passwords (future: integrate zxcvbn)
   * - Check against breach databases (future: HaveIBeenPwned API)
   *
   * @param password - Password to validate
   * @returns Validation result with error message if invalid
   */
  validatePassword(password: string): { valid: boolean; error?: string } {
    // Length check (NIST guideline)
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long',
      };
    }

    if (password.length > 64) {
      return {
        valid: false,
        error: 'Password must not exceed 64 characters',
      };
    }

    // No composition rules required (NIST guideline)
    // Composition rules reduce entropy and frustrate users
    // We rely on length and breach checking instead

    return { valid: true };
  },

  /**
   * Check if password hash needs upgrade to Argon2id
   *
   * @param hash - Password hash to check
   * @returns True if hash is bcrypt and needs upgrade
   */
  needsUpgrade(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    return hash.startsWith('$2');
  },
};
