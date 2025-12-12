/**
 * Email Validation Service - Emailable Integration
 * Validates email addresses before sending to prevent bounces
 * Created: 2025-12-10
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('email-validation');

interface EmailableResponse {
  email: string;
  domain: string;
  state: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
  reason: string;
  score: number;
  disposable: boolean;
  role: boolean;
  free: boolean;
  accept_all: boolean;
  did_you_mean: string | null;
  user: string;
  tag: string | null;
  duration: number;
}

interface EmailValidationResult {
  valid: boolean;
  deliverable: boolean;
  email: string;
  reason?: string;
  score?: number;
  state?: string;
  domain?: string;
  disposable?: boolean;
  roleAddress?: boolean;
  freeProvider?: boolean;
}

interface EmailValidationConfig {
  apiKey: string;
}

export class EmailValidationService {
  private apiKey: string;
  private baseUrl = 'https://api.emailable.com/v1';

  constructor(config: EmailValidationConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Validate a single email address
   * Returns detailed validation results including deliverability
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/verify?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Emailable API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as EmailableResponse;

      const isValid = result.state === 'deliverable';
      const isDeliverable = result.state === 'deliverable' || result.state === 'risky';

      logger.info('Email validated', {
        email,
        state: result.state,
        score: result.score,
        valid: isValid
      });

      return {
        valid: isValid,
        deliverable: isDeliverable,
        email: result.email || email,
        reason: result.reason,
        score: result.score,
        state: result.state,
        domain: result.domain,
        disposable: result.disposable,
        roleAddress: result.role,
        freeProvider: result.free,
      };
    } catch (error) {
      logger.error('Email validation failed', { email, error });

      // Return a conservative result on error - assume invalid
      return {
        valid: false,
        deliverable: false,
        email,
        reason: error instanceof Error ? error.message : 'Validation service error',
      };
    }
  }

  /**
   * Quick check if email is valid (synchronous format check + async deliverability)
   * Use this for registration flows
   */
  async isEmailValid(email: string): Promise<boolean> {
    // Quick format check first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    const result = await this.validateEmail(email);
    return result.valid;
  }

  /**
   * Check if email is deliverable (includes risky emails)
   * Use this when you want to accept more emails but with awareness
   */
  async isEmailDeliverable(email: string): Promise<boolean> {
    const result = await this.validateEmail(email);
    return result.deliverable;
  }

  /**
   * Check if email is a disposable/temporary address
   * Use this to block throwaway emails
   */
  async isDisposableEmail(email: string): Promise<boolean> {
    const result = await this.validateEmail(email);
    return result.disposable ?? false;
  }

  /**
   * Get email quality score (0-100)
   * Higher score = better quality email
   */
  async getEmailScore(email: string): Promise<number> {
    const result = await this.validateEmail(email);
    return result.score ?? 0;
  }
}

/**
 * Create email validation service from environment variables
 */
export function createEmailValidationService(): EmailValidationService {
  const apiKey = process.env.EMAILABLE_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Emailable configuration. Set EMAILABLE_API_KEY');
  }

  return new EmailValidationService({ apiKey });
}

/**
 * Create optional email validation service (returns null if not configured)
 * Use this when email validation is optional
 */
export function createOptionalEmailValidationService(): EmailValidationService | null {
  const apiKey = process.env.EMAILABLE_API_KEY;

  if (!apiKey) {
    logger.warn('Email validation service not configured - EMAILABLE_API_KEY not set');
    return null;
  }

  return new EmailValidationService({ apiKey });
}
