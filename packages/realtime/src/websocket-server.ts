/**
 * WebSocket Server (Phase 6 - Real-time Features)
 *
 * Bidirectional chat with:
 * - Redis Streams for multi-instance broadcasting
 * - Message persistence
 * - Typing indicators
 * - Online presence tracking
 * - Sticky session support
 */

import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { authSessions, messages, users } from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import { parse as parseCookie } from 'cookie';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import postgres from 'postgres';
import { WebSocket, WebSocketServer } from 'ws';

const logger = createModuleLogger('websocket');

/**
 * Message types for WebSocket communication
 */
export enum MessageType {
  // Chat messages
  CHAT_MESSAGE = 'chat_message',
  CHAT_HISTORY = 'chat_history',

  // Presence
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_TYPING = 'user_typing',
  USER_STOPPED_TYPING = 'user_stopped_typing',

  // System
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
  ACK = 'ack',
}

/**
 * WebSocket message structure
 */
export interface WSMessage {
  type: MessageType;
  payload: unknown;
  messageId?: string;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Connected client information
 */
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  tenantId: string;
  sessionId: string;
  lastActivity: number;
}

/**
 * WebSocket Server with Redis Streams
 */
export class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private redis: Redis;
  private redisSub: Redis;
  private serverId: string;
  private db: ReturnType<typeof drizzle>;

  // Typing indicator tracking
  private typingUsers: Map<string, Set<string>> = new Map(); // sessionId -> Set<userId>

  constructor(
    private readonly config: {
      port?: number;
      redisUrl: string;
      databaseUrl: string;
      heartbeatInterval?: number;
    }
  ) {
    this.serverId = `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Initialize Redis connections
    this.redis = new Redis(config.redisUrl);
    this.redisSub = new Redis(config.redisUrl);

    // Initialize database connection
    const pgClient = postgres(config.databaseUrl);
    this.db = drizzle(pgClient);
  }

  /**
   * Initialize WebSocket server
   */
  async initialize(server?: Server): Promise<void> {
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      port: this.config.port,
      path: '/ws',
    });

    // Subscribe to Redis pub/sub for cross-instance broadcasting
    await this.redisSub.subscribe('chat:broadcast', 'chat:typing', 'chat:presence');

    this.redisSub.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    // Handle new connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    logger.info('Server initialized', { serverId: this.serverId });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(
    ws: WebSocket,
    request: IncomingMessage | undefined
  ): Promise<void> {
    if (!request) {
      ws.close(1008, 'Missing request object');
      return;
    }
    // Extract chat session ID from query params
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const chatSessionId = url.searchParams.get('sessionId') || '';

    // Extract session token from cookies (Auth.js session cookie)
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      ws.close(1008, 'No authentication cookie found');
      return;
    }

    const cookies = parseCookie(cookieHeader);

    // Auth.js session cookie name (depends on NODE_ENV)
    const sessionCookieName =
      process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token';

    const sessionToken = cookies[sessionCookieName];
    if (!sessionToken) {
      ws.close(1008, 'No session token in cookies');
      return;
    }

    // Verify Auth.js session token
    const verifiedSession = await this.verifySessionToken(sessionToken);
    if (!verifiedSession) {
      ws.close(1008, 'Invalid or expired session');
      return;
    }

    const { userId, tenantId } = verifiedSession;

    const clientId = `${userId}-${Date.now()}`;

    // Store client connection
    this.clients.set(clientId, {
      ws,
      userId,
      tenantId,
      sessionId: chatSessionId,
      lastActivity: Date.now(),
    });

    logger.info('Client connected', { clientId, userId });

    // Send welcome message
    this.sendToClient(clientId, {
      type: MessageType.ACK,
      payload: { connected: true, serverId: this.serverId },
    });

    // Broadcast user joined
    this.broadcastToSession(
      chatSessionId,
      {
        type: MessageType.USER_JOINED,
        payload: { userId, sessionId: chatSessionId },
      },
      clientId
    );

    // Handle incoming messages
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      this.handleClientMessage(clientId, data.toString());
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error('Client error', { clientId, error });
      this.handleDisconnect(clientId);
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleClientMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WSMessage = JSON.parse(data);
      client.lastActivity = Date.now();

      switch (message.type) {
        case MessageType.CHAT_MESSAGE:
          await this.handleChatMessage(clientId, message);
          break;

        case MessageType.USER_TYPING:
          await this.handleTypingIndicator(clientId, true);
          break;

        case MessageType.USER_STOPPED_TYPING:
          await this.handleTypingIndicator(clientId, false);
          break;

        case MessageType.PING:
          this.sendToClient(clientId, { type: MessageType.PONG, payload: {} });
          break;

        default:
          logger.warn('Unknown message type', { messageType: message.type, clientId });
      }
    } catch (error) {
      logger.error('Failed to parse message', { clientId, error });
      this.sendToClient(clientId, {
        type: MessageType.ERROR,
        payload: { error: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(clientId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timestamp = Date.now();

    // Persist message to database
    await this.persistMessage({
      sessionId: client.sessionId,
      userId: client.userId,
      content: message.payload as string,
      timestamp,
    });

    // Broadcast via Redis for multi-instance support
    await this.redis.publish(
      'chat:broadcast',
      JSON.stringify({
        sessionId: client.sessionId,
        message: {
          type: MessageType.CHAT_MESSAGE,
          payload: {
            messageId,
            userId: client.userId,
            content: message.payload,
            timestamp,
          },
        },
      })
    );

    // Send ACK to sender
    this.sendToClient(clientId, {
      type: MessageType.ACK,
      payload: { messageId },
    });
  }

  /**
   * Handle typing indicator
   */
  private async handleTypingIndicator(clientId: string, isTyping: boolean): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { sessionId, userId } = client;

    if (!this.typingUsers.has(sessionId)) {
      this.typingUsers.set(sessionId, new Set());
    }

    const typingSet = this.typingUsers.get(sessionId)!;

    if (isTyping) {
      typingSet.add(userId);
    } else {
      typingSet.delete(userId);
    }

    // Broadcast via Redis
    await this.redis.publish(
      'chat:typing',
      JSON.stringify({
        sessionId,
        userId,
        isTyping,
      })
    );
  }

  /**
   * Handle Redis pub/sub messages
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'chat:broadcast':
          this.broadcastToSession(data.sessionId, data.message);
          break;

        case 'chat:typing':
          this.broadcastToSession(data.sessionId, {
            type: data.isTyping ? MessageType.USER_TYPING : MessageType.USER_STOPPED_TYPING,
            payload: { userId: data.userId },
          });
          break;

        case 'chat:presence':
          // Handle presence updates
          break;
      }
    } catch (error) {
      logger.error('Failed to parse Redis message', { error });
    }
  }

  /**
   * Broadcast message to all clients in a session
   */
  private broadcastToSession(
    sessionId: string,
    message: WSMessage,
    excludeClientId?: string
  ): void {
    for (const [clientId, client] of this.clients) {
      if (client.sessionId === sessionId && clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(
        JSON.stringify({
          ...message,
          timestamp: message.timestamp || Date.now(),
        })
      );
    } catch (error) {
      logger.error('Failed to send message', { clientId, error });
      this.handleDisconnect(clientId);
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.info('Client disconnected', { clientId });

    // Remove from typing indicators
    const typingSet = this.typingUsers.get(client.sessionId);
    if (typingSet) {
      typingSet.delete(client.userId);
    }

    // Broadcast user left
    await this.redis.publish(
      'chat:presence',
      JSON.stringify({
        sessionId: client.sessionId,
        userId: client.userId,
        action: 'left',
      })
    );

    this.broadcastToSession(
      client.sessionId,
      {
        type: MessageType.USER_LEFT,
        payload: { userId: client.userId },
      },
      clientId
    );

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000;

    setInterval(() => {
      const now = Date.now();

      for (const [clientId, client] of this.clients) {
        // Close stale connections (no activity for 2 minutes)
        if (now - client.lastActivity > 120000) {
          logger.info('Closing stale connection', { clientId, lastActivity: client.lastActivity });
          client.ws.close();
          this.handleDisconnect(clientId);
          continue;
        }

        // Send ping
        this.sendToClient(clientId, {
          type: MessageType.PING,
          payload: {},
        });
      }
    }, interval);
  }

  /**
   * Verify Auth.js session token and extract user data
   */
  private async verifySessionToken(
    sessionToken: string
  ): Promise<{ userId: string; tenantId: string } | null> {
    try {
      if (!sessionToken) return null;

      // Look up session in auth_sessions table
      const sessionResults = await this.db
        .select({
          userId: authSessions.userId,
          expires: authSessions.expires,
        })
        .from(authSessions)
        .where(eq(authSessions.sessionToken, sessionToken))
        .limit(1);

      if (sessionResults.length === 0) {
        return null;
      }

      const session = sessionResults[0];
      if (!session) {
        return null;
      }

      // Check if session has expired
      if (session.expires && new Date(session.expires) < new Date()) {
        return null;
      }

      // Get user's tenant ID
      const userResults = await this.db
        .select({
          tenantId: users.tenantId,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      const user = userResults[0];
      if (!user) {
        return null;
      }

      return {
        userId: session.userId,
        tenantId: user.tenantId,
      };
    } catch (error) {
      logger.error('Session verification failed', { error });
      return null;
    }
  }

  /**
   * Persist chat message to database
   */
  private async persistMessage(data: {
    sessionId: string;
    userId: string;
    content: string;
    timestamp: number;
  }): Promise<void> {
    try {
      await this.db.insert(messages).values({
        sessionId: data.sessionId,
        role: 'user', // Real-time messages are always from users
        content: data.content,
        metadata: {} as Record<string, unknown>, // WebSocket messages don't have AI metadata
      });
    } catch (error) {
      logger.error('Failed to persist message', { error });
      // Don't throw - message was already sent, just log the error
    }
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down server');

    // Close all client connections
    for (const [_clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
    }

    // Close Redis connections
    await this.redis.quit();
    await this.redisSub.quit();

    logger.info('Server shut down successfully');
  }
}
