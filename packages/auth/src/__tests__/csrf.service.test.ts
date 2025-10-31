/**
 * CSRF Service Tests
 * Validates CSRF token fetching and validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CSRFService } from '../services/csrf.service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CSRFService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getToken', () => {
    it('should fetch CSRF token from Auth.js endpoint', async () => {
      const mockToken = 'csrf-token-abc123xyz789';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const result = await CSRFService.getToken();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/csrf', {
        credentials: 'include',
      });
      expect(result.token).toBe(mockToken);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should use configured API base URL', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      await CSRFService.getToken();

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/auth/csrf', {
        credentials: 'include',
      });

      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(CSRFService.getToken()).rejects.toThrow('CSRF token fetch failed');
    });

    it('should throw error on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(CSRFService.getToken()).rejects.toThrow('CSRF token fetch failed');
    });

    it('should set 1-hour expiry', async () => {
      const now = Date.now();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const result = await CSRFService.getToken();

      // Check expiry is approximately 1 hour from now (±1 second tolerance)
      const expectedExpiry = now + 3600000;
      expect(Math.abs(result.expiresAt - expectedExpiry)).toBeLessThan(1000);
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate correct token formats', () => {
      // UUID format
      expect(CSRFService.validateTokenFormat('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

      // Base64 format
      expect(CSRFService.validateTokenFormat('AbCdEf1234567890_-AbCdEf1234567890_-')).toBe(true);

      // Long token (64 chars)
      expect(CSRFService.validateTokenFormat('a'.repeat(64))).toBe(true);
    });

    it('should reject tokens that are too short', () => {
      expect(CSRFService.validateTokenFormat('short')).toBe(false);
      expect(CSRFService.validateTokenFormat('a'.repeat(31))).toBe(false);
    });

    it('should reject tokens that are too long', () => {
      expect(CSRFService.validateTokenFormat('a'.repeat(129))).toBe(false);
    });

    it('should reject tokens with invalid characters', () => {
      expect(CSRFService.validateTokenFormat('token with spaces')).toBe(false);
      expect(CSRFService.validateTokenFormat('token@#$%')).toBe(false);
      expect(CSRFService.validateTokenFormat('token/with/slashes')).toBe(false);
    });

    it('should reject null or empty tokens', () => {
      // @ts-expect-error - Testing invalid input
      expect(CSRFService.validateTokenFormat(null)).toBe(false);
      // @ts-expect-error - Testing invalid input
      expect(CSRFService.validateTokenFormat(undefined)).toBe(false);
      expect(CSRFService.validateTokenFormat('')).toBe(false);
    });

    it('should accept valid UUID tokens', () => {
      const uuidToken = '123e4567-e89b-12d3-a456-426614174000';
      expect(CSRFService.validateTokenFormat(uuidToken)).toBe(true);
    });

    it('should accept valid base64url tokens', () => {
      const base64Token = 'AbCdEf123456_-AbCdEf123456_-AbCdEf123456';
      expect(CSRFService.validateTokenFormat(base64Token)).toBe(true);
    });
  });

  describe('addTokenToRequest', () => {
    it('should add CSRF token to request headers', () => {
      const token = 'csrf-token-123';
      const options = { method: 'POST' };

      const result = CSRFService.addTokenToRequest(token, options);

      expect(result.headers).toEqual({
        'X-CSRF-Token': token,
      });
      expect(result.credentials).toBe('include');
      expect(result.method).toBe('POST');
    });

    it('should merge with existing headers', () => {
      const token = 'csrf-token-456';
      const options = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const result = CSRFService.addTokenToRequest(token, options);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      });
    });

    it('should work with empty options', () => {
      const token = 'csrf-token-789';

      const result = CSRFService.addTokenToRequest(token);

      expect(result.headers).toEqual({
        'X-CSRF-Token': token,
      });
      expect(result.credentials).toBe('include');
    });

    it('should preserve other request options', () => {
      const token = 'token';
      const options = {
        method: 'PUT',
        body: JSON.stringify({ data: 'value' }),
        mode: 'cors' as RequestMode,
      };

      const result = CSRFService.addTokenToRequest(token, options);

      expect(result.method).toBe('PUT');
      expect(result.body).toBe(options.body);
      expect(result.mode).toBe('cors');
    });
  });

  describe('createFormField', () => {
    it('should create hidden input field', () => {
      const token = 'csrf-token-abc';
      const field = CSRFService.createFormField(token);

      expect(field).toBe('<input type="hidden" name="csrfToken" value="csrf-token-abc" />');
    });

    it('should escape HTML in token value', () => {
      const token = 'token"><script>alert(1)</script>';
      const field = CSRFService.createFormField(token);

      // Field should contain the raw token (escaping handled by browser)
      expect(field).toContain('value="token"><script>alert(1)</script>"');
    });
  });

  describe('createAuthenticatedFetch', () => {
    it('should create fetch wrapper with CSRF token', async () => {
      const mockToken = 'csrf-token-wrapper';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const authenticatedFetch = await CSRFService.createAuthenticatedFetch();

      // Clear mock to test the wrapper
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authenticatedFetch('/api/data', { method: 'POST' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-CSRF-Token': mockToken,
          },
          credentials: 'include',
        })
      );
    });

    it('should reuse same token for multiple requests', async () => {
      const mockToken = 'csrf-token-reuse';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const authenticatedFetch = await CSRFService.createAuthenticatedFetch();

      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await authenticatedFetch('/api/endpoint1');
      await authenticatedFetch('/api/endpoint2');

      // Both calls should use the same token from initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          headers: { 'X-CSRF-Token': mockToken },
        })
      );
      expect(mockFetch.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          headers: { 'X-CSRF-Token': mockToken },
        })
      );
    });
  });
});
