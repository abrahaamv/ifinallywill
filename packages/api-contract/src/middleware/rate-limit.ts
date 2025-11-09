/**
 * tRPC Rate Limiting Middleware
 *
 * Applies tier-based rate limiting to tRPC procedures.
 * Integrates with Redis-backed rate limiting from @fastify/rate-limit.
 *
 * **Rate Limit Strategy**:
 * - Free tier: 100 API calls/hour
 * - Pro tier: 1000 API calls/hour
 * - Enterprise: 10,000 API calls/hour
 *
 * **Implementation**:
 * - Uses Fastify request object from context
 * - Applies sliding window rate limiting via Redis
 * - Returns TRPC_ERROR on rate limit exceeded
 *
 * Usage:
 * ```typescript
 * export const rateLimitedProcedure = publicProcedure.use(rateLimitMiddleware);
 *
 * // In router
 * myEndpoint: rateLimitedProcedure
 *   .input(z.object({ ... }))
 *   .query(async ({ ctx }) => { ... })
 * ```
 */

import { TRPCError } from '@trpc/server';
import { tooManyRequests } from '@platform/shared';
import type { Context } from '../context';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('trpc-rate-limit');

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  max: number; // Maximum requests
  timeWindow: number; // Time window in milliseconds
  keyPrefix: string; // Redis key prefix
}

/**
 * Tier-based rate limits (matches packages/api/src/plugins/rate-limit.ts)
 */
const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    max: 100, // 100 API calls per hour
    timeWindow: 60 * 60 * 1000,
    keyPrefix: 'rl:trpc:free',
  },
  pro: {
    max: 1000, // 1000 API calls per hour
    timeWindow: 60 * 60 * 1000,
    keyPrefix: 'rl:trpc:pro',
  },
  enterprise: {
    max: 10000, // 10,000 API calls per hour
    timeWindow: 60 * 60 * 1000,
    keyPrefix: 'rl:trpc:enterprise',
  },
};

/**
 * Generate rate limit key from context
 */
function generateRateLimitKey(ctx: Context): string {
  // Authenticated users: rate limit by user ID
  if (ctx.userId) {
    return `user:${ctx.userId}`;
  }

  // Anonymous users: rate limit by IP address
  const forwardedFor = ctx.req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const clientIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return `ip:${clientIp?.trim()}`;
  }

  return `ip:${ctx.req.ip}`;
}

/**
 * Apply rate limiting to tRPC procedure
 *
 * @param ctx - tRPC context with Redis client
 * @param config - Rate limit configuration
 * @throws TRPCError with TOO_MANY_REQUESTS if rate limit exceeded
 */
async function applyRateLimit(ctx: Context, config: RateLimitConfig): Promise<void> {
  // Check if Redis is available
  if (!ctx.redis) {
    // No Redis - skip rate limiting (fail open)
    return;
  }

  // Generate key
  const userKey = generateRateLimitKey(ctx);
  const key = `${config.keyPrefix}:${userKey}`;

  try {
    // Sliding window rate limiting
    const now = Date.now();
    const windowStart = now - config.timeWindow;

    // Remove old entries outside the window
    await ctx.redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const currentCount = await ctx.redis.zcard(key);

    if (currentCount >= config.max) {
      // Rate limit exceeded
      const ttl = config.timeWindow;
      const retryAfterSeconds = Math.ceil(ttl / 1000);

      throw tooManyRequests({
        message: `Rate limit exceeded. Maximum ${config.max} requests per hour. Retry after ${retryAfterSeconds}s`,
      });
    }

    // Add current request to window
    await ctx.redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on key (cleanup)
    await ctx.redis.expire(key, Math.ceil(config.timeWindow / 1000));
  } catch (error) {
    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Otherwise, log and fail open
    logger.error('Rate limit check failed', { error });
  }
}

/**
 * Rate limiting middleware for tRPC procedures
 *
 * Applies tier-based rate limiting based on user's subscription tier.
 * Uses Redis for distributed rate limiting across multiple API instances.
 *
 * @example
 * ```typescript
 * // Apply to protected procedures
 * export const rateLimitedProcedure = protectedProcedure.use(rateLimitMiddleware);
 *
 * // Use in router
 * myEndpoint: rateLimitedProcedure
 *   .input(z.object({ data: z.string() }))
 *   .mutation(async ({ input, ctx }) => {
 *     // Rate limited, safe to proceed
 *   })
 * ```
 */
export async function rateLimitMiddleware(opts: {
  ctx: Context;
  next: () => Promise<unknown>;
}): Promise<unknown> {
  const { ctx, next } = opts;

  // Determine tier from context (default to free tier)
  // In production, this would come from database user record
  const tier = 'free'; // TODO: Get from ctx.session.user.tier when implemented

  // Get rate limit config for tier (fallback to free tier)
  // biome-ignore lint/style/noNonNullAssertion: free tier always defined
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free!;

  // Apply rate limiting
  await applyRateLimit(ctx, config);

  // Continue to next middleware/procedure
  return next();
}
