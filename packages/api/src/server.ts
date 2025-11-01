/**
 * Fastify + tRPC API Server (Phase 8 Security Integration)
 *
 * Combines tRPC API with WebSocket server for real-time features.
 * Port 3001: HTTP + tRPC + Auth.js
 * Port 3002: WebSocket server
 *
 * Phase 8 Security:
 * - Auth.js session-based authentication
 * - NIST-compliant session timeouts (8 hours + 30 minutes inactivity)
 * - Argon2id password hashing with bcrypt migration
 * - Account lockout protection (5 attempts = 15 minutes)
 */

import cors from '@fastify/cors';
import { appRouter, createContext } from '@platform/api-contract';
import {
  VoyageEmbeddingProvider,
  warmEmbeddingCache,
  type CacheWarmingConfig,
} from '@platform/knowledge';
import { RealtimeServer } from '@platform/realtime';
import { createModuleLogger } from '@platform/shared';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import Redis from 'ioredis';
import { authPlugin } from './plugins/auth';
import { rateLimitPlugin } from './plugins/rate-limit';
// import { initializeSurveyScheduler } from './cron/survey-scheduler'; // TODO: Re-enable when survey scheduler is implemented

const logger = createModuleLogger('api-server');

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3001;
const WS_PORT = process.env.WS_PORT ? Number.parseInt(process.env.WS_PORT) : 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://platform:platform_dev_password@localhost:5432/platform';

async function main() {
  // Phase 12 Week 3: Initialize Redis client for RAG caching
  let redis: Redis | undefined;
  let embeddingProvider: VoyageEmbeddingProvider | undefined;

  try {
    redis = new Redis(REDIS_URL);
    logger.info('Redis client initialized for RAG caching');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.warn('Redis initialization failed, RAG caching disabled', { error });
    redis = undefined;
  }

  // Phase 12 Week 3: Initialize Voyage embedding provider
  try {
    if (process.env.VOYAGE_API_KEY) {
      embeddingProvider = new VoyageEmbeddingProvider({
        apiKey: process.env.VOYAGE_API_KEY,
        model: 'voyage-2',
      });
      logger.info('Voyage embedding provider initialized');

      // Phase 12 Week 2-3: Warm embedding cache on startup
      if (redis && embeddingProvider) {
        logger.info('Starting cache warming...');
        const warmingConfig: CacheWarmingConfig = {
          redis,
          embeddingProvider,
          batchSize: 10,
          ttl: 86400, // 24 hours
        };

        const stats = await warmEmbeddingCache(warmingConfig);
        logger.info('Cache warming complete', {
          totalQueries: stats.totalQueries,
          cachedQueries: stats.cachedQueries,
          cacheHits: stats.cacheHits,
          hitRate: `${((stats.cacheHits / stats.totalQueries) * 100).toFixed(1)}%`,
          durationMs: stats.durationMs,
          estimatedCost: `$${stats.estimatedCost.toFixed(4)}`,
        });
      }
    } else {
      logger.warn('VOYAGE_API_KEY not set, semantic search disabled');
    }
  } catch (error) {
    logger.warn('Voyage provider initialization failed, semantic search disabled', { error });
    embeddingProvider = undefined;
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    maxParamLength: 5000,
    // Explicitly enable JSON body parsing for tRPC (Fastify 5.3.2+ security fix)
    bodyLimit: 1048576, // 1MB
    ignoreTrailingSlash: true,
  });

  // Register JSON parser for all content-types (required for tRPC batch requests)
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: unknown) {
      done(err instanceof Error ? err : new Error('Invalid JSON'), undefined);
    }
  });

  // Register CORS with production security
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Get allowed origins from environment variables (NO FALLBACKS - fail-fast)
      const getAllowedOrigins = (): string[] => {
        const origins = [
          process.env.APP_URL,
          process.env.DASHBOARD_URL,
          process.env.MEET_URL,
          process.env.WIDGET_URL,
        ].filter(Boolean) as string[];

        if (origins.length === 0) {
          throw new Error(
            'CORS configuration error: No allowed origins configured.\n' +
              'Please set APP_URL, DASHBOARD_URL, MEET_URL, and WIDGET_URL environment variables.\n' +
              'See .env.example for configuration template.'
          );
        }

        return origins;
      };

      const allowed: Array<string | RegExp> = [
        ...getAllowedOrigins(),
        // Subdomain wildcard regex (e.g., *.platform.com for production)
        ...(process.env.NODE_ENV === 'production' ? [/^https:\/\/.*\.platform\.com$/] : []),
      ];

      // Check if origin is allowed
      const isAllowed = allowed.some((pattern) =>
        typeof pattern === 'string'
          ? pattern === origin
          : pattern instanceof RegExp && origin
            ? pattern.test(origin)
            : false
      );

      callback(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-CSRF-Token'],
    maxAge: 86400, // 24 hours preflight cache
  });

  // Register rate limiting plugin (BEFORE Auth.js)
  // Protects authentication endpoints from brute-force attacks
  await fastify.register(rateLimitPlugin);

  // Register Auth.js plugin (BEFORE tRPC)
  // This must come first to enable session management for tRPC context
  await fastify.register(authPlugin);

  // Register tRPC plugin
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: async (opts: { req: FastifyRequest; res: FastifyReply }) => {
        return createContext({
          ...opts,
          redis,
          embeddingProvider,
        });
      },
      onError({ path, error }: { path?: string; error: unknown }) {
        fastify.log.error({ path, error }, 'tRPC Error');
      },
    },
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: 'running',
        websocket: 'running',
      },
    };
  });

  // Initialize WebSocket server (on separate port)
  const realtimeServer = new RealtimeServer({
    port: WS_PORT,
    redisUrl: REDIS_URL,
    databaseUrl: DATABASE_URL,
    heartbeatInterval: 30000, // 30 seconds
  });

  // Initialize survey scheduler (Phase 11 Week 3)
  // TODO: Re-enable when survey scheduler is implemented
  // initializeSurveyScheduler();

  try {
    await realtimeServer.initialize();
    fastify.log.info(`WebSocket server listening on port ${WS_PORT}`);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to initialize WebSocket server');
    // Continue with API server even if WebSocket fails
  }

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down servers...');

    // Close API server
    await fastify.close();
    fastify.log.info('API server closed');

    // Close WebSocket server
    if (realtimeServer) {
      await realtimeServer.shutdown();
      fastify.log.info('WebSocket server closed');
    }

    // Close Redis connection (Phase 12 Week 3)
    if (redis) {
      await redis.quit();
      fastify.log.info('Redis connection closed');
    }

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start API server
  try {
    await fastify.listen({
      port: PORT,
      host: process.env.HOST || '0.0.0.0',
    });

    fastify.log.info(`API server listening on port ${PORT}`);
    fastify.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start API server');
    process.exit(1);
  }
}

// Start server
main().catch((error: unknown) => {
  logger.error('Fatal error starting servers', { error });
  process.exit(1);
});
