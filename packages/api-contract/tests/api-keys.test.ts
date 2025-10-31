/**
 * API Keys Router Test Suite (Phase 8 - Week 2)
 *
 * Comprehensive tests for API key management with security focus.
 *
 * Test Coverage:
 * - API Key Generation (create with scoped permissions)
 * - API Key Listing (tenant isolation)
 * - API Key Revocation (soft delete)
 * - API Key Validation (hash-based lookup, expiration, revocation)
 * - Permission Hierarchy (write requires read, admin requires both)
 * - Security (hashed storage, single-view keys, tenant isolation)
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../src/context';
import { apiKeysRouter } from '../src/routers/api-keys';

/**
 * Mock external dependencies
 *
 * Important: The transaction method passes a tx object that operations use.
 * We make tx reuse the db methods so test mocks (vi.mocked(db.insert)) apply to transactions.
 */
vi.mock('@platform/db', () => {
  const mockMethods = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    serviceDb: { ...mockMethods },
    db: {
      ...mockMethods,
      transaction: vi.fn(async (callback) => {
        // Create tx with execute method and reuse mockMethods so test mocks apply
        const tx = {
          ...mockMethods,
          execute: vi.fn().mockResolvedValue(undefined),
        };
        return await callback(tx);
      }),
    },
    apiKeys: {},
    eq: vi.fn(),
    orderBy: vi.fn(),
  };
});

vi.mock('@platform/auth', () => ({
  ApiKeyService: {
    generateApiKey: vi.fn((type: string) => ({
      apiKey: type === 'publishable' ? 'pk_live_test123456789' : 'sk_live_test123456789',
      keyHash: 'hashed_key_value',
      keyPrefix: type === 'publishable' ? 'pk_live_test' : 'sk_live_test',
    })),
    isValidFormat: vi.fn((key: string) => key.startsWith('pk_') || key.startsWith('sk_')),
    hashApiKey: vi.fn((key: string) => `hash_${key}`),
  },
}));

vi.mock('@platform/shared', () => ({
  badRequest: (opts: { message: string }) => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: opts.message });
  },
  unauthorized: (opts: { message: string }) => {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: opts.message });
  },
  forbidden: (opts: { message: string }) => {
    throw new TRPCError({ code: 'FORBIDDEN', message: opts.message });
  },
  notFound: (opts: { message: string }) => {
    throw new TRPCError({ code: 'NOT_FOUND', message: opts.message });
  },
}));

/**
 * Import mocked modules after vi.mock() calls
 */
const { db, eq } = await import('@platform/db');
const { ApiKeyService } = await import('@platform/auth');

import { createMockContext, createMockDb } from './utils/context';
import { mockUUIDs } from './utils/fixtures';

/**
 * Test data fixtures
 */
const mockTenantId = mockUUIDs.tenant.default;
const mockUserId = mockUUIDs.user.default;
const mockKeyId = mockUUIDs.apiKey?.default || '550e8400-e29b-41d4-a716-446655440000';

const mockApiKey = {
  id: mockKeyId,
  tenantId: mockTenantId,
  name: 'Production Widget',
  keyType: 'publishable' as const,
  keyHash: 'hashed_key_value',
  prefix: 'pk_live_test',
  permissions: {
    scopes: ['read', 'write'],
    ipWhitelist: ['192.168.1.0/24'],
  },
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
  revokedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastUsedAt: null,
};

/**
 * Helper to create tRPC caller with proper session structure
 */
const createCaller = (role: 'member' | 'admin' | 'owner' = 'member', hasTenant = true) => {
  const t = initTRPC.context<Context>().create();
  const tenantId = hasTenant ? mockTenantId : undefined;

  // Create context with proper session.user structure per Context type
  const ctx: Context = {
    session: {
      user: {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        tenantId,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    tenantId: tenantId || '',
    userId: mockUserId,
    role,
    db: db as any,
  };

  const caller = t.router(apiKeysRouter).createCaller(ctx);

  return { caller, ctx };
};

/**
 * Test Suite: API Keys Router
 */
describe('API Keys Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore ApiKeyService mock implementations after clearAllMocks
    vi.mocked(ApiKeyService.generateApiKey).mockImplementation((type: string) => ({
      apiKey: type === 'publishable' ? 'pk_live_test123456789' : 'sk_live_test123456789',
      keyHash: 'hashed_key_value',
      keyPrefix: type === 'publishable' ? 'pk_live_test' : 'sk_live_test',
    }));
    vi.mocked(ApiKeyService.isValidFormat).mockImplementation(
      (key: string) => key.startsWith('pk_') || key.startsWith('sk_')
    );
    vi.mocked(ApiKeyService.hashApiKey).mockImplementation((key: string) => `hash_${key}`);
  });

  /**
   * API Key Creation Tests
   */
  describe('create', () => {
    it('should create publishable API key with scoped permissions', async () => {
      const { caller } = createCaller('admin');

      // Mock database insert
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await caller.create({
        name: 'Production Widget',
        type: 'publishable',
        permissions: ['read', 'write'],
        ipWhitelist: ['192.168.1.0/24'],
        expiresInDays: 90,
      });

      expect(result).toMatchObject({
        apiKey: 'pk_live_test123456789',
        keyPrefix: 'pk_live_test',
        name: 'Production Widget',
        type: 'publishable',
        permissions: ['read', 'write'],
        warning: 'Save this key immediately. It will not be shown again.',
      });

      expect(ApiKeyService.generateApiKey).toHaveBeenCalledWith('publishable');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create secret API key with admin permissions', async () => {
      const { caller } = createCaller('admin');

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await caller.create({
        name: 'Server-Side Key',
        type: 'secret',
        permissions: ['read', 'write', 'admin'],
        expiresInDays: 30,
      });

      expect(result).toMatchObject({
        apiKey: 'sk_live_test123456789',
        keyPrefix: 'sk_live_test',
        type: 'secret',
        permissions: ['read', 'write', 'admin'],
      });

      expect(ApiKeyService.generateApiKey).toHaveBeenCalledWith('secret');
    });

    it('should reject permission hierarchy violation - write without read', async () => {
      const { caller } = createCaller('admin');

      await expect(
        caller.create({
          name: 'Invalid Key',
          type: 'publishable',
          permissions: ['write'] as any, // Missing 'read'
          expiresInDays: 90,
        })
      ).rejects.toThrow();
    });

    it('should reject permission hierarchy violation - admin without write/read', async () => {
      const { caller } = createCaller('admin');

      await expect(
        caller.create({
          name: 'Invalid Key',
          type: 'publishable',
          permissions: ['admin'] as any, // Missing 'write' and 'read'
          expiresInDays: 90,
        })
      ).rejects.toThrow();
    });

    it('should reject creation when user has no tenant', async () => {
      const { caller } = createCaller('admin', false);

      await expect(
        caller.create({
          name: 'Test Key',
          type: 'publishable',
          permissions: ['read'],
          expiresInDays: 90,
        })
      ).rejects.toThrow('Authentication required - please sign in');
    });

    it('should enforce expiration limits (1-365 days)', async () => {
      const { caller } = createCaller('admin');

      await expect(
        caller.create({
          name: 'Test Key',
          type: 'publishable',
          permissions: ['read'],
          expiresInDays: 0,
        })
      ).rejects.toThrow();

      await expect(
        caller.create({
          name: 'Test Key',
          type: 'publishable',
          permissions: ['read'],
          expiresInDays: 366,
        })
      ).rejects.toThrow();
    });
  });

  /**
   * API Key Listing Tests
   */
  describe('list', () => {
    it('should list all API keys for tenant', async () => {
      const { caller } = createCaller('member');

      // Mock database select
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockApiKey]),
          }),
        }),
      } as any);

      const result = await caller.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockKeyId,
        name: 'Production Widget',
        keyPrefix: 'pk_live_test',
        type: 'publishable',
        permissions: ['read', 'write'],
        ipWhitelist: ['192.168.1.0/24'],
        isActive: true,
      });

      expect(db.select).toHaveBeenCalled();
    });

    it('should mark expired keys as inactive', async () => {
      const { caller } = createCaller('member');

      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([expiredKey]),
          }),
        }),
      } as any);

      const result = await caller.list();

      expect(result[0].isActive).toBe(false);
    });

    it('should mark revoked keys as inactive', async () => {
      const { caller } = createCaller('member');

      const revokedKey = {
        ...mockApiKey,
        revokedAt: new Date(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([revokedKey]),
          }),
        }),
      } as any);

      const result = await caller.list();

      expect(result[0].isActive).toBe(false);
    });

    it('should reject listing when user has no tenant', async () => {
      const { caller } = createCaller('member', false);

      await expect(caller.list()).rejects.toThrow('Authentication required - please sign in');
    });
  });

  /**
   * API Key Revocation Tests
   */
  describe('revoke', () => {
    it('should revoke API key successfully', async () => {
      const { caller } = createCaller('admin');

      // Mock key lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockApiKey]),
          }),
        }),
      } as any);

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await caller.revoke({ keyId: mockKeyId });

      expect(result).toMatchObject({
        success: true,
        message: 'API key revoked successfully',
      });

      expect(db.update).toHaveBeenCalled();
    });

    it('should reject revoking non-existent key', async () => {
      const { caller } = createCaller('admin');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(caller.revoke({ keyId: mockKeyId })).rejects.toThrow('API key not found');
    });

    it('should reject revoking key from different tenant', async () => {
      const { caller } = createCaller('admin');

      const differentTenantKey = {
        ...mockApiKey,
        tenantId: 'different-tenant-id',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([differentTenantKey]),
          }),
        }),
      } as any);

      await expect(caller.revoke({ keyId: mockKeyId })).rejects.toThrow(
        'You do not have permission to revoke this API key'
      );
    });

    it('should reject revoking already revoked key', async () => {
      const { caller } = createCaller('admin');

      const revokedKey = {
        ...mockApiKey,
        revokedAt: new Date(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([revokedKey]),
          }),
        }),
      } as any);

      await expect(caller.revoke({ keyId: mockKeyId })).rejects.toThrow(
        'API key is already revoked'
      );
    });
  });

  /**
   * API Key Validation Tests
   */
  describe('validate', () => {
    it('should validate active API key successfully', async () => {
      const { caller } = createCaller('member');

      // Mock validation
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockApiKey]),
          }),
        }),
      } as any);

      // Mock last used update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await caller.validate({ apiKey: 'pk_live_test123456789' });

      expect(result).toMatchObject({
        valid: true,
        tenantId: mockTenantId,
        permissions: ['read', 'write'],
        type: 'publishable',
        ipWhitelist: ['192.168.1.0/24'],
      });

      expect(ApiKeyService.isValidFormat).toHaveBeenCalledWith('pk_live_test123456789');
      expect(ApiKeyService.hashApiKey).toHaveBeenCalledWith('pk_live_test123456789');
      expect(db.update).toHaveBeenCalled(); // lastUsedAt updated
    });

    it('should reject invalid API key format', async () => {
      const { caller } = createCaller('member');

      vi.mocked(ApiKeyService.isValidFormat).mockReturnValueOnce(false);

      const result = await caller.validate({ apiKey: 'invalid_key' });

      expect(result).toMatchObject({
        valid: false,
        reason: 'Invalid API key format',
      });
    });

    it('should reject non-existent API key', async () => {
      const { caller } = createCaller('member');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await caller.validate({ apiKey: 'pk_live_nonexistent' });

      expect(result).toMatchObject({
        valid: false,
        reason: 'API key not found',
      });
    });

    it('should reject revoked API key', async () => {
      const { caller } = createCaller('member');

      const revokedKey = {
        ...mockApiKey,
        revokedAt: new Date(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([revokedKey]),
          }),
        }),
      } as any);

      const result = await caller.validate({ apiKey: 'pk_live_test123456789' });

      expect(result).toMatchObject({
        valid: false,
        reason: 'API key has been revoked',
      });
    });

    it('should reject expired API key', async () => {
      const { caller } = createCaller('member');

      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([expiredKey]),
          }),
        }),
      } as any);

      const result = await caller.validate({ apiKey: 'pk_live_test123456789' });

      expect(result).toMatchObject({
        valid: false,
        reason: 'API key has expired',
      });
    });
  });
});
