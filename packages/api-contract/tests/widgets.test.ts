/**
 * Widgets Router Test Suite (Phase 3 - Week 2.3)
 *
 * Comprehensive tests for widget configuration management with RLS enforcement.
 *
 * Test Coverage:
 * - Widget Management (list, get, create, update, delete)
 * - Settings Validation (theme, position, colors, greeting)
 * - Domain Whitelist Validation (URL validation, CORS)
 * - Role-Based Access Control (admin/owner restrictions)
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../src/context';
import { widgetsRouter } from '../src/routers/widgets';

/**
 * Mock external dependencies
 */
vi.mock('@platform/db', () => ({
  serviceDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  widgets: {},
  schema: {
    widgets: {},
  },
  and: vi.fn(),
  eq: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  // Error handlers used by widgets router
  internalError: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: opts.message || 'Internal server error',
      cause: opts.cause,
    });
    return error;
  }),
  notFound: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'NOT_FOUND',
      message: opts.message || 'Not found',
    });
    return error;
  }),
  badRequest: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'BAD_REQUEST',
      message: opts.message || 'Bad request',
    });
    return error;
  }),
  forbidden: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'FORBIDDEN',
      message: opts.message || 'Forbidden',
    });
    return error;
  }),
}));

/**
 * Import mocked modules after vi.mock() calls
 */
const { serviceDb, eq, count } = await import('@platform/db');

import { createMockContext, createMockDb } from './utils/context';
/**
 * Import test utilities
 */
import { mockWidget as createMockWidget, mockUUIDs } from './utils/fixtures';

/**
 * Test data fixtures
 */
const mockTenantId = mockUUIDs.tenant.default;
const mockUserId = mockUUIDs.user.default;
const mockWidgetId = mockUUIDs.widget.default;

const mockWidget = createMockWidget({
  id: mockWidgetId,
  tenantId: mockTenantId,
  name: 'Test Widget',
  domainWhitelist: ['https://example.com', 'https://app.example.com'],
  settings: {
    theme: 'light' as const,
    position: 'bottom-right' as const,
    greeting: 'Hello! How can I help you?',
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
  },
});

/**
 * Helper to create tRPC caller with role
 */
const createCaller = (role: 'member' | 'admin' | 'owner' = 'member') => {
  const t = initTRPC.context<Context>().create();
  const mockDb = createMockDb();
  const ctx = createMockContext({ role, userId: mockUserId, tenantId: mockTenantId, db: mockDb });

  const caller = t.router(widgetsRouter).createCaller(ctx);

  return { caller, mockDb, ctx };
};

/**
 * Test Suite: Widgets Router
 */
describe('Widgets Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Widget Management Tests
   */
  describe('Widget Management', () => {
    /**
     * list - List Widgets with Filters
     */
    describe('list - List Widgets with Filters', () => {
      it('should list widgets with default pagination (limit 50)', async () => {
        const { caller, mockDb } = createCaller('member');

        const mockWidgets = [mockWidget];

        // Mock select().from().limit().offset() chain
        const mockQuery = {
          $dynamic: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue(mockWidgets),
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        // Mock count query
        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 1 }]),
        });

        const result = await caller.list({});

        expect(result).toEqual({
          widgets: [
            {
              id: mockWidget.id,
              name: mockWidget.name,
              domainWhitelist: mockWidget.domainWhitelist,
              settings: mockWidget.settings,
              isActive: mockWidget.isActive,
              createdAt: mockWidget.createdAt,
              updatedAt: mockWidget.updatedAt,
            },
          ],
          total: 1,
          hasMore: false,
        });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should apply pagination correctly', async () => {
        const { caller, mockDb } = createCaller('member');

        const mockWidgets = Array.from({ length: 10 }, (_, i) => ({
          ...mockWidget,
          id: `widget_${i}`,
          name: `Widget ${i}`,
        }));

        const mockQuery = {
          $dynamic: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue(mockWidgets),
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 50 }]),
        });

        const result = await caller.list({ limit: 10, offset: 0 });

        expect(result.widgets.length).toBe(10);
        expect(result.total).toBe(50);
        expect(result.hasMore).toBe(true);
      });

      it('should filter by isActive', async () => {
        const { caller, mockDb } = createCaller('member');

        const mockActiveWidgets = [{ ...mockWidget, isActive: true }];

        const mockQuery = {
          $dynamic: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue(mockActiveWidgets),
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 1 }]),
        });

        const result = await caller.list({ isActive: true });

        expect(result.widgets.length).toBe(1);
        expect(result.widgets[0].isActive).toBe(true);
        expect(mockQuery.where).toHaveBeenCalled();
      });

      it('should handle empty results', async () => {
        const { caller, mockDb } = createCaller('member');

        const mockQuery = {
          $dynamic: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 0 }]),
        });

        const result = await caller.list({});

        expect(result.widgets).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.hasMore).toBe(false);
      });

      it('should validate limit bounds (min 1, max 100)', async () => {
        const { caller } = createCaller('member');

        await expect(caller.list({ limit: 0 })).rejects.toThrow();
        await expect(caller.list({ limit: 101 })).rejects.toThrow();
      });

      it('should validate offset is non-negative', async () => {
        const { caller } = createCaller('member');

        await expect(caller.list({ offset: -1 })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('member');

        const mockQuery = {
          $dynamic: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue(mockQuery),
        });

        await expect(caller.list({})).rejects.toThrow('Failed to retrieve widgets');
      });
    });

    /**
     * get - Get Widget by ID
     */
    describe('get - Get Widget by ID', () => {
      it('should return widget by ID', async () => {
        const { caller, mockDb } = createCaller('member');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        const result = await caller.get({ id: mockWidgetId });

        expect(result).toEqual({
          id: mockWidget.id,
          name: mockWidget.name,
          domainWhitelist: mockWidget.domainWhitelist,
          settings: mockWidget.settings,
          isActive: mockWidget.isActive,
          createdAt: mockWidget.createdAt,
          updatedAt: mockWidget.updatedAt,
        });
      });

      it('should throw NOT_FOUND if widget does not exist', async () => {
        const { caller, mockDb } = createCaller('member');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        await expect(caller.get({ id: mockWidgetId })).rejects.toThrow(
          'Widget not found or access denied'
        );
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller('member');

        await expect(caller.get({ id: 'invalid_id' })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('member');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(caller.get({ id: mockWidgetId })).rejects.toThrow('Failed to retrieve widget');
      });
    });

    /**
     * create - Create Widget (Admin+)
     */
    describe('create - Create Widget (Admin+)', () => {
      it('should create widget successfully', async () => {
        const { caller, mockDb } = createCaller('admin');

        const newWidget = {
          name: 'New Widget',
          domainWhitelist: ['https://newsite.com'],
        };

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockWidget, ...newWidget }]),
          }),
        });

        const result = await caller.create(newWidget);

        expect(result).toMatchObject({
          name: newWidget.name,
          domainWhitelist: newWidget.domainWhitelist,
        });

        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should create widget with custom settings', async () => {
        const { caller, mockDb } = createCaller('admin');

        const newWidget = {
          name: 'Custom Widget',
          domainWhitelist: ['https://custom.com'],
          settings: {
            theme: 'dark' as const,
            position: 'bottom-left' as const,
            greeting: 'Hi there!',
            primaryColor: '#ff5722',
            secondaryColor: '#03a9f4',
          },
        };

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockWidget, ...newWidget }]),
          }),
        });

        const result = await caller.create(newWidget);

        expect(result.settings).toEqual(newWidget.settings);
      });

      it('should validate name required', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: '',
            domainWhitelist: ['https://example.com'],
          })
        ).rejects.toThrow();
      });

      it('should validate name length (max 100)', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: 'a'.repeat(101),
            domainWhitelist: ['https://example.com'],
          })
        ).rejects.toThrow();
      });

      it('should validate domain whitelist required', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: [],
          })
        ).rejects.toThrow();
      });

      it('should validate domain URLs', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['not-a-url'],
          })
        ).rejects.toThrow();

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['ftp://invalid.com'], // Invalid protocol
          })
        ).rejects.toThrow();
      });

      it('should validate hex color format', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['https://example.com'],
            settings: {
              primaryColor: 'red', // Invalid format
            },
          })
        ).rejects.toThrow();

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['https://example.com'],
            settings: {
              primaryColor: '#gggggg', // Invalid hex
            },
          })
        ).rejects.toThrow();
      });

      it('should validate greeting length (max 200)', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['https://example.com'],
            settings: {
              greeting: 'a'.repeat(201),
            },
          })
        ).rejects.toThrow();
      });

      it('should handle creation failure', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        });

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['https://example.com'],
          })
        ).rejects.toThrow('Failed to create widget');
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        });

        await expect(
          caller.create({
            name: 'Test',
            domainWhitelist: ['https://example.com'],
          })
        ).rejects.toThrow('Failed to create widget');
      });
    });

    /**
     * update - Update Widget (Admin+)
     */
    describe('update - Update Widget (Admin+)', () => {
      it('should update widget name', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        const updatedWidget = { ...mockWidget, name: 'Updated Widget' };

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedWidget]),
            }),
          }),
        });

        const result = await caller.update({
          id: mockWidgetId,
          name: 'Updated Widget',
        });

        expect(result.name).toBe('Updated Widget');
      });

      it('should update widget domain whitelist', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        const updatedDomains = ['https://new1.com', 'https://new2.com'];
        const updatedWidget = { ...mockWidget, domainWhitelist: updatedDomains };

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedWidget]),
            }),
          }),
        });

        const result = await caller.update({
          id: mockWidgetId,
          domainWhitelist: updatedDomains,
        });

        expect(result.domainWhitelist).toEqual(updatedDomains);
      });

      it('should update widget settings', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        const updatedSettings = {
          theme: 'dark' as const,
          position: 'bottom-left' as const,
        };
        const updatedWidget = { ...mockWidget, settings: updatedSettings };

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedWidget]),
            }),
          }),
        });

        const result = await caller.update({
          id: mockWidgetId,
          settings: updatedSettings,
        });

        expect(result.settings).toEqual(updatedSettings);
      });

      it('should update widget active status', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        const updatedWidget = { ...mockWidget, isActive: false };

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedWidget]),
            }),
          }),
        });

        const result = await caller.update({
          id: mockWidgetId,
          isActive: false,
        });

        expect(result.isActive).toBe(false);
      });

      it('should throw NOT_FOUND if widget does not exist', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        await expect(
          caller.update({
            id: mockWidgetId,
            name: 'Updated',
          })
        ).rejects.toThrow('Widget not found or access denied');
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.update({
            id: 'invalid_id',
            name: 'Updated',
          })
        ).rejects.toThrow();
      });

      it('should handle update failure', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockWidget]),
            }),
          }),
        });

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        await expect(
          caller.update({
            id: mockWidgetId,
            name: 'Updated',
          })
        ).rejects.toThrow('Failed to update widget');
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('admin');

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(
          caller.update({
            id: mockWidgetId,
            name: 'Updated',
          })
        ).rejects.toThrow('Failed to update widget');
      });
    });

    /**
     * delete - Delete Widget (Owner Only)
     */
    describe('delete - Delete Widget (Owner Only)', () => {
      it('should delete widget successfully', async () => {
        const { caller, mockDb } = createCaller('owner');

        mockDb.delete.mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockWidgetId }]),
          }),
        });

        const result = await caller.delete({ id: mockWidgetId });

        expect(result).toEqual({
          id: mockWidgetId,
          deleted: true,
        });

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should throw NOT_FOUND if widget does not exist', async () => {
        const { caller, mockDb } = createCaller('owner');

        mockDb.delete.mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        });

        await expect(caller.delete({ id: mockWidgetId })).rejects.toThrow(
          'Widget not found or access denied'
        );
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller('owner');

        await expect(caller.delete({ id: 'invalid_id' })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('owner');

        mockDb.delete.mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        });

        await expect(caller.delete({ id: mockWidgetId })).rejects.toThrow(
          'Failed to delete widget'
        );
      });
    });
  });

  /**
   * Role-Based Access Control (RBAC) Tests
   */
  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow member to list and get widgets', async () => {
      const { caller, mockDb } = createCaller('member');

      // List test
      const mockQuery = {
        $dynamic: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockWidget]),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue(mockQuery),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 1 }]),
      });

      const listResult = await caller.list({});
      expect(listResult.widgets.length).toBe(1);

      // Get test
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockWidget]),
          }),
        }),
      });

      const getResult = await caller.get({ id: mockWidgetId });
      expect(getResult.id).toBe(mockWidgetId);
    });

    it('should allow admin to create and update widgets', async () => {
      const { caller, mockDb } = createCaller('admin');

      // Create test
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWidget]),
        }),
      });

      const createResult = await caller.create({
        name: 'Test Widget',
        domainWhitelist: ['https://example.com'],
      });
      expect(createResult).toBeDefined();

      // Update test
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockWidget]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockWidget]),
          }),
        }),
      });

      const updateResult = await caller.update({
        id: mockWidgetId,
        name: 'Updated Widget',
      });
      expect(updateResult).toBeDefined();
    });

    it('should allow owner to delete widgets', async () => {
      const { caller, mockDb } = createCaller('owner');

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockWidgetId }]),
        }),
      });

      const result = await caller.delete({ id: mockWidgetId });
      expect(result.deleted).toBe(true);
    });
  });
});
