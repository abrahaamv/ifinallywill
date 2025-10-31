/**
 * Fastify Mocks - Phase 2 Task 2.2
 *
 * Mock factories for Fastify request/reply objects.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create mock Fastify request
 */
export const createMockRequest = (
  overrides?: Partial<FastifyRequest>
): Partial<FastifyRequest> => ({
  headers: overrides?.headers || {},
  body: overrides?.body || {},
  query: overrides?.query || {},
  params: overrides?.params || {},
  method: overrides?.method || 'GET',
  url: overrides?.url || '/',
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as any,
  ...overrides,
});

/**
 * Create mock Fastify reply
 */
export const createMockReply = (): Partial<FastifyReply> => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  header: vi.fn().mockReturnThis(),
  headers: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
  type: vi.fn().mockReturnThis(),
  redirect: vi.fn().mockReturnThis(),
  setCookie: vi.fn().mockReturnThis(),
  clearCookie: vi.fn().mockReturnThis(),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as any,
});

/**
 * Create mock Fastify instance
 */
export const createMockFastify = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  options: vi.fn(),
  register: vi.fn(),
  listen: vi.fn(),
  close: vi.fn(),
  inject: vi.fn(),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  },
});
