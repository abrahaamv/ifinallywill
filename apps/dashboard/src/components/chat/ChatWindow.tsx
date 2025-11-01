/**
 * Chat Window Component (Phase 6 - Real-time Chat)
 *
 * Main chat interface with WebSocket integration, message history,
 * typing indicators, and presence tracking.
 */

import { useWebSocket } from '../../hooks/useWebSocket';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';

export interface ChatWindowProps {
  sessionId: string;
  wsUrl?: string;
  onClose?: () => void;
}

export function ChatWindow({ sessionId, wsUrl, onClose }: ChatWindowProps) {
  const {
    messages,
    isConnected,
    isReconnecting,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
    error,
  } = useWebSocket({
    sessionId,
    url: wsUrl,
  });

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected
                  ? 'bg-green-500'
                  : isReconnecting
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <h2 className="text-lg font-semibold text-foreground">
              {isConnected ? 'Chat' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
            </h2>
          </div>

          {/* Online users count */}
          {onlineUsers.size > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>{onlineUsers.size} online</span>
            </div>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-muted-foreground transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        typingUsers={typingUsers}
        currentUserId="me"
        isLoading={false}
        autoScroll={true}
      />

      {/* Input */}
      <MessageInput
        onSendMessage={sendMessage}
        onTyping={sendTyping}
        disabled={!isConnected}
        placeholder={isConnected ? 'Type a message...' : 'Waiting for connection...'}
      />
    </div>
  );
}
