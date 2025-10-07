/**
 * Message List Component (Phase 6 - Real-time Chat)
 *
 * Displays chat messages with auto-scroll, typing indicators, and presence.
 */

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../hooks/useWebSocket';

export interface MessageListProps {
  messages: ChatMessage[];
  typingUsers?: Set<string>;
  currentUserId?: string;
  isLoading?: boolean;
  autoScroll?: boolean;
}

export function MessageList({
  messages,
  typingUsers = new Set(),
  currentUserId = 'me',
  isLoading = false,
  autoScroll = true,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  // Check if message is from current user
  const isOwnMessage = (message: ChatMessage): boolean => {
    return message.userId === currentUserId;
  };

  // Get status indicator
  const getStatusIndicator = (status?: ChatMessage['status']): string => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start a conversation by sending a message</p>
        </div>
      )}

      {messages.map((message, index) => {
        const isOwn = isOwnMessage(message);
        const showAvatar = index === 0 || messages[index - 1]?.userId !== message.userId;

        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex gap-2 max-w-[70%] ${
                isOwn ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              {showAvatar && (
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    isOwn ? 'bg-blue-600' : 'bg-gray-400'
                  }`}
                >
                  {message.userId.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`flex flex-col ${
                  isOwn ? 'items-end' : 'items-start'
                } ${!showAvatar ? 'ml-10' : ''}`}
              >
                {/* User name (only for other users' first message) */}
                {!isOwn && showAvatar && (
                  <div className="text-xs text-gray-500 mb-1 px-1">
                    {message.userId}
                  </div>
                )}

                {/* Message content */}
                <div
                  className={`rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                {/* Timestamp and status */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {isOwn && message.status && (
                    <span className="text-xs">
                      {getStatusIndicator(message.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing indicators */}
      {typingUsers.size > 0 && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-sm text-gray-500">
              {typingUsers.size === 1
                ? `${Array.from(typingUsers)[0]} is typing`
                : `${typingUsers.size} users are typing`}
            </span>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
