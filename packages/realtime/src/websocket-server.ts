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

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import Redis from 'ioredis';

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

  // Typing indicator tracking
  private typingUsers: Map<string, Set<string>> = new Map(); // sessionId -> Set<userId>

  constructor(
    private readonly config: {
      port?: number;
      redisUrl: string;
      heartbeatInterval?: number;
    }
  ) {
    this.serverId = `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Initialize Redis connections
    this.redis = new Redis(config.redisUrl);
    this.redisSub = new Redis(config.redisUrl);
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
    await this.redisSub.subscribe(
      'chat:broadcast',
      'chat:typing',
      'chat:presence'
    );

    this.redisSub.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    // Handle new connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    console.log(`[WebSocket] Server initialized (${this.serverId})`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage | undefined): void {
    if (!request) {
      ws.close(1008, 'Missing request object');
      return;
    }
    // Extract auth from query params or headers
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token') || '';
    const sessionId = url.searchParams.get('sessionId') || '';

    // TODO: Verify token with auth service
    // For now, extract userId and tenantId from token (mock)
    const userId = this.extractUserIdFromToken(token);
    const tenantId = this.extractTenantIdFromToken(token);

    if (!userId || !tenantId) {
      ws.close(1008, 'Authentication required');
      return;
    }

    const clientId = `${userId}-${Date.now()}`;

    // Store client connection
    this.clients.set(clientId, {
      ws,
      userId,
      tenantId,
      sessionId,
      lastActivity: Date.now(),
    });

    console.log(`[WebSocket] Client connected: ${clientId} (${userId})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: MessageType.ACK,
      payload: { connected: true, serverId: this.serverId },
    });

    // Broadcast user joined
    this.broadcastToSession(sessionId, {
      type: MessageType.USER_JOINED,
      payload: { userId, sessionId },
    }, clientId);

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
      console.error(`[WebSocket] Client error (${clientId}):`, error);
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
          console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error);
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

    // TODO: Persist message to database
    // await this.persistMessage({
    //   id: messageId,
    //   sessionId: client.sessionId,
    //   userId: client.userId,
    //   tenantId: client.tenantId,
    //   content: message.payload,
    //   timestamp,
    // });

    // Broadcast via Redis for multi-instance support
    await this.redis.publish('chat:broadcast', JSON.stringify({
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
    }));

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
    await this.redis.publish('chat:typing', JSON.stringify({
      sessionId,
      userId,
      isTyping,
    }));
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
      console.error(`[WebSocket] Failed to parse Redis message:`, error);
    }
  }

  /**
   * Broadcast message to all clients in a session
   */
  private broadcastToSession(sessionId: string, message: WSMessage, excludeClientId?: string): void {
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
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error(`[WebSocket] Failed to send message to ${clientId}:`, error);
      this.handleDisconnect(clientId);
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`[WebSocket] Client disconnected: ${clientId}`);

    // Remove from typing indicators
    const typingSet = this.typingUsers.get(client.sessionId);
    if (typingSet) {
      typingSet.delete(client.userId);
    }

    // Broadcast user left
    await this.redis.publish('chat:presence', JSON.stringify({
      sessionId: client.sessionId,
      userId: client.userId,
      action: 'left',
    }));

    this.broadcastToSession(client.sessionId, {
      type: MessageType.USER_LEFT,
      payload: { userId: client.userId },
    }, clientId);

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
          console.log(`[WebSocket] Closing stale connection: ${clientId}`);
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
   * Extract user ID from token (mock implementation)
   */
  private extractUserIdFromToken(token: string): string | null {
    // TODO: Implement actual JWT verification
    if (!token) return null;
    return `user_${token.substring(0, 8)}`;
  }

  /**
   * Extract tenant ID from token (mock implementation)
   */
  private extractTenantIdFromToken(token: string): string | null {
    // TODO: Implement actual JWT verification
    if (!token) return null;
    return `tenant_${token.substring(0, 8)}`;
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[WebSocket] Shutting down server...');

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

    console.log('[WebSocket] Server shut down successfully');
  }
}
