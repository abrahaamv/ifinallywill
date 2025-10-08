/**
 * WebSocket Hook for Real-time Chat (Phase 6)
 *
 * Manages WebSocket connection with automatic reconnection,
 * message handling, typing indicators, and presence tracking.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export enum MessageType {
  CHAT_MESSAGE = 'chat_message',
  CHAT_HISTORY = 'chat_history',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_TYPING = 'user_typing',
  USER_STOPPED_TYPING = 'user_stopped_typing',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
  ACK = 'ack',
}

export interface WSMessage {
  type: MessageType;
  payload: any;
  messageId?: string;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
}

export interface UseWebSocketOptions {
  sessionId: string;
  url?: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface UseWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isReconnecting: boolean;
  typingUsers: Set<string>;
  onlineUsers: Set<string>;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    sessionId,
    url = 'ws://localhost:3002/ws',
    reconnectInterval = 5000,
    heartbeatInterval = 30000,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setInterval>>();
  const pendingMessagesRef = useRef<Map<string, ChatMessage>>(new Map());

  // Connect to WebSocket server
  const connect = useCallback(() => {
    try {
      // Auth.js session cookie is automatically sent with WebSocket connection
      const wsUrl = `${url}?sessionId=${sessionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);

        // Resend pending messages
        for (const [messageId, message] of pendingMessagesRef.current) {
          ws.send(JSON.stringify({
            type: MessageType.CHAT_MESSAGE,
            payload: message.content,
            messageId,
          }));
        }

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        stopHeartbeat();

        // Attempt reconnection
        if (!isReconnecting) {
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      setError('Failed to connect to WebSocket server');
      setIsReconnecting(true);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    }
  }, [url, token, sessionId, reconnectInterval, isReconnecting]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case MessageType.CHAT_MESSAGE:
        const chatMessage: ChatMessage = {
          id: message.payload.messageId || `msg_${Date.now()}`,
          userId: message.payload.userId || message.userId || 'unknown',
          content: message.payload.content || message.payload,
          timestamp: message.payload.timestamp || message.timestamp || Date.now(),
          status: 'sent',
        };
        setMessages((prev) => [...prev, chatMessage]);
        break;

      case MessageType.ACK:
        // Mark message as sent
        if (message.payload.messageId) {
          pendingMessagesRef.current.delete(message.payload.messageId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.payload.messageId
                ? { ...msg, status: 'sent' as const }
                : msg
            )
          );
        }
        break;

      case MessageType.USER_JOINED:
        setOnlineUsers((prev) => new Set([...prev, message.payload.userId]));
        break;

      case MessageType.USER_LEFT:
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(message.payload.userId);
          return next;
        });
        break;

      case MessageType.USER_TYPING:
        setTypingUsers((prev) => new Set([...prev, message.payload.userId]));
        break;

      case MessageType.USER_STOPPED_TYPING:
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(message.payload.userId);
          return next;
        });
        break;

      case MessageType.PING:
        // Respond with pong
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: MessageType.PONG, payload: {} }));
        }
        break;

      case MessageType.ERROR:
        console.error('[WebSocket] Server error:', message.payload);
        setError(message.payload.error || 'Unknown server error');
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
    }
  }, []);

  // Start heartbeat to detect connection issues
  const startHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: MessageType.PING, payload: {} }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }
  }, []);

  // Send chat message
  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected');
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const message: ChatMessage = {
      id: messageId,
      userId: 'me',
      content,
      timestamp: Date.now(),
      status: 'sending',
    };

    // Add to local messages immediately
    setMessages((prev) => [...prev, message]);

    // Add to pending messages
    pendingMessagesRef.current.set(messageId, message);

    // Send to server
    wsRef.current.send(JSON.stringify({
      type: MessageType.CHAT_MESSAGE,
      payload: content,
      messageId,
    }));
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? MessageType.USER_TYPING : MessageType.USER_STOPPED_TYPING,
        payload: {},
      }));
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, stopHeartbeat]);

  return {
    messages,
    isConnected,
    isReconnecting,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
    clearMessages,
    error,
  };
}
