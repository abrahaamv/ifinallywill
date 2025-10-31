/**
 * Auth Plugin Tests
 * Validates Auth.js integration with Fastify
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authPlugin, getSession } from '../plugins/auth';

// Mock Auth.js
vi.mock('@auth/core', () => ({
  Auth: vi.fn(),
}));

// Mock authConfig
vi.mock('@platform/auth', () => ({
  authConfig: {
    providers: [],
    session: { strategy: 'jwt' },
  },
}));

describe('Auth Plugin', () => {
  let mockApp: Partial<FastifyInstance>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn().mockResolvedValue(undefined);
    mockAll = vi.fn();

    mockApp = {
      register: mockRegister,
      all: mockAll,
      log: {
        info: vi.fn(),
        error: vi.fn(),
      } as any,
    };

    mockRequest = {
      url: '/api/auth/session',
      method: 'GET',
      headers: {
        host: 'localhost:3001',
        'content-type': 'application/json',
      },
      body: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('authPlugin registration', () => {
    it('should register formbody plugin', async () => {
      await authPlugin(mockApp as FastifyInstance);

      expect(mockRegister).toHaveBeenCalledWith(expect.anything());
    });

    it('should register /api/auth/* route handler', async () => {
      await authPlugin(mockApp as FastifyInstance);

      expect(mockAll).toHaveBeenCalledWith('/api/auth/*', expect.any(Function));
    });

    it('should log successful registration', async () => {
      await authPlugin(mockApp as FastifyInstance);

      expect(mockApp.log?.info).toHaveBeenCalledWith('Auth plugin registered: /api/auth/*');
    });
  });

  describe('Auth.js request handling', () => {
    it('should forward GET requests to Auth.js', async () => {
      const { Auth } = await import('@auth/core');
      const mockAuthResponse = new Response('{"user":null}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      vi.mocked(Auth).mockResolvedValue(mockAuthResponse);

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(Auth).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should handle form-urlencoded POST requests', async () => {
      const { Auth } = await import('@auth/core');
      const mockAuthResponse = new Response('OK', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      vi.mocked(Auth).mockResolvedValue(mockAuthResponse);

      mockRequest.method = 'POST';
      mockRequest.headers = {
        ...mockRequest.headers,
        'content-type': 'application/x-www-form-urlencoded',
      };
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(Auth).toHaveBeenCalled();
      const authRequest = vi.mocked(Auth).mock.calls[0][0] as Request;
      expect(authRequest.method).toBe('POST');
    });

    it('should handle JSON POST requests', async () => {
      const { Auth } = await import('@auth/core');
      const mockAuthResponse = new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      vi.mocked(Auth).mockResolvedValue(mockAuthResponse);

      mockRequest.method = 'POST';
      mockRequest.headers = {
        ...mockRequest.headers,
        'content-type': 'application/json',
      };
      mockRequest.body = {
        email: 'test@example.com',
      };

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(Auth).toHaveBeenCalled();
      const authRequest = vi.mocked(Auth).mock.calls[0][0] as Request;
      expect(authRequest.method).toBe('POST');
    });

    it('should copy headers from Auth.js response', async () => {
      const { Auth } = await import('@auth/core');
      const mockAuthResponse = new Response('OK', {
        status: 200,
        headers: {
          'set-cookie': 'session=abc123; HttpOnly; Secure',
          'content-type': 'text/html',
        },
      });

      vi.mocked(Auth).mockResolvedValue(mockAuthResponse);

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('set-cookie', expect.any(String));
      expect(mockReply.header).toHaveBeenCalledWith('content-type', 'text/html');
    });

    it('should handle Auth.js errors gracefully', async () => {
      const { Auth } = await import('@auth/core');
      vi.mocked(Auth).mockRejectedValue(new Error('Auth configuration error'));

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockApp.log?.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication error',
        })
      );
    });

    it('should expose error message in development mode', async () => {
      const { Auth } = await import('@auth/core');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      vi.mocked(Auth).mockRejectedValue(new Error('Specific error message'));

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Specific error message'),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', async () => {
      const { Auth } = await import('@auth/core');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      vi.mocked(Auth).mockRejectedValue(new Error('Sensitive error'));

      await authPlugin(mockApp as FastifyInstance);
      const handler = mockAll.mock.calls[0][1];

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getSession helper', () => {
    it('should return session when authenticated', async () => {
      const { Auth } = await import('@auth/core');
      const mockSessionResponse = new Response(
        JSON.stringify({ user: { id: '123', email: 'test@example.com' } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );

      vi.mocked(Auth).mockResolvedValue(mockSessionResponse);

      const session = await getSession(mockRequest as FastifyRequest);

      expect(session).toEqual({
        user: { id: '123', email: 'test@example.com' },
      });
    });

    it('should return null when not authenticated', async () => {
      const { Auth } = await import('@auth/core');
      const mockSessionResponse = new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      vi.mocked(Auth).mockResolvedValue(mockSessionResponse);

      const session = await getSession(mockRequest as FastifyRequest);

      expect(session).toBeNull();
    });

    it('should return null on Auth.js error', async () => {
      const { Auth } = await import('@auth/core');
      const mockSessionResponse = new Response('Unauthorized', {
        status: 401,
      });

      vi.mocked(Auth).mockResolvedValue(mockSessionResponse);

      const session = await getSession(mockRequest as FastifyRequest);

      expect(session).toBeNull();
    });

    it('should pass request headers to Auth.js', async () => {
      const { Auth } = await import('@auth/core');
      const mockSessionResponse = new Response('{}', { status: 200 });

      vi.mocked(Auth).mockResolvedValue(mockSessionResponse);

      mockRequest.headers = {
        host: 'example.com',
        cookie: 'session=abc123',
      };

      await getSession(mockRequest as FastifyRequest);

      expect(Auth).toHaveBeenCalled();
      const authRequest = vi.mocked(Auth).mock.calls[0][0] as Request;
      expect(authRequest.headers.get('cookie')).toBe('session=abc123');
    });
  });
});
