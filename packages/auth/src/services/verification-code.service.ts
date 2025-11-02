/**
 * Verification Code Service
 * Redis-backed verification code storage for SMS and email verification
 * Phase 11 Week 1
 *
 * **Features**:
 * - 6-digit numeric codes
 * - 10-minute expiration
 * - Rate limiting (max 3 attempts per 10 minutes)
 * - Redis-backed storage
 * - Used for phone and email verification
 *
 * **Security**:
 * - Codes are hashed before storage (bcrypt)
 * - Rate limiting prevents brute force
 * - Automatic expiration prevents code reuse
 */

import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { Redis } from 'ioredis';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('verification-code');

/**
 * Verification code configuration
 */
interface VerificationCodeConfig {
  /**
   * Code length (default: 6 digits)
   */
  codeLength: number;

  /**
   * Code expiration time in seconds (default: 600 = 10 minutes)
   */
  expirationSeconds: number;

  /**
   * Maximum verification attempts (default: 3)
   */
  maxAttempts: number;

  /**
   * Rate limit window in seconds (default: 600 = 10 minutes)
   */
  rateLimitWindow: number;

  /**
   * Maximum code generation requests per window (default: 3)
   */
  maxGenerationRequests: number;
}

const DEFAULT_CONFIG: VerificationCodeConfig = {
  codeLength: 6,
  expirationSeconds: 600, // 10 minutes
  maxAttempts: 3,
  rateLimitWindow: 600, // 10 minutes
  maxGenerationRequests: 3, // Max 3 code generation requests per 10 minutes
};

/**
 * Verification code result
 */
export interface VerificationCodeResult {
  code: string;
  expiresAt: Date;
}

/**
 * Verification attempt result
 */
export interface VerificationAttemptResult {
  valid: boolean;
  attemptsRemaining: number;
  error?: 'EXPIRED' | 'INVALID' | 'MAX_ATTEMPTS' | 'NOT_FOUND';
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetAt: Date;
}

/**
 * Verification Code Service
 *
 * Manages verification codes for phone and email verification.
 */
export class VerificationCodeService {
  constructor(
    private redis: Redis,
    private config: VerificationCodeConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Generate verification code
   *
   * Creates a random 6-digit code, hashes it, and stores in Redis.
   *
   * @param identifier - Email or phone number
   * @param type - Verification type ('email' or 'phone')
   * @returns Verification code and expiration
   *
   * @throws Error if rate limit exceeded
   *
   * @example
   * ```typescript
   * const result = await verificationService.generateCode('user@example.com', 'email');
   * await emailService.sendVerificationEmail(email, result.code);
   * ```
   */
  async generateCode(
    identifier: string,
    type: 'email' | 'phone'
  ): Promise<VerificationCodeResult> {
    // Check rate limit
    const rateLimitCheck = await this.checkRateLimit(identifier, type);
    if (!rateLimitCheck.allowed) {
      const resetTime = Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000);
      throw new Error(
        `Rate limit exceeded. ${rateLimitCheck.remainingRequests} requests remaining. Try again in ${resetTime} seconds.`
      );
    }

    // Generate random 6-digit code
    const code = this.generateRandomCode(this.config.codeLength);

    // Hash code for storage
    const hashedCode = await bcrypt.hash(code, 10);

    // Store in Redis
    const key = this.getCodeKey(identifier, type);
    const expiresAt = new Date(Date.now() + this.config.expirationSeconds * 1000);

    await this.redis.setex(
      key,
      this.config.expirationSeconds,
      JSON.stringify({
        hashedCode,
        attempts: 0,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      })
    );

    // Increment rate limit counter
    await this.incrementRateLimit(identifier, type);

    logger.info('Verification code generated', {
      identifier: this.maskIdentifier(identifier),
      type,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      code,
      expiresAt,
    };
  }

  /**
   * Verify code
   *
   * Validates verification code against stored hash.
   *
   * @param identifier - Email or phone number
   * @param type - Verification type ('email' or 'phone')
   * @param code - 6-digit verification code
   * @returns Verification result
   *
   * @example
   * ```typescript
   * const result = await verificationService.verifyCode('user@example.com', 'email', '123456');
   * if (result.valid) {
   *   await db.update(users).set({ emailVerified: true }).where(eq(users.email, email));
   * }
   * ```
   */
  async verifyCode(
    identifier: string,
    type: 'email' | 'phone',
    code: string
  ): Promise<VerificationAttemptResult> {
    const key = this.getCodeKey(identifier, type);

    // Get stored code data
    const data = await this.redis.get(key);
    if (!data) {
      return {
        valid: false,
        attemptsRemaining: 0,
        error: 'NOT_FOUND',
      };
    }

    const stored = JSON.parse(data) as {
      hashedCode: string;
      attempts: number;
      expiresAt: string;
    };

    // Check expiration
    if (new Date(stored.expiresAt) < new Date()) {
      await this.redis.del(key);
      return {
        valid: false,
        attemptsRemaining: 0,
        error: 'EXPIRED',
      };
    }

    // Check max attempts
    if (stored.attempts >= this.config.maxAttempts) {
      return {
        valid: false,
        attemptsRemaining: 0,
        error: 'MAX_ATTEMPTS',
      };
    }

    // Verify code
    const isValid = await bcrypt.compare(code, stored.hashedCode);

    if (isValid) {
      // Delete code after successful verification
      await this.redis.del(key);

      logger.info('Verification code verified successfully', {
        identifier: this.maskIdentifier(identifier),
        type,
      });

      return {
        valid: true,
        attemptsRemaining: this.config.maxAttempts - stored.attempts - 1,
      };
    }

    // Increment attempts
    stored.attempts++;
    await this.redis.setex(
      key,
      this.config.expirationSeconds,
      JSON.stringify(stored)
    );

    logger.warn('Invalid verification code attempt', {
      identifier: this.maskIdentifier(identifier),
      type,
      attemptsRemaining: this.config.maxAttempts - stored.attempts,
    });

    return {
      valid: false,
      attemptsRemaining: this.config.maxAttempts - stored.attempts,
      error: 'INVALID',
    };
  }

  /**
   * Check rate limit for code generation
   *
   * Prevents abuse by limiting code generation requests.
   *
   * @param identifier - Email or phone number
   * @param type - Verification type
   * @returns Rate limit status
   */
  async checkRateLimit(
    identifier: string,
    type: 'email' | 'phone'
  ): Promise<RateLimitResult> {
    const key = this.getRateLimitKey(identifier, type);
    const count = await this.redis.get(key);

    const currentCount = count ? parseInt(count, 10) : 0;
    const allowed = currentCount < this.config.maxGenerationRequests;

    const ttl = await this.redis.ttl(key);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.config.rateLimitWindow * 1000));

    return {
      allowed,
      remainingRequests: Math.max(0, this.config.maxGenerationRequests - currentCount),
      resetAt,
    };
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(
    identifier: string,
    type: 'email' | 'phone'
  ): Promise<void> {
    const key = this.getRateLimitKey(identifier, type);
    const count = await this.redis.incr(key);

    if (count === 1) {
      // First request, set expiration
      await this.redis.expire(key, this.config.rateLimitWindow);
    }
  }

  /**
   * Delete verification code
   *
   * Manually invalidate a code (e.g., after successful verification).
   *
   * @param identifier - Email or phone number
   * @param type - Verification type
   */
  async deleteCode(identifier: string, type: 'email' | 'phone'): Promise<void> {
    const key = this.getCodeKey(identifier, type);
    await this.redis.del(key);

    logger.info('Verification code deleted', {
      identifier: this.maskIdentifier(identifier),
      type,
    });
  }

  /**
   * Generate random numeric code
   */
  private generateRandomCode(length: number): string {
    // Generate random bytes and convert to digits
    const bytes = randomBytes(Math.ceil(length / 2));
    const hex = bytes.toString('hex');
    const digits = hex.replace(/[^0-9]/g, '');

    // If we don't have enough digits, generate more
    if (digits.length < length) {
      return this.generateRandomCode(length);
    }

    return digits.substring(0, length);
  }

  /**
   * Get Redis key for verification code
   */
  private getCodeKey(identifier: string, type: 'email' | 'phone'): string {
    return `verification:code:${type}:${identifier.toLowerCase()}`;
  }

  /**
   * Get Redis key for rate limiting
   */
  private getRateLimitKey(identifier: string, type: 'email' | 'phone'): string {
    return `verification:ratelimit:${type}:${identifier.toLowerCase()}`;
  }

  /**
   * Mask identifier for logging (privacy)
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email: show first 2 chars and domain
      const [local, domain] = identifier.split('@');
      return `${local?.substring(0, 2)}***@${domain}`;
    } else {
      // Phone: show last 4 digits
      return `***${identifier.slice(-4)}`;
    }
  }
}

/**
 * Create verification code service
 *
 * @param redis - Redis client instance
 * @param config - Optional configuration overrides
 * @returns Verification code service instance
 */
export function createVerificationCodeService(
  redis: Redis,
  config?: Partial<VerificationCodeConfig>
): VerificationCodeService {
  return new VerificationCodeService(redis, { ...DEFAULT_CONFIG, ...config });
}
