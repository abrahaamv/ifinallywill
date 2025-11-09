/**
 * LiveKit Router Test Suite (Phase 5 - Week 2)
 *
 * Comprehensive tests for LiveKit room management and access token generation.
 *
 * Test Coverage:
 * - Room Creation (createRoom)
 * - Access Token Generation (joinRoom)
 * - Room Listing with Tenant Isolation (listRooms)
 * - Room Deletion (deleteRoom)
 * - Environment Configuration Validation
 * - Error Handling (BigInt serialization, network failures)
 *
 * Router: livekit.ts (199 lines)
 * Endpoints: 4 (createRoom, joinRoom, listRooms, deleteRoom)
 *
 * NOTE: Environment variables (LIVEKIT_*) are configured in tests/setup-env.ts
 * which runs before any test files are loaded.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock LiveKit SDK - Use vi.hoisted() to ensure mocks are available before module loads
 */
const { mockAccessToken, mockRoomServiceClient } = vi.hoisted(() => {
  const mockAccessToken = {
    toJwt: vi.fn(async () => 'mock_jwt_token'),
    addGrant: vi.fn(),
  };

  const mockRoomServiceClient = {
    createRoom: vi.fn(),
    listRooms: vi.fn(),
    deleteRoom: vi.fn(),
  };

  return { mockAccessToken, mockRoomServiceClient };
});

vi.mock('livekit-server-sdk', () => ({
  AccessToken: vi.fn(() => mockAccessToken),
  RoomServiceClient: vi.fn(() => mockRoomServiceClient),
}));

import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from '../src/context';
import { livekitRouter } from '../src/routers/livekit';

/**
 * Mock @platform/shared
 */
vi.mock('@platform/shared', () => ({
  internalError: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: opts.message || 'Internal server error',
      cause: opts.cause,
    });
    return error;
  }),
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

/**
 * Test data fixtures
 */
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

/**
 * Mock database with transaction support
 */
const createMockDb = () => {
  const mockMethods = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...mockMethods,
    transaction: vi.fn(async (callback) => {
      const tx = {
        ...mockMethods,
      };
      return await callback(tx);
    }),
  };
};

/**
 * Helper to create test context and router caller
 */
const createCaller = (isAuthenticated = true) => {
  const t = initTRPC.context<Context>().create();
  const mockDb = createMockDb();

  const ctx: Context = isAuthenticated
    ? {
        session: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User',
            tenantId: mockTenantId,
            role: 'member',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        tenantId: mockTenantId,
        userId: mockUserId,
        role: 'member',
        db: mockDb as any,
      }
    : {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: mockDb as any,
      };

  const caller = t.router(livekitRouter).createCaller(ctx);
  return { caller, ctx };
};

/**
 * Helper to create context for unconfigured tests
 */
const createUnconfiguredContext = (isAuthenticated = true): Context => {
  const mockDb = createMockDb();

  return isAuthenticated
    ? {
        session: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User',
            tenantId: mockTenantId,
            role: 'member',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        tenantId: mockTenantId,
        userId: mockUserId,
        role: 'member',
        db: mockDb as any,
      }
    : {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: mockDb as any,
      };
};

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  vi.clearAllMocks();

  // Restore mock implementations after clearAllMocks
  vi.mocked(mockAccessToken.toJwt).mockResolvedValue('mock_jwt_token');
  vi.mocked(mockAccessToken.addGrant).mockImplementation(() => {});
});

describe('LiveKit Router', () => {
  /**
   * Create Room Tests
   */
  describe('createRoom', () => {
    it('should create room with tenant isolation', async () => {
      const { caller } = createCaller(true);

      const mockRoom = {
        name: `tenant_${mockTenantId}_meeting-room`,
        sid: 'RM_test123',
        creationTime: BigInt(Date.now()),
      };

      vi.mocked(mockRoomServiceClient.createRoom).mockResolvedValue(mockRoom);

      const result = await caller.createRoom({
        roomName: 'meeting-room',
        metadata: { purpose: 'team-standup' },
      });

      expect(mockRoomServiceClient.createRoom).toHaveBeenCalledWith({
        name: `tenant_${mockTenantId}_meeting-room`,
        emptyTimeout: 300,
        maxParticipants: 10,
        metadata: JSON.stringify({
          tenantId: mockTenantId,
          purpose: 'team-standup',
        }),
      });

      expect(result).toEqual({
        roomName: mockRoom.name,
        roomSid: mockRoom.sid,
        createdAt: Number(mockRoom.creationTime),
      });
    });

    it('should handle BigInt serialization correctly', async () => {
      const { caller } = createCaller(true);

      const creationTime = BigInt('1234567890123');
      const mockRoom = {
        name: `tenant_${mockTenantId}_test-room`,
        sid: 'RM_bigint_test',
        creationTime,
      };

      vi.mocked(mockRoomServiceClient.createRoom).mockResolvedValue(mockRoom);

      const result = await caller.createRoom({
        roomName: 'test-room',
      });

      // Verify BigInt was converted to number
      expect(result.createdAt).toBe(Number(creationTime));
      expect(typeof result.createdAt).toBe('number');
    });

    it('should reject when LiveKit is not configured', async () => {
      delete process.env.LIVEKIT_URL;
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      // Force module reload to apply env changes
      vi.resetModules();
      const { livekitRouter: unconfiguredRouter } = await import('../src/routers/livekit');
      const t = initTRPC.context<Context>().create();
      const ctx = createUnconfiguredContext(true);
      const caller = t.router(unconfiguredRouter).createCaller(ctx);

      await expect(
        caller.createRoom({
          roomName: 'test-room',
        })
      ).rejects.toThrow();
    });

    it('should handle room creation failures', async () => {
      const { caller } = createCaller(true);

      vi.mocked(mockRoomServiceClient.createRoom).mockRejectedValue(new Error('Network timeout'));

      await expect(
        caller.createRoom({
          roomName: 'failing-room',
        })
      ).rejects.toThrow('Failed to create room');
    });

    it('should validate room name length', async () => {
      const { caller } = createCaller(true);

      // Test empty name
      await expect(
        caller.createRoom({
          roomName: '',
        })
      ).rejects.toThrow();

      // Test name too long (>100 chars)
      await expect(
        caller.createRoom({
          roomName: 'a'.repeat(101),
        })
      ).rejects.toThrow();
    });
  });

  /**
   * Join Room Tests (Public Procedure - No Authentication)
   */
  describe('joinRoom', () => {
    it('should generate access token for anonymous participant', async () => {
      // Use unauthenticated caller (public procedure)
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: createMockDb() as any,
      };
      const caller = t.router(livekitRouter).createCaller(ctx);

      const result = await caller.joinRoom({
        roomName: `tenant_${mockTenantId}_public-room`,
        participantName: 'Anonymous User',
      });

      // Verify AccessToken was created with correct parameters
      expect(mockAccessToken.addGrant).toHaveBeenCalledWith({
        room: `tenant_${mockTenantId}_public-room`,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      expect(result).toEqual({
        token: 'mock_jwt_token',
        roomName: `tenant_${mockTenantId}_public-room`,
        livekitUrl: 'wss://test.livekit.cloud',
      });
    });

    it('should accept room names with tenant prefix', async () => {
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: createMockDb() as any,
      };
      const caller = t.router(livekitRouter).createCaller(ctx);

      const fullRoomName = `tenant_${mockTenantId}_meeting-123`;

      const result = await caller.joinRoom({
        roomName: fullRoomName,
        participantName: 'Guest User',
      });

      // Verify room name was used as-is (not prefixed again)
      expect(mockAccessToken.addGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          room: fullRoomName,
        })
      );

      expect(result.roomName).toBe(fullRoomName);
    });

    it('should reject when LiveKit API credentials missing', async () => {
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      // Force module reload
      vi.resetModules();
      const { livekitRouter: unconfiguredRouter } = await import('../src/routers/livekit');
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: createMockDb() as any,
      };
      const caller = t.router(unconfiguredRouter).createCaller(ctx);

      await expect(
        caller.joinRoom({
          roomName: 'test-room',
          participantName: 'Test User',
        })
      ).rejects.toThrow();
    });

    it('should handle token generation failures', async () => {
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: createMockDb() as any,
      };
      const caller = t.router(livekitRouter).createCaller(ctx);

      vi.mocked(mockAccessToken.toJwt).mockRejectedValue(new Error('JWT signing failed'));

      await expect(
        caller.joinRoom({
          roomName: 'test-room',
          participantName: 'Test User',
        })
      ).rejects.toThrow('Failed to join room');
    });

    it('should validate participant name', async () => {
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db: createMockDb() as any,
      };
      const caller = t.router(livekitRouter).createCaller(ctx);

      // Test empty participant name
      await expect(
        caller.joinRoom({
          roomName: 'test-room',
          participantName: '',
        })
      ).rejects.toThrow();

      // Test name too long (>100 chars)
      await expect(
        caller.joinRoom({
          roomName: 'test-room',
          participantName: 'a'.repeat(101),
        })
      ).rejects.toThrow();
    });
  });

  /**
   * List Rooms Tests
   */
  describe('listRooms', () => {
    it('should list only tenant-specific rooms', async () => {
      const { caller } = createCaller(true);

      const mockRooms = [
        {
          name: `tenant_${mockTenantId}_room1`,
          sid: 'RM_1',
          numParticipants: 2,
          creationTime: BigInt(Date.now()),
          metadata: JSON.stringify({ purpose: 'meeting' }),
        },
        {
          name: 'tenant_other-tenant_room2', // Different tenant
          sid: 'RM_2',
          numParticipants: 1,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
        {
          name: `tenant_${mockTenantId}_room3`,
          sid: 'RM_3',
          numParticipants: 5,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
      ];

      vi.mocked(mockRoomServiceClient.listRooms).mockResolvedValue(mockRooms);

      const result = await caller.listRooms();

      // Should only include rooms for current tenant
      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].roomName).toBe('room1'); // Prefix removed
      expect(result.rooms[0].fullRoomName).toBe(`tenant_${mockTenantId}_room1`); // Full name preserved
      expect(result.rooms[1].roomName).toBe('room3');

      // Verify BigInt conversion
      expect(typeof result.rooms[0].createdAt).toBe('number');
    });

    it('should parse room metadata correctly', async () => {
      const { caller } = createCaller(true);

      const mockMetadata = { purpose: 'standup', team: 'engineering' };
      const mockRooms = [
        {
          name: `tenant_${mockTenantId}_team-room`,
          sid: 'RM_meta',
          numParticipants: 3,
          creationTime: BigInt(Date.now()),
          metadata: JSON.stringify(mockMetadata),
        },
      ];

      vi.mocked(mockRoomServiceClient.listRooms).mockResolvedValue(mockRooms);

      const result = await caller.listRooms();

      expect(result.rooms[0].metadata).toEqual(mockMetadata);
    });

    it('should handle empty room list', async () => {
      const { caller } = createCaller(true);

      vi.mocked(mockRoomServiceClient.listRooms).mockResolvedValue([]);

      const result = await caller.listRooms();

      expect(result.rooms).toEqual([]);
    });

    it('should reject when LiveKit is not configured', async () => {
      delete process.env.LIVEKIT_URL;
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      // Force module reload
      vi.resetModules();
      const { livekitRouter: unconfiguredRouter } = await import('../src/routers/livekit');
      const { caller } = createCaller(true);
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User',
            tenantId: mockTenantId,
            role: 'member',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        tenantId: mockTenantId,
        userId: mockUserId,
        role: 'member',
        db: createMockDb() as any,
      };
      const unconfiguredCaller = t.router(unconfiguredRouter).createCaller(ctx);

      await expect(unconfiguredCaller.listRooms()).rejects.toThrow();
    });

    it('should handle listRooms API failures', async () => {
      const { caller } = createCaller(true);

      vi.mocked(mockRoomServiceClient.listRooms).mockRejectedValue(new Error('API request failed'));

      await expect(caller.listRooms()).rejects.toThrow('Failed to list rooms');
    });
  });

  /**
   * Delete Room Tests
   */
  describe('deleteRoom', () => {
    it('should delete room with tenant prefix', async () => {
      const { caller } = createCaller(true);

      vi.mocked(mockRoomServiceClient.deleteRoom).mockResolvedValue(undefined);

      const result = await caller.deleteRoom({
        roomName: 'room-to-delete',
      });

      expect(mockRoomServiceClient.deleteRoom).toHaveBeenCalledWith(
        `tenant_${mockTenantId}_room-to-delete`
      );

      expect(result).toEqual({ success: true });
    });

    it('should reject when LiveKit is not configured', async () => {
      delete process.env.LIVEKIT_URL;
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      // Force module reload
      vi.resetModules();
      const { livekitRouter: unconfiguredRouter } = await import('../src/routers/livekit');
      const t = initTRPC.context<Context>().create();
      const ctx: Context = {
        session: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User',
            tenantId: mockTenantId,
            role: 'member',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        tenantId: mockTenantId,
        userId: mockUserId,
        role: 'member',
        db: createMockDb() as any,
      };
      const unconfiguredCaller = t.router(unconfiguredRouter).createCaller(ctx);

      await expect(
        unconfiguredCaller.deleteRoom({
          roomName: 'test-room',
        })
      ).rejects.toThrow();
    });

    it('should handle deletion failures', async () => {
      const { caller } = createCaller(true);

      vi.mocked(mockRoomServiceClient.deleteRoom).mockRejectedValue(new Error('Room not found'));

      await expect(
        caller.deleteRoom({
          roomName: 'nonexistent-room',
        })
      ).rejects.toThrow('Failed to delete room');
    });

    it('should validate room name', async () => {
      const { caller } = createCaller(true);

      // Test empty room name
      await expect(
        caller.deleteRoom({
          roomName: '',
        })
      ).rejects.toThrow();
    });
  });
});
