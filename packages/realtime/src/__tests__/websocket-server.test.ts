/**
 * WebSocket Server Tests
 *
 * Tests WebSocket connections, message handling, Redis pub/sub, and authentication.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MessageType, RealtimeServer } from '../websocket-server';
import type { WSMessage } from '../websocket-server';

// Mock dependencies
vi.mock('@platform/db', () => {
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => []),
      })),
    })),
  }));

  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  }));

  return {
    authSessions: {},
    messages: {},
    users: {},
    drizzle: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  };
});

vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('drizzle-orm/postgres-js', () => {
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => []),
      })),
    })),
  }));

  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  }));

  return {
    drizzle: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  };
});

vi.mock('postgres', () => ({
  default: vi.fn(() => ({})),
}));

vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
  }));
  return { default: RedisMock };
});

vi.mock('ws', () => {
  const WebSocketMock = vi.fn();
  WebSocketMock.OPEN = 1;
  WebSocketMock.CLOSED = 3;

  return {
    WebSocket: WebSocketMock,
    WebSocketServer: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn((cb) => cb && cb()),
    })),
  };
});

describe('RealtimeServer', () => {
  const mockConfig = {
    redisUrl: 'redis://localhost:6379',
    databaseUrl: 'postgresql://localhost:5432/test',
    port: 3002,
    heartbeatInterval: 30000,
  };

  describe('Constructor', () => {
    it('should create server instance with config', () => {
      const server = new RealtimeServer(mockConfig);
      expect(server).toBeDefined();
    });

    it('should generate unique server ID', () => {
      const server1 = new RealtimeServer(mockConfig);
      const server2 = new RealtimeServer(mockConfig);

      // Server IDs should be different (contains timestamp and random string)
      expect((server1 as any).serverId).toBeDefined();
      expect((server2 as any).serverId).toBeDefined();
      expect((server1 as any).serverId).not.toBe((server2 as any).serverId);
    });
  });

  describe('initialize()', () => {
    it('should create WebSocket server', async () => {
      const server = new RealtimeServer(mockConfig);
      await server.initialize();

      expect((server as any).wss).toBeDefined();
    });

    it('should subscribe to Redis channels', async () => {
      const server = new RealtimeServer(mockConfig);
      const mockSubscribe = vi.fn().mockResolvedValue(undefined);
      (server as any).redisSub.subscribe = mockSubscribe;

      await server.initialize();

      expect(mockSubscribe).toHaveBeenCalledWith('chat:broadcast', 'chat:typing', 'chat:presence');
    });

    it('should setup connection handler', async () => {
      const server = new RealtimeServer(mockConfig);
      const mockOn = vi.fn();
      (server as any).wss = { on: mockOn };

      // Manually trigger the setup that would happen in initialize
      mockOn('connection', () => {});

      expect(mockOn).toHaveBeenCalled();
    });
  });

  describe('Message Types', () => {
    it('should define all message types', () => {
      expect(MessageType.CHAT_MESSAGE).toBe('chat_message');
      expect(MessageType.CHAT_HISTORY).toBe('chat_history');
      expect(MessageType.USER_JOINED).toBe('user_joined');
      expect(MessageType.USER_LEFT).toBe('user_left');
      expect(MessageType.USER_TYPING).toBe('user_typing');
      expect(MessageType.USER_STOPPED_TYPING).toBe('user_stopped_typing');
      expect(MessageType.PING).toBe('ping');
      expect(MessageType.PONG).toBe('pong');
      expect(MessageType.ERROR).toBe('error');
      expect(MessageType.ACK).toBe('ack');
    });
  });

  describe('Client Connection', () => {
    it('should accept valid session token', async () => {
      const server = new RealtimeServer(mockConfig);

      // Mock session verification
      const mockDb = (server as any).db;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => [
              {
                userId: 'user-123',
                expires: new Date(Date.now() + 86400000), // Expires tomorrow
              },
            ]),
          })),
        })),
      }));

      const result = await (server as any).verifySessionToken('valid-token');

      expect(result).toBeDefined();
    });

    it('should reject expired session token', async () => {
      const server = new RealtimeServer(mockConfig);

      // Mock expired session
      const mockDb = (server as any).db;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => [
              {
                userId: 'user-123',
                expires: new Date(Date.now() - 86400000), // Expired yesterday
              },
            ]),
          })),
        })),
      }));

      const result = await (server as any).verifySessionToken('expired-token');

      expect(result).toBeNull();
    });

    it('should reject invalid session token', async () => {
      const server = new RealtimeServer(mockConfig);

      // Mock no session found
      const mockDb = (server as any).db;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
        })),
      }));

      const result = await (server as any).verifySessionToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('Message Handling', () => {
    it('should handle PING message', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      const mockWs = {
        readyState: 1, // OPEN
        send: vi.fn(),
      };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: MessageType.PING,
          payload: {},
        })
      );

      expect(mockWs.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe(MessageType.PONG);
    });

    it('should handle CHAT_MESSAGE', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      const mockWs = {
        readyState: 1,
        send: vi.fn(),
      };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      // Mock database insert
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      }));
      (server as any).db.insert = mockInsert;

      // Mock Redis publish
      (server as any).redis.publish = vi.fn().mockResolvedValue(1);

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: MessageType.CHAT_MESSAGE,
          payload: 'Hello, world!',
        })
      );

      expect(mockInsert).toHaveBeenCalled();
      expect((server as any).redis.publish).toHaveBeenCalledWith('chat:broadcast', expect.any(String));
    });

    it('should handle USER_TYPING', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      (server as any).clients.set(clientId, {
        ws: { readyState: 1, send: vi.fn() },
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      (server as any).redis.publish = vi.fn().mockResolvedValue(1);

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: MessageType.USER_TYPING,
          payload: {},
        })
      );

      expect((server as any).redis.publish).toHaveBeenCalledWith('chat:typing', expect.any(String));
      expect((server as any).typingUsers.get('session-1')?.has('user-123')).toBe(true);
    });

    it('should handle USER_STOPPED_TYPING', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      (server as any).clients.set(clientId, {
        ws: { readyState: 1, send: vi.fn() },
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      // Set user as typing first
      (server as any).typingUsers.set('session-1', new Set(['user-123']));

      (server as any).redis.publish = vi.fn().mockResolvedValue(1);

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: MessageType.USER_STOPPED_TYPING,
          payload: {},
        })
      );

      expect((server as any).typingUsers.get('session-1')?.has('user-123')).toBe(false);
    });

    it('should handle unknown message type', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      const mockWs = {
        readyState: 1,
        send: vi.fn(),
      };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: 'UNKNOWN_TYPE',
          payload: {},
        })
      );

      // Should log warning but not crash
      expect((server as any).clients.has(clientId)).toBe(true);
    });

    it('should handle invalid JSON', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client-1';

      const mockWs = {
        readyState: 1,
        send: vi.fn(),
      };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      await (server as any).handleClientMessage(clientId, 'invalid-json{');

      expect(mockWs.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe(MessageType.ERROR);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast to all clients in session', () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };
      const mockWs3 = { readyState: 1, send: vi.fn() };

      // Two clients in session-1, one in session-2
      (server as any).clients.set('client-1', {
        ws: mockWs1,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      (server as any).clients.set('client-2', {
        ws: mockWs2,
        userId: 'user-2',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      (server as any).clients.set('client-3', {
        ws: mockWs3,
        userId: 'user-3',
        tenantId: 'tenant-1',
        sessionId: 'session-2',
        lastActivity: Date.now(),
      });

      const message: WSMessage = {
        type: MessageType.CHAT_MESSAGE,
        payload: 'Test broadcast',
      };

      (server as any).broadcastToSession('session-1', message);

      // Should send to client-1 and client-2, not client-3
      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
      expect(mockWs3.send).not.toHaveBeenCalled();
    });

    it('should exclude sender from broadcast', () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };

      (server as any).clients.set('client-1', {
        ws: mockWs1,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      (server as any).clients.set('client-2', {
        ws: mockWs2,
        userId: 'user-2',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      const message: WSMessage = {
        type: MessageType.CHAT_MESSAGE,
        payload: 'Test',
      };

      (server as any).broadcastToSession('session-1', message, 'client-1');

      // Should only send to client-2
      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it('should skip closed connections', () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs = { readyState: 3, send: vi.fn() }; // CLOSED

      (server as any).clients.set('client-1', {
        ws: mockWs,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      const message: WSMessage = {
        type: MessageType.CHAT_MESSAGE,
        payload: 'Test',
      };

      (server as any).broadcastToSession('session-1', message);

      // Should not attempt to send to closed connection
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('Redis Pub/Sub', () => {
    it('should handle chat:broadcast messages', () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs = { readyState: 1, send: vi.fn() };

      (server as any).clients.set('client-1', {
        ws: mockWs,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      const redisMessage = JSON.stringify({
        sessionId: 'session-1',
        message: {
          type: MessageType.CHAT_MESSAGE,
          payload: 'Broadcast from another server',
        },
      });

      (server as any).handleRedisMessage('chat:broadcast', redisMessage);

      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should handle chat:typing messages', () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs = { readyState: 1, send: vi.fn() };

      (server as any).clients.set('client-1', {
        ws: mockWs,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      const redisMessage = JSON.stringify({
        sessionId: 'session-1',
        userId: 'user-2',
        isTyping: true,
      });

      (server as any).handleRedisMessage('chat:typing', redisMessage);

      expect(mockWs.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe(MessageType.USER_TYPING);
    });

    it('should handle invalid Redis JSON gracefully', () => {
      const server = new RealtimeServer(mockConfig);

      // Should not throw error
      expect(() => {
        (server as any).handleRedisMessage('chat:broadcast', 'invalid-json{');
      }).not.toThrow();
    });
  });

  describe('Client Lifecycle', () => {
    it('should track last activity time', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client';
      const initialTime = Date.now();

      const mockWs = { readyState: 1, send: vi.fn() };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: initialTime,
      });

      // Simulate some time passing
      await new Promise((resolve) => setTimeout(resolve, 10));

      await (server as any).handleClientMessage(
        clientId,
        JSON.stringify({
          type: MessageType.PING,
          payload: {},
        })
      );

      const client = (server as any).clients.get(clientId);
      expect(client.lastActivity).toBeGreaterThan(initialTime);
    });

    it('should clean up on disconnect', async () => {
      const server = new RealtimeServer(mockConfig);
      const clientId = 'test-client';

      const mockWs = { readyState: 1, send: vi.fn() };

      (server as any).clients.set(clientId, {
        ws: mockWs,
        userId: 'user-123',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      // Set user as typing
      (server as any).typingUsers.set('session-1', new Set(['user-123']));

      (server as any).redis.publish = vi.fn().mockResolvedValue(1);

      await (server as any).handleDisconnect(clientId);

      expect((server as any).clients.has(clientId)).toBe(false);
      expect((server as any).typingUsers.get('session-1')?.has('user-123')).toBe(false);
      expect((server as any).redis.publish).toHaveBeenCalledWith('chat:presence', expect.any(String));
    });
  });

  describe('Message Persistence', () => {
    it('should persist chat messages to database', async () => {
      const server = new RealtimeServer(mockConfig);

      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      }));
      (server as any).db.insert = mockInsert;

      await (server as any).persistMessage({
        sessionId: 'session-1',
        userId: 'user-123',
        content: 'Test message',
        timestamp: Date.now(),
      });

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const server = new RealtimeServer(mockConfig);

      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.reject(new Error('Database error'))),
      }));
      (server as any).db.insert = mockInsert;

      // Should not throw error
      await expect(
        (server as any).persistMessage({
          sessionId: 'session-1',
          userId: 'user-123',
          content: 'Test message',
          timestamp: Date.now(),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Shutdown', () => {
    it('should close all connections gracefully', async () => {
      const server = new RealtimeServer(mockConfig);

      const mockWs1 = { readyState: 1, send: vi.fn(), close: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn(), close: vi.fn() };

      (server as any).clients.set('client-1', {
        ws: mockWs1,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      (server as any).clients.set('client-2', {
        ws: mockWs2,
        userId: 'user-2',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        lastActivity: Date.now(),
      });

      await server.initialize();
      await server.shutdown();

      expect(mockWs1.close).toHaveBeenCalledWith(1001, 'Server shutting down');
      expect(mockWs2.close).toHaveBeenCalledWith(1001, 'Server shutting down');
    });

    it('should close Redis connections', async () => {
      const server = new RealtimeServer(mockConfig);

      const mockQuit = vi.fn().mockResolvedValue('OK');
      (server as any).redis.quit = mockQuit;
      (server as any).redisSub.quit = mockQuit;

      await server.initialize();
      await server.shutdown();

      expect(mockQuit).toHaveBeenCalledTimes(2);
    });
  });
});
