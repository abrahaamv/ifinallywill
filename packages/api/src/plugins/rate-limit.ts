/**
 * Rate Limiting Plugin - Phase 8 Day 8-10
 *
 * Redis-based distributed rate limiting with endpoint-specific limits.
 *
 * **Architecture**:
 * - Global rate limiter disabled (per-route configuration)
 * - Redis for distributed rate limit tracking across instances
 * - User-based limits (authenticated) vs IP-based (anonymous)
 * - Endpoint-specific limits matching threat profile
 *
 * **Rate Limit Strategy**:
 * - **Authentication endpoints** (5 req/15min): Brute-force protection
 * - **AI chat endpoints** (tier-based): Cost control + abuse prevention
 * - **API endpoints** (tier-based): Fair usage enforcement
 * - **Health/metrics** (unlimited): Monitoring infrastructure
 *
 * **Response Headers** (RFC 6585):
 * - `X-RateLimit-Limit`: Maximum requests allowed
 * - `X-RateLimit-Remaining`: Remaining requests
 * - `X-RateLimit-Reset`: Timestamp when limit resets
 * - `Retry-After`: Seconds until retry allowed (on 429 errors)
 *
 * Reference: OWASP API Security Top 10 2023 - API4:2023 Unrestricted Resource Consumption
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

/**
 * Rate limit configuration per endpoint
 */
interface RateLimitConfig {
	max: number; // Maximum requests
	timeWindow: number; // Time window in milliseconds
	keyPrefix: string; // Redis key prefix
}

/**
 * Subscription tier rate limits
 */
const TIER_LIMITS: Record<
	string,
	{
		chat: RateLimitConfig;
		api: RateLimitConfig;
	}
> = {
	free: {
		chat: {
			max: 10, // 10 messages per 5 minutes
			timeWindow: 5 * 60 * 1000,
			keyPrefix: 'rl:chat:free',
		},
		api: {
			max: 100, // 100 API calls per hour
			timeWindow: 60 * 60 * 1000,
			keyPrefix: 'rl:api:free',
		},
	},
	pro: {
		chat: {
			max: 100, // 100 messages per 5 minutes
			timeWindow: 5 * 60 * 1000,
			keyPrefix: 'rl:chat:pro',
		},
		api: {
			max: 1000, // 1000 API calls per hour
			timeWindow: 60 * 60 * 1000,
			keyPrefix: 'rl:api:pro',
		},
	},
	enterprise: {
		chat: {
			max: 1000, // 1000 messages per 5 minutes
			timeWindow: 5 * 60 * 1000,
			keyPrefix: 'rl:chat:enterprise',
		},
		api: {
			max: 10000, // 10000 API calls per hour
			timeWindow: 60 * 60 * 1000,
			keyPrefix: 'rl:api:enterprise',
		},
	},
};

/**
 * Authentication endpoint rate limits (aggressive)
 */
const AUTH_RATE_LIMIT: RateLimitConfig = {
	max: 5, // 5 login attempts
	timeWindow: 15 * 60 * 1000, // per 15 minutes
	keyPrefix: 'rl:auth',
};

/**
 * Register rate limiting plugin
 *
 * Creates Redis connection and configures global rate limiter.
 * Individual routes apply specific limits via `config.rateLimit`.
 *
 * @param fastify - Fastify instance
 */
export async function rateLimitPlugin(fastify: FastifyInstance): Promise<void> {
	// Create Redis client for rate limit storage
	const redis = new Redis({
		host: process.env.REDIS_HOST || 'localhost',
		port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
		password: process.env.REDIS_PASSWORD,
		db: 1, // Use DB 1 for rate limiting (DB 0 for sessions/cache)
		maxRetriesPerRequest: 3,
		retryStrategy(times: number) {
			const delay = Math.min(times * 50, 2000);
			return delay;
		},
		reconnectOnError(err: Error) {
			const targetError = 'READONLY';
			if (err.message.includes(targetError)) {
				// Only reconnect when the error contains "READONLY"
				return true;
			}
			return false;
		},
	});

	// Log Redis connection status
	redis.on('connect', () => {
		fastify.log.info('Redis rate limiter connected');
	});

	redis.on('error', (err: Error) => {
		fastify.log.error({ err }, 'Redis rate limiter error');
	});

	// Cleanup on server close
	fastify.addHook('onClose', async () => {
		await redis.quit();
	});

	// Register rate limiter with global disabled (per-route configuration)
	await fastify.register(fastifyRateLimit, {
		global: false, // Disable global rate limiting (use per-route)
		redis, // Use Redis for distributed rate limiting
		nameSpace: 'rl:', // Redis key namespace
		continueExceeding: true, // Continue counting after limit exceeded

		// Key generator: User ID (authenticated) or IP address (anonymous)
		keyGenerator: (req: FastifyRequest): string => {
			// Authenticated users: rate limit by user ID
			// @ts-expect-error - user property added by auth plugin
			if (req.user?.id) {
				// @ts-expect-error - user property added by auth plugin
				return `user:${req.user.id}`;
			}

			// Anonymous users: rate limit by IP address
			// Support X-Forwarded-For header (load balancer/proxy)
			const forwardedFor = req.headers['x-forwarded-for'];
			if (forwardedFor) {
				// Use first IP in chain (original client IP)
				const clientIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
				return `ip:${clientIp?.trim()}`;
			}

			// Fallback to direct IP
			return `ip:${req.ip}`;
		},

		// Error response builder (RFC 6585 compliant)
		errorResponseBuilder: (
			_req: FastifyRequest,
			context: { max: number; after: string; ttl: number }
		): { statusCode: number; error: string; message: string; retryAfter: number } => {
			return {
				statusCode: 429,
				error: 'Too Many Requests',
				message: `Rate limit exceeded. Maximum ${context.max} requests allowed. Retry after ${context.after}`,
				retryAfter: Math.ceil(context.ttl / 1000), // Convert ms to seconds
			};
		},

		// Add rate limit headers to all responses
		addHeaders: {
			'x-ratelimit-limit': true,
			'x-ratelimit-remaining': true,
			'x-ratelimit-reset': true,
			'retry-after': true,
		},
	});

	// Store Redis client for programmatic access
	fastify.decorate('redis', redis);
}

/**
 * Get rate limit configuration for authentication endpoints
 *
 * Apply to login, signup, password reset endpoints.
 *
 * @returns Rate limit configuration
 *
 * @example
 * ```typescript
 * fastify.post('/api/auth/signin', {
 *   config: { rateLimit: getAuthRateLimit() }
 * }, async (req, reply) => { ... });
 * ```
 */
export function getAuthRateLimit(): RateLimitConfig {
	return AUTH_RATE_LIMIT;
}

/**
 * Get rate limit configuration for chat endpoints
 *
 * Tier-based limits based on user subscription.
 *
 * @param tier - User subscription tier (free, pro, enterprise)
 * @returns Rate limit configuration
 *
 * @example
 * ```typescript
 * fastify.post('/api/chat/message', {
 *   config: { rateLimit: getChatRateLimit(req.user.tier) }
 * }, async (req, reply) => { ... });
 * ```
 */
export function getChatRateLimit(tier: string = 'free'): RateLimitConfig {
	// biome-ignore lint/style/noNonNullAssertion: free tier always defined
	return TIER_LIMITS[tier]?.chat || TIER_LIMITS.free!.chat;
}

/**
 * Get rate limit configuration for API endpoints
 *
 * Tier-based limits based on user subscription.
 *
 * @param tier - User subscription tier (free, pro, enterprise)
 * @returns Rate limit configuration
 *
 * @example
 * ```typescript
 * fastify.post('/api/widgets/create', {
 *   config: { rateLimit: getApiRateLimit(req.user.tier) }
 * }, async (req, reply) => { ... });
 * ```
 */
export function getApiRateLimit(tier: string = 'free'): RateLimitConfig {
	// biome-ignore lint/style/noNonNullAssertion: free tier always defined
	return TIER_LIMITS[tier]?.api || TIER_LIMITS.free!.api;
}

/**
 * Custom rate limit decorator for dynamic tier-based limiting
 *
 * Use when rate limit tier cannot be determined at route registration.
 *
 * @param req - Fastify request
 * @param reply - Fastify reply
 * @param config - Rate limit configuration
 *
 * @example
 * ```typescript
 * fastify.post('/api/chat/message', async (req, reply) => {
 *   const tier = req.user?.tier || 'free';
 *   await applyRateLimit(req, reply, getChatRateLimit(tier));
 *   // Handle request...
 * });
 * ```
 */
export async function applyRateLimit(
	req: FastifyRequest,
	reply: FastifyReply,
	config: RateLimitConfig
): Promise<void> {
	// Access rate limiter from Fastify instance
	const rateLimiter = (req.server as any).rateLimit;

	if (!rateLimiter) {
		req.log.warn('Rate limiter not available');
		return;
	}

	// Generate key with custom prefix
	const keyGenerator = (req.server as any).rateLimit.keyGenerator;
	const key = `${config.keyPrefix}:${keyGenerator(req)}`;

	// Check rate limit
	try {
		await rateLimiter.check(key, config.max, config.timeWindow);
	} catch (err: unknown) {
		// Rate limit exceeded
		const ttl = config.timeWindow;
		const after = `${Math.ceil(ttl / 1000)}s`;

		reply.status(429).send({
			statusCode: 429,
			error: 'Too Many Requests',
			message: `Rate limit exceeded. Maximum ${config.max} requests allowed. Retry after ${after}`,
			retryAfter: Math.ceil(ttl / 1000),
		});
	}
}
