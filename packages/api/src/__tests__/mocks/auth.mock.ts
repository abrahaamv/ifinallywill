/**
 * Mock @platform/auth package for API tests
 *
 * Provides mock implementations to avoid Next.js dependency in Fastify tests
 */

import type { AuthConfig } from '@auth/core';

// Mock authConfig - minimal configuration for testing
export const authConfig: AuthConfig = {
  providers: [],
  secret: 'test-secret-key-for-testing-only',
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
};

// Mock auth function
export const auth = async () => null;

// Mock handlers
export const handlers = {
  GET: async () => new Response('Mock auth handler', { status: 200 }),
  POST: async () => new Response('Mock auth handler', { status: 200 }),
};

// Mock signIn
export const signIn = async () => {
  throw new Error('signIn not available in tests');
};

// Mock signOut
export const signOut = async () => {
  throw new Error('signOut not available in tests');
};

// Mock helper functions
export const getSession = async () => null;
export const getUserId = async () => null;
export const getTenantId = async () => null;
export const requireAuth = async () => {
  throw new Error('requireAuth not available in tests');
};
export const requireTenant = async () => {
  throw new Error('requireTenant not available in tests');
};
export const hasRole = () => false;
export const requireRole = async () => {
  throw new Error('requireRole not available in tests');
};

// Mock middleware
export const authMiddleware = async () => ({
  session: null,
  tenantId: null,
  userId: null,
  role: 'user' as const,
});

export const refreshSession = async () => {};
export const logoutCleanup = async () => {};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Mock services
export const passwordService = {
  hash: async (password: string) => `hashed_${password}`,
  verify: async () => true,
  needsRehash: () => false,
};

export class MFAService {
  static async setup() {
    return {
      secret: 'mock-secret',
      qrCode: 'mock-qr-code',
      backupCodes: ['mock-backup-1', 'mock-backup-2'],
    };
  }

  static async verify() {
    return { success: true };
  }

  static async disable() {}
}

export class ApiKeyService {
  static async generate() {
    return {
      id: 'mock-api-key-id',
      key: 'mock-api-key',
      prefix: 'sk_test',
      tenantId: 'mock-tenant-id',
      createdAt: new Date(),
    };
  }

  static async validate() {
    return {
      valid: true,
      tenantId: 'mock-tenant-id',
      permissions: [],
    };
  }

  static async revoke() {}
}

// Mock CSRF service
export class CSRFService {
  static async generateToken() {
    return { token: 'mock-csrf-token', expires: Date.now() + 3600000 };
  }

  static async validateToken() {
    return true;
  }
}

// Mock hooks
export const useCSRF = () => ({
  csrfToken: 'mock-csrf-token',
  loading: false,
  error: null,
});

export const useAuthenticatedFetch = () => fetch;
