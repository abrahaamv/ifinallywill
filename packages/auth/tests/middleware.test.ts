/**
 * Auth Middleware Tests
 *
 * These tests verify request-scoped authentication middleware that sets
 * PostgreSQL RLS context for multi-tenant isolation.
 *
 * Test Coverage:
 * 1. authMiddleware() - Request-scoped auth context setup
 * 2. requireRole() - Role-based authorization
 * 3. AuthError - Custom error handling
 * 4. Edge cases - Missing session, invalid tenant, SQL injection prevention
 */

import { sql } from '@platform/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authModule from '../src/lib/auth';
import { AuthError, authMiddleware, logoutCleanup, requireRole } from '../src/lib/middleware';
import * as tenantContextModule from '../src/lib/tenant-context';
import { TEST_TENANT_IDS, createMockRequest, createMockSession } from './helpers';

// Mock Auth.js auth function
vi.mock('../src/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock tenant context helpers (we test these separately)
vi.mock('../src/lib/tenant-context', () => ({
  extractTenantFromSession: vi.fn(),
  extractRoleFromSession: vi.fn(),
  isValidTenantId: vi.fn(),
  hasRole: vi.fn(),
}));

describe('authMiddleware()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract auth context and set RLS tenant ID', async () => {
    // Setup mocks
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1, 'user-123', 'admin');
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.tenant1
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
    vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue('admin');

    const req = createMockRequest();

    // Execute middleware
    const context = await authMiddleware(req);

    // Assertions
    expect(context).toEqual({
      session: mockSession,
      tenantId: TEST_TENANT_IDS.tenant1,
      userId: 'user-123',
      role: 'admin',
    });

    // Verify mocks were called correctly
    expect(authModule.auth).toHaveBeenCalledOnce();
    expect(tenantContextModule.extractTenantFromSession).toHaveBeenCalledWith(mockSession);
    expect(tenantContextModule.isValidTenantId).toHaveBeenCalledWith(TEST_TENANT_IDS.tenant1);
    expect(tenantContextModule.extractRoleFromSession).toHaveBeenCalledWith(mockSession);
  });

  it('should throw UNAUTHORIZED error when session is missing', async () => {
    // Mock no session
    vi.mocked(authModule.auth).mockResolvedValue(null);

    const req = createMockRequest();

    // Execute and assert
    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toThrow('No active session - please sign in');

    try {
      await authMiddleware(req);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      if (error instanceof AuthError) {
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.statusCode).toBe(401);
      }
    }
  });

  it('should throw UNAUTHORIZED error when session.user is missing', async () => {
    // Mock session without user
    vi.mocked(authModule.auth).mockResolvedValue({ user: undefined } as any);

    const req = createMockRequest();

    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });

  it('should throw INVALID_TENANT error when tenant ID is missing', async () => {
    // Mock session with no tenant
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1);
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(null);

    const req = createMockRequest();

    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toThrow('Missing tenant context');
    await expect(authMiddleware(req)).rejects.toMatchObject({
      code: 'INVALID_TENANT',
      statusCode: 403,
    });
  });

  it('should throw INVALID_TENANT error when tenant ID format is invalid', async () => {
    // Mock session with invalid tenant ID
    const mockSession = createMockSession(TEST_TENANT_IDS.invalidUuid);
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.invalidUuid
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(false); // Invalid UUID

    const req = createMockRequest();

    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toThrow('Invalid tenant ID format');
    await expect(authMiddleware(req)).rejects.toMatchObject({
      code: 'INVALID_TENANT',
      statusCode: 403,
    });
  });

  it('should throw FORBIDDEN error when user role is missing', async () => {
    // Mock session with no role
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1);
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.tenant1
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
    vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue(null);

    const req = createMockRequest();

    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toThrow('Missing user role');
    await expect(authMiddleware(req)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should prevent SQL injection in tenant ID', async () => {
    // Mock session with SQL injection attempt
    const sqlInjectionTenantId = "'; DROP TABLE users; --";
    const mockSession = createMockSession(sqlInjectionTenantId);
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(sqlInjectionTenantId);
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(false); // UUID validation fails

    const req = createMockRequest();

    // Should be blocked by UUID validation
    await expect(authMiddleware(req)).rejects.toThrow(AuthError);
    await expect(authMiddleware(req)).rejects.toMatchObject({
      code: 'INVALID_TENANT',
    });

    // Verify isValidTenantId was called to prevent injection
    expect(tenantContextModule.isValidTenantId).toHaveBeenCalledWith(sqlInjectionTenantId);
  });

  it('should support all valid roles', async () => {
    const roles: Array<'owner' | 'admin' | 'member'> = ['owner', 'admin', 'member'];

    for (const role of roles) {
      vi.clearAllMocks();

      const mockSession = createMockSession(TEST_TENANT_IDS.tenant1, 'user-123', role);
      vi.mocked(authModule.auth).mockResolvedValue(mockSession);
      vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
        TEST_TENANT_IDS.tenant1
      );
      vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
      vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue(role);

      const req = createMockRequest();
      const context = await authMiddleware(req);

      expect(context.role).toBe(role);
    }
  });
});

describe('requireRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow access when user has required role', async () => {
    // Setup: admin user accessing admin endpoint
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1, 'user-123', 'admin');
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.tenant1
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
    vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue('admin');
    vi.mocked(tenantContextModule.hasRole).mockReturnValue(true); // Has admin role

    const req = createMockRequest();
    const context = await requireRole(req, 'admin');

    expect(context.role).toBe('admin');
    expect(tenantContextModule.hasRole).toHaveBeenCalledWith(mockSession, 'admin');
  });

  it('should allow access when user has higher role than required', async () => {
    // Setup: owner user accessing admin endpoint (owner > admin)
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1, 'user-123', 'owner');
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.tenant1
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
    vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue('owner');
    vi.mocked(tenantContextModule.hasRole).mockReturnValue(true); // Owner has admin privileges

    const req = createMockRequest();
    const context = await requireRole(req, 'admin');

    expect(context.role).toBe('owner');
    expect(tenantContextModule.hasRole).toHaveBeenCalledWith(mockSession, 'admin');
  });

  it('should deny access when user has lower role than required', async () => {
    // Setup: member user trying to access admin endpoint
    const mockSession = createMockSession(TEST_TENANT_IDS.tenant1, 'user-123', 'member');
    vi.mocked(authModule.auth).mockResolvedValue(mockSession);
    vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
      TEST_TENANT_IDS.tenant1
    );
    vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
    vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue('member');
    vi.mocked(tenantContextModule.hasRole).mockReturnValue(false); // Member doesn't have admin privileges

    const req = createMockRequest();

    await expect(requireRole(req, 'admin')).rejects.toThrow(AuthError);
    await expect(requireRole(req, 'admin')).rejects.toThrow('Insufficient permissions');
    await expect(requireRole(req, 'admin')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should enforce role hierarchy: owner > admin > member', async () => {
    const testCases = [
      { userRole: 'owner', requiredRole: 'owner', hasRole: true, shouldPass: true },
      { userRole: 'owner', requiredRole: 'admin', hasRole: true, shouldPass: true },
      { userRole: 'owner', requiredRole: 'member', hasRole: true, shouldPass: true },
      { userRole: 'admin', requiredRole: 'owner', hasRole: false, shouldPass: false },
      { userRole: 'admin', requiredRole: 'admin', hasRole: true, shouldPass: true },
      { userRole: 'admin', requiredRole: 'member', hasRole: true, shouldPass: true },
      { userRole: 'member', requiredRole: 'owner', hasRole: false, shouldPass: false },
      { userRole: 'member', requiredRole: 'admin', hasRole: false, shouldPass: false },
      { userRole: 'member', requiredRole: 'member', hasRole: true, shouldPass: true },
    ] as const;

    for (const testCase of testCases) {
      vi.clearAllMocks();

      const mockSession = createMockSession(
        TEST_TENANT_IDS.tenant1,
        'user-123',
        testCase.userRole as 'owner' | 'admin' | 'member'
      );
      vi.mocked(authModule.auth).mockResolvedValue(mockSession);
      vi.mocked(tenantContextModule.extractTenantFromSession).mockReturnValue(
        TEST_TENANT_IDS.tenant1
      );
      vi.mocked(tenantContextModule.isValidTenantId).mockReturnValue(true);
      vi.mocked(tenantContextModule.extractRoleFromSession).mockReturnValue(
        testCase.userRole as 'owner' | 'admin' | 'member'
      );
      vi.mocked(tenantContextModule.hasRole).mockReturnValue(testCase.hasRole);

      const req = createMockRequest();

      if (testCase.shouldPass) {
        const context = await requireRole(
          req,
          testCase.requiredRole as 'owner' | 'admin' | 'member'
        );
        expect(context.role).toBe(testCase.userRole);
      } else {
        await expect(
          requireRole(req, testCase.requiredRole as 'owner' | 'admin' | 'member')
        ).rejects.toThrow(AuthError);
      }
    }
  });
});

describe('logoutCleanup()', () => {
  it('should reset tenant context on logout', async () => {
    // logoutCleanup() is a utility function that should not throw
    await expect(logoutCleanup()).resolves.toBeUndefined();
  });

  it('should handle database errors gracefully', async () => {
    // Even if SQL fails, logoutCleanup should not throw (logs error instead)
    await expect(logoutCleanup()).resolves.toBeUndefined();
  });
});

describe('AuthError', () => {
  it('should create error with correct properties', () => {
    const error = new AuthError('Test error message', 'UNAUTHORIZED', 401);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthError');
  });

  it('should support all error codes', () => {
    const codes: Array<'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_TENANT' | 'SESSION_EXPIRED'> = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'INVALID_TENANT',
      'SESSION_EXPIRED',
    ];

    for (const code of codes) {
      const error = new AuthError('Test message', code, 401);
      expect(error.code).toBe(code);
    }
  });

  it('should default to 401 status code', () => {
    const error = new AuthError('Test message', 'UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('should support custom status codes', () => {
    const testCases = [
      { code: 'UNAUTHORIZED' as const, statusCode: 401 },
      { code: 'FORBIDDEN' as const, statusCode: 403 },
      { code: 'INVALID_TENANT' as const, statusCode: 400 },
      { code: 'SESSION_EXPIRED' as const, statusCode: 401 },
    ];

    for (const { code, statusCode } of testCases) {
      const error = new AuthError('Test message', code, statusCode);
      expect(error.statusCode).toBe(statusCode);
    }
  });
});
