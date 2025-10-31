/**
 * Rate Limit Plugin Tests
 * Validates Redis-based distributed rate limiting
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyRateLimit,
  getApiRateLimit,
  getAuthRateLimit,
  getChatRateLimit,
  rateLimitPlugin,
} from '../plugins/rate-limit';

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
      zremrangebyscore: vi.fn().mockResolvedValue(0),
      zcard: vi.fn().mockResolvedValue(0),
      zadd: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    })),
  };
});

// Mock @fastify/rate-limit
vi.mock('@fastify/rate-limit', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('Rate Limit Plugin', () => {
  let mockApp: Partial<FastifyInstance>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockApp = {
      register: vi.fn().mockResolvedValue(undefined),
      decorate: vi.fn(),
      addHook: vi.fn(),
      log: {
        info: vi.fn(),
        error: vi.fn(),
      } as any,
    };

    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      log: {
        warn: vi.fn(),
        error: vi.fn(),
      } as any,
      server: {} as any,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('rateLimitPlugin registration', () => {
    it('should register rate limit plugin with correct config', async () => {
      await rateLimitPlugin(mockApp as FastifyInstance);

      expect(mockApp.register).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          global: false,
          nameSpace: 'rl:',
          continueExceeding: true,
        })
      );
    });

    it('should decorate Fastify with Redis client', async () => {
      await rateLimitPlugin(mockApp as FastifyInstance);

      expect(mockApp.decorate).toHaveBeenCalledWith('redis', expect.anything());
    });

    it('should add onClose hook for Redis cleanup', async () => {
      await rateLimitPlugin(mockApp as FastifyInstance);

      expect(mockApp.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
    });

    it('should create Redis client with correct configuration', async () => {
      const originalEnv = { ...process.env };
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret';

      const Redis = (await import('ioredis')).default;

      await rateLimitPlugin(mockApp as FastifyInstance);

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret',
          db: 1,
        })
      );

      process.env = originalEnv;
    });
  });

  describe('Rate limit configuration helpers', () => {
    it('getAuthRateLimit should return authentication limits', () => {
      const config = getAuthRateLimit();

      expect(config).toEqual({
        max: 5,
        timeWindow: 15 * 60 * 1000,
        keyPrefix: 'rl:auth',
      });
    });

    it('getChatRateLimit should return tier-based chat limits', () => {
      const freeConfig = getChatRateLimit('free');
      const proConfig = getChatRateLimit('pro');
      const enterpriseConfig = getChatRateLimit('enterprise');

      expect(freeConfig.max).toBe(10);
      expect(proConfig.max).toBe(100);
      expect(enterpriseConfig.max).toBe(1000);
    });

    it('getChatRateLimit should default to free tier', () => {
      const config = getChatRateLimit();

      expect(config.max).toBe(10);
      expect(config.keyPrefix).toBe('rl:chat:free');
    });

    it('getChatRateLimit should fallback to free for invalid tier', () => {
      const config = getChatRateLimit('invalid-tier');

      expect(config.max).toBe(10);
    });

    it('getApiRateLimit should return tier-based API limits', () => {
      const freeConfig = getApiRateLimit('free');
      const proConfig = getApiRateLimit('pro');
      const enterpriseConfig = getApiRateLimit('enterprise');

      expect(freeConfig.max).toBe(100);
      expect(proConfig.max).toBe(1000);
      expect(enterpriseConfig.max).toBe(10000);
    });

    it('getApiRateLimit should default to free tier', () => {
      const config = getApiRateLimit();

      expect(config.max).toBe(100);
      expect(config.keyPrefix).toBe('rl:api:free');
    });
  });

  describe('applyRateLimit function', () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        zremrangebyscore: vi.fn().mockResolvedValue(0),
        zcard: vi.fn().mockResolvedValue(0),
        zadd: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
      };

      mockRequest.server = { redis: mockRedis } as any;
    });

    it('should allow request within rate limit', async () => {
      mockRedis.zcard.mockResolvedValue(4); // 4 requests < 5 max

      const config = {
        max: 5,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should block request when rate limit exceeded', async () => {
      mockRedis.zcard.mockResolvedValue(5); // 5 requests >= 5 max

      const config = {
        max: 5,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          error: 'Too Many Requests',
        })
      );
    });

    it('should use user ID for authenticated requests', async () => {
      // @ts-expect-error - Testing user property
      mockRequest.user = { id: 'user-123' };

      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:chat:free',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should use IP address for anonymous requests', async () => {
      mockRequest.ip = '192.168.1.1';

      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:api:free',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('ip:192.168.1.1'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should use X-Forwarded-For header when present', async () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1',
      };

      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('ip:203.0.113.1'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should clean up old entries outside time window', async () => {
      const now = Date.now();
      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        0,
        expect.any(Number)
      );
    });

    it('should set expiry on Redis key', async () => {
      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        Math.ceil(config.timeWindow / 1000)
      );
    });

    it('should fail open when Redis is unavailable', async () => {
      mockRequest.server = { redis: null } as any;

      const config = {
        max: 5,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        'Redis client not available for rate limiting'
      );
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should fail open on Redis errors', async () => {
      mockRedis.zcard.mockRejectedValue(new Error('Redis connection failed'));

      const config = {
        max: 5,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockRequest.log?.error).toHaveBeenCalled();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should include retry-after in rate limit response', async () => {
      mockRedis.zcard.mockResolvedValue(10);

      const config = {
        max: 10,
        timeWindow: 60000,
        keyPrefix: 'rl:test',
      };

      await applyRateLimit(mockRequest as FastifyRequest, mockReply as FastifyReply, config);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 60,
        })
      );
    });
  });
});
