/**
 * API Key Service - Phase 8 Day 8-10
 *
 * Manages API keys for widget authentication and external integrations.
 *
 * **Key Types**:
 * - **Publishable** (`pk_live_*`): Safe to expose client-side (widgets, public APIs)
 * - **Secret** (`sk_live_*`): Server-side only (administrative operations)
 *
 * **Security Features**:
 * - SHA-256 HMAC hashing (keys never stored in plaintext)
 * - Scoped permissions (read, write, admin)
 * - IP whitelisting support
 * - Expiration and revocation
 * - Usage tracking and rate limiting
 *
 * **Authentication Flow**:
 * 1. Client sends API key in `X-Api-Key` header
 * 2. Server hashes key with HMAC-SHA256
 * 3. Lookup hash in database
 * 4. Validate expiration, revocation, permissions, IP whitelist
 * 5. Attach user context to request
 *
 * Reference: OWASP API Security Top 10 2023 - API2:2023 Broken Authentication
 */

import { createHmac, randomBytes } from 'node:crypto';

/**
 * API key type (publishable or secret)
 */
export type ApiKeyType = 'publishable' | 'secret';

/**
 * API key permissions
 */
export type ApiKeyPermission = 'read' | 'write' | 'admin';

/**
 * API key validation result
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  tenantId?: string;
  permissions?: ApiKeyPermission[];
  type?: ApiKeyType;
}

/**
 * Generated API key result
 */
export interface GeneratedApiKey {
  apiKey: string; // Full API key (show once, never logged)
  keyHash: string; // SHA-256 HMAC hash for storage
  keyPrefix: string; // First 14 characters (pk_live_xxxxx)
}

/**
 * API Key Service
 *
 * Handles generation, validation, and revocation of API keys.
 */
export class ApiKeyService {
  /**
   * HMAC secret for API key hashing
   *
   * CRITICAL: Use dedicated secret, not SESSION_SECRET
   * Rotation requires re-hashing all active keys
   * MUST be set in production - no fallback to prevent weak hashing
   */
  private static readonly API_KEY_SECRET = (() => {
    const secret = process.env.API_KEY_SECRET;

    // Fail-fast in production if secret is missing
    if (process.env.NODE_ENV === 'production' && !secret) {
      throw new Error(
        'API_KEY_SECRET required in production. ' +
        'Generate a secure key: openssl rand -hex 32'
      );
    }

    // In development, use a consistent fallback for testing
    return secret || 'development-api-key-secret-do-not-use-in-production';
  })();

  /**
   * Generate new API key
   *
   * Formats:
   * - Publishable: `pk_live_<24-byte-base64url>` (safe for client-side)
   * - Secret: `sk_live_<24-byte-base64url>` (server-side only)
   *
   * @param type - API key type (publishable or secret)
   * @returns Generated API key with hash and prefix
   *
   * @example
   * ```typescript
   * const { apiKey, keyHash, keyPrefix } = ApiKeyService.generateApiKey('publishable');
   * // apiKey: "pk_live_8xK9wN4mP2qR5tY7u"
   * // keyHash: "3a7bd3e2..." (SHA-256 HMAC)
   * // keyPrefix: "pk_live_8xK9w"
   * ```
   */
  static generateApiKey(type: ApiKeyType): GeneratedApiKey {
    // Generate random 24-byte (192-bit) identifier
    // Base64URL encoding = 32 characters (URL-safe, no padding)
    const random = randomBytes(24).toString('base64url');

    // Prefix indicates key type and environment
    // Production: pk_live_ or sk_live_
    // Development: pk_test_ or sk_test_
    const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const prefix = type === 'publishable' ? `pk_${env}` : `sk_${env}`;
    const apiKey = `${prefix}_${random}`;

    // Hash key for storage (HMAC-SHA256)
    const keyHash = ApiKeyService.hashApiKey(apiKey);

    // Store first 14 characters for display (pk_live_xxxxx)
    const keyPrefix = apiKey.substring(0, 14);

    return { apiKey, keyHash, keyPrefix };
  }

  /**
   * Hash API key using HMAC-SHA256
   *
   * HMAC provides keyed hashing (more secure than plain SHA-256).
   * Attacker cannot pre-compute rainbow tables without secret.
   *
   * @param apiKey - Plain-text API key
   * @returns SHA-256 HMAC hash (64 hex characters)
   */
  static hashApiKey(apiKey: string): string {
    return createHmac('sha256', ApiKeyService.API_KEY_SECRET).update(apiKey).digest('hex');
  }

  /**
   * Validate API key format
   *
   * Checks format without database lookup.
   * Useful for early rejection of malformed keys.
   *
   * @param apiKey - API key to validate
   * @returns True if format is valid
   */
  static isValidFormat(apiKey: string): boolean {
    // Valid formats:
    // - pk_live_<32-chars> or pk_test_<32-chars>
    // - sk_live_<32-chars> or sk_test_<32-chars>
    const regex = /^(pk|sk)_(live|test)_[A-Za-z0-9_-]{32,}$/;
    return regex.test(apiKey);
  }

  /**
   * Extract API key type from key
   *
   * @param apiKey - API key
   * @returns API key type (publishable or secret)
   */
  static getKeyType(apiKey: string): ApiKeyType | null {
    if (apiKey.startsWith('pk_')) {
      return 'publishable';
    }
    if (apiKey.startsWith('sk_')) {
      return 'secret';
    }
    return null;
  }

  /**
   * Extract key prefix (first 14 characters)
   *
   * Used for logging and display purposes without exposing full key.
   *
   * @param apiKey - API key
   * @returns First 14 characters of the key
   *
   * @example
   * ```typescript
   * ApiKeyService.extractKeyPrefix('pk_live_abcdefghijklmnopqrstuvwxyz')
   * // Returns: "pk_live_abcdef"
   * ```
   */
  static extractKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 14);
  }

  /**
   * Check if API key is a publishable key
   *
   * @param apiKey - API key to check
   * @returns True if key is publishable (pk_) and has valid format
   */
  static isPublishableKey(apiKey: string): boolean {
    return apiKey.startsWith('pk_') && ApiKeyService.isValidFormat(apiKey);
  }

  /**
   * Check if API key is a secret key
   *
   * @param apiKey - API key to check
   * @returns True if key is secret (sk_) and has valid format
   */
  static isSecretKey(apiKey: string): boolean {
    return apiKey.startsWith('sk_') && ApiKeyService.isValidFormat(apiKey);
  }

  /**
   * Generate scoped permissions array
   *
   * @param scope - Permission scope (read, write, admin)
   * @returns Array of permissions
   */
  static generatePermissions(scope: 'read' | 'write' | 'admin'): ApiKeyPermission[] {
    switch (scope) {
      case 'read':
        return ['read'];
      case 'write':
        return ['read', 'write'];
      case 'admin':
        return ['read', 'write', 'admin'];
      default:
        return ['read'];
    }
  }

  /**
   * Check if API key has specific permission
   *
   * @param permissions - User's permissions
   * @param required - Required permission
   * @returns True if permission granted
   */
  static hasPermission(permissions: ApiKeyPermission[], required: ApiKeyPermission): boolean {
    // Admin has all permissions
    if (permissions.includes('admin')) {
      return true;
    }

    // Write includes read
    if (required === 'read' && permissions.includes('write')) {
      return true;
    }

    // Direct permission check
    return permissions.includes(required);
  }

  /**
   * Validate IP address against whitelist
   *
   * Supports individual IPs and CIDR ranges.
   *
   * @param clientIp - Client IP address
   * @param whitelist - Array of allowed IPs/CIDR ranges
   * @returns True if IP allowed
   *
   * @example
   * ```typescript
   * ApiKeyService.validateIpWhitelist('192.168.1.100', ['192.168.1.0/24'])
   * // Returns: true (IP within CIDR range)
   *
   * ApiKeyService.validateIpWhitelist('10.0.0.1', ['192.168.1.100'])
   * // Returns: false (IP not in whitelist)
   * ```
   */
  static validateIpWhitelist(clientIp: string, whitelist: string[]): boolean {
    if (!whitelist || whitelist.length === 0) {
      // No whitelist = allow all IPs
      return true;
    }

    // Check exact IP match
    if (whitelist.includes(clientIp)) {
      return true;
    }

    // Check CIDR range match
    for (const entry of whitelist) {
      if (entry.includes('/')) {
        // CIDR notation detected
        if (ApiKeyService.isIpInCidr(clientIp, entry)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if IP address is within CIDR range
   *
   * @param ip - IP address to check
   * @param cidr - CIDR range (e.g., 192.168.1.0/24)
   * @returns True if IP is in range
   */
  private static isIpInCidr(ip: string, cidr: string): boolean {
    const parts = cidr.split('/');
    if (parts.length !== 2) {
      return false;
    }

    const [range, bits] = parts;
    if (!range || !bits) {
      return false;
    }

    const mask = ~(2 ** (32 - Number.parseInt(bits, 10)) - 1);

    const ipNum = ApiKeyService.ipToNumber(ip);
    const rangeNum = ApiKeyService.ipToNumber(range);

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IP address to 32-bit integer
   *
   * @param ip - IP address
   * @returns 32-bit integer
   */
  private static ipToNumber(ip: string): number {
    return (
      ip.split('.').reduce((acc: number, octet: string) => {
        return (acc << 8) + Number.parseInt(octet, 10);
      }, 0) >>> 0
    );
  }
}
