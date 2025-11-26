/**
 * ChatMode Component
 *
 * Text chat interface for the unified widget.
 * Extracted from ChatWidget with personality-aware messaging.
 */

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Send, Monitor, Loader2 } from 'lucide-react';
import { Button, Input } from '@platform/ui';
import { trpc } from '../../utils/trpc';
import { useEmbeddableWidget } from './EmbeddableWidgetContext';
import { MessageDebugPanel } from '../chat/MessageDebugPanel';
import type { MessageMetadata } from '../../types/message';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

interface ChatModeProps {
  onSessionCreated: (sessionId: string) => void;
  onShareScreen: () => void;
  showShareButton?: boolean;
  showDeveloperInfo?: boolean;
}

export function ChatMode({
  onSessionCreated,
  onShareScreen,
  showShareButton = true,
  showDeveloperInfo = false,
}: ChatModeProps) {
  const { sessionId, personality, widget, mode } = useEmbeddableWidget();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create session if needed
  const createSession = trpc.sessions.create.useMutation();

  // Fetch existing messages when session changes
  const { data: existingMessages } = trpc.sessions.listMessages.useQuery(
    { sessionId: sessionId!, limit: 50 },
    { enabled: !!sessionId }
  );

  // Send message mutation (uses chat router which now has personality support)
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add user message
      if (data.userMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.userMessage.id,
            role: data.userMessage.role as 'user' | 'assistant',
            content: data.userMessage.content,
            timestamp: new Date(data.userMessage.timestamp),
          },
        ]);
      }
      // Add assistant message with metadata
      if (data.assistantMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.assistantMessage.id,
            role: 'assistant',
            content: data.assistantMessage.content,
            timestamp: new Date(data.assistantMessage.timestamp),
            metadata: data.assistantMessage.metadata as MessageMetadata | undefined,
          },
        ]);
      }
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  // Load existing messages when session loads
  useEffect(() => {
    if (existingMessages?.messages) {
      setMessages(
        existingMessages.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata as MessageMetadata | undefined,
        }))
      );
    }
  }, [existingMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Greeting is displayed in UI when there are no messages
  // No need to track it in state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const content = inputValue.trim();
    setInputValue('');

    // Create session if we don't have one
    let currentSessionId = sessionId;
    if (!currentSessionId && widget) {
      try {
        const result = await createSession.mutateAsync({
          widgetId: widget.id,
          mode: 'text',
        });
        currentSessionId = result.id;
        onSessionCreated(result.id);
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    if (!currentSessionId) return;

    setIsTyping(true);

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content,
        timestamp: new Date(),
      },
    ]);

    try {
      await sendMessage.mutateAsync({
        sessionId: currentSessionId,
        content,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const greeting = widget?.settings?.greeting || personality?.description || 'Hello! How can I help you today?';

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        {/* Greeting */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <span className="text-2xl">
                {personality?.name?.charAt(0) || '🤖'}
              </span>
            </div>
            <h3 className="font-medium text-foreground mb-1">
              {personality?.name || 'AI Assistant'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {greeting}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
              {/* Developer Info Panel */}
              {showDeveloperInfo && message.role === 'assistant' && message.metadata && (
                <div className="mt-1 ml-0 mr-[20%]">
                  <MessageDebugPanel metadata={message.metadata} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={isTyping || mode === 'transitioning'}
            className="flex-1"
          />
          {showShareButton && widget?.settings?.enableScreenShare && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onShareScreen}
              disabled={isTyping || mode === 'transitioning' || !sessionId}
              title="Share Screen"
            >
              <Monitor className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isTyping || mode === 'transitioning'}
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
