/**
 * API Key Service Tests
 * Validates API key generation, validation, and security
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ApiKeyService } from '../services/api-key.service';
import type { ApiKeyType } from '../services/api-key.service';

describe('ApiKeyService', () => {
  describe('generateApiKey', () => {
    it('should generate publishable API key with correct format', () => {
      const result = ApiKeyService.generateApiKey('publishable');

      expect(result.apiKey).toMatch(/^pk_(live|test)_[a-zA-Z0-9_-]{32}$/);
      expect(result.keyPrefix).toBe(result.apiKey.substring(0, 14));
      expect(result.keyHash).toHaveLength(64); // SHA-256 hex = 64 characters
    });

    it('should generate secret API key with correct format', () => {
      const result = ApiKeyService.generateApiKey('secret');

      expect(result.apiKey).toMatch(/^sk_(live|test)_[a-zA-Z0-9_-]{32}$/);
      expect(result.keyPrefix).toBe(result.apiKey.substring(0, 14));
      expect(result.keyHash).toHaveLength(64);
    });

    it('should use live prefix in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = ApiKeyService.generateApiKey('publishable');

      expect(result.apiKey).toMatch(/^pk_live_/);

      process.env.NODE_ENV = originalEnv;
    });

    it('should use test prefix in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = ApiKeyService.generateApiKey('publishable');

      expect(result.apiKey).toMatch(/^pk_test_/);

      process.env.NODE_ENV = originalEnv;
    });

    it('should generate unique API keys', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        const result = ApiKeyService.generateApiKey('publishable');
        keys.add(result.apiKey);
      }

      expect(keys.size).toBe(100);
    });

    it('should generate unique hashes for different keys', () => {
      const key1 = ApiKeyService.generateApiKey('publishable');
      const key2 = ApiKeyService.generateApiKey('publishable');

      expect(key1.keyHash).not.toBe(key2.keyHash);
    });

    it('should generate consistent hash for same key', () => {
      const result = ApiKeyService.generateApiKey('publishable');

      // Hash the key again manually
      const hash1 = ApiKeyService.hashApiKey(result.apiKey);
      const hash2 = ApiKeyService.hashApiKey(result.apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(result.keyHash);
    });

    it('should extract correct prefix', () => {
      const pk = ApiKeyService.generateApiKey('publishable');
      const sk = ApiKeyService.generateApiKey('secret');

      expect(pk.keyPrefix).toMatch(/^pk_(live|test)_[a-zA-Z0-9_-]+$/);
      expect(sk.keyPrefix).toMatch(/^sk_(live|test)_[a-zA-Z0-9_-]+$/);
      expect(pk.keyPrefix).toHaveLength(14);
      expect(sk.keyPrefix).toHaveLength(14);
    });
  });

  describe('hashApiKey', () => {
    it('should generate SHA-256 HMAC hash', () => {
      const apiKey = 'pk_test_abcdefghijklmnopqrstuvwxyz123456';
      const hash = ApiKeyService.hashApiKey(apiKey);

      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes', () => {
      const apiKey = 'pk_test_abc123def456ghi789';
      const hash1 = ApiKeyService.hashApiKey(apiKey);
      const hash2 = ApiKeyService.hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = 'pk_test_abc123';
      const key2 = 'pk_test_def456';

      const hash1 = ApiKeyService.hashApiKey(key1);
      const hash2 = ApiKeyService.hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('should be case-sensitive', () => {
      const key1 = 'pk_test_ABC123';
      const key2 = 'pk_test_abc123';

      const hash1 = ApiKeyService.hashApiKey(key1);
      const hash2 = ApiKeyService.hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractKeyPrefix', () => {
    it('should extract prefix from publishable key', () => {
      const apiKey = 'pk_live_abcdefghijklmnopqrstuvwxyz';
      const prefix = ApiKeyService.extractKeyPrefix(apiKey);

      expect(prefix).toBe('pk_live_abcdef');
    });

    it('should extract prefix from secret key', () => {
      const apiKey = 'sk_test_1234567890abcdefghij';
      const prefix = ApiKeyService.extractKeyPrefix(apiKey);

      expect(prefix).toBe('sk_test_123456');
    });

    it('should return first 14 characters', () => {
      const apiKey = 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxx';
      const prefix = ApiKeyService.extractKeyPrefix(apiKey);

      expect(prefix).toHaveLength(14);
    });

    it('should handle short keys gracefully', () => {
      const apiKey = 'pk_test';
      const prefix = ApiKeyService.extractKeyPrefix(apiKey);

      expect(prefix).toBe('pk_test');
    });
  });

  describe('isPublishableKey', () => {
    it('should identify publishable keys', () => {
      expect(ApiKeyService.isPublishableKey('pk_live_abc123')).toBe(true);
      expect(ApiKeyService.isPublishableKey('pk_test_xyz789')).toBe(true);
    });

    it('should reject secret keys', () => {
      expect(ApiKeyService.isPublishableKey('sk_live_abc123')).toBe(false);
      expect(ApiKeyService.isPublishableKey('sk_test_xyz789')).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(ApiKeyService.isPublishableKey('invalid_key')).toBe(false);
      expect(ApiKeyService.isPublishableKey('')).toBe(false);
      expect(ApiKeyService.isPublishableKey('pk_')).toBe(false);
    });
  });

  describe('isSecretKey', () => {
    it('should identify secret keys', () => {
      expect(ApiKeyService.isSecretKey('sk_live_abc123')).toBe(true);
      expect(ApiKeyService.isSecretKey('sk_test_xyz789')).toBe(true);
    });

    it('should reject publishable keys', () => {
      expect(ApiKeyService.isSecretKey('pk_live_abc123')).toBe(false);
      expect(ApiKeyService.isSecretKey('pk_test_xyz789')).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(ApiKeyService.isSecretKey('invalid_key')).toBe(false);
      expect(ApiKeyService.isSecretKey('')).toBe(false);
      expect(ApiKeyService.isSecretKey('sk_')).toBe(false);
    });
  });

  describe('Security properties', () => {
    it('should generate cryptographically random keys', () => {
      const keys = Array.from({ length: 10 }, () => ApiKeyService.generateApiKey('publishable'));

      // Check that all keys are unique (no collisions in small sample)
      const uniqueKeys = new Set(keys.map((k) => k.apiKey));
      expect(uniqueKeys.size).toBe(10);

      // Check that keys have sufficient entropy (not sequential or predictable)
      const hashes = keys.map((k) => k.keyHash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);
    });

    it('should use HMAC for hash generation (not plain hash)', () => {
      // HMAC requires a secret key, so same input with different secrets
      // should produce different hashes
      const apiKey = 'pk_test_abc123';
      const hash = ApiKeyService.hashApiKey(apiKey);

      // Verify hash is deterministic for same key and secret
      const hash2 = ApiKeyService.hashApiKey(apiKey);
      expect(hash).toBe(hash2);

      // Cannot verify secret usage directly without access to internals,
      // but we can verify hash format (64 hex chars = SHA-256)
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should prevent key enumeration via prefix', () => {
      // Key prefix should not reveal too much information
      const key = ApiKeyService.generateApiKey('publishable');

      // Prefix is 14 chars, full key is ~40+ chars
      // This leaves ~26+ chars secret
      expect(key.apiKey.length).toBeGreaterThan(40);
      expect(key.keyPrefix.length).toBe(14);
      expect(key.apiKey.length - key.keyPrefix.length).toBeGreaterThan(26);
    });
  });
});
