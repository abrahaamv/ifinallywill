/**
 * Fastify + tRPC API Server (Phase 6 Integration)
 *
 * Combines tRPC API with WebSocket server for real-time features.
 * Port 3001: HTTP + tRPC
 * Port 3002: WebSocket server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter, createContext } from '@platform/api-contract';
import { RealtimeServer } from '@platform/realtime';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
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
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true,
  });

  // Register tRPC plugin
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
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
    heartbeatInterval: 30000, // 30 seconds
  });

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
  console.error('Fatal error starting servers:', error);
  process.exit(1);
});
