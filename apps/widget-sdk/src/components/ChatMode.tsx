/**
 * ChatMode Component
 *
 * Text chat interface for the widget.
 * Supports personality-aware messaging and screen share transition.
 */

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { Button, Input } from '@platform/ui';
import { useWidgetContext } from './WidgetContext';
import { createWidgetTRPCClient } from '../utils/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatModeProps {
  onSessionCreated: (sessionId: string) => void;
  onShareScreen: () => void;
  showShareButton?: boolean;
}

export function ChatMode({ onSessionCreated, onShareScreen, showShareButton = true }: ChatModeProps) {
  const { sessionId, personality, widget, mode, apiUrl, apiKey } = useWidgetContext();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create tRPC client
  const trpcClient = createWidgetTRPCClient(apiKey, apiUrl);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const content = inputValue.trim();
    setInputValue('');

    // Create session if we don't have one
    let currentSessionId = sessionId;
    if (!currentSessionId && widget) {
      try {
        const result = await trpcClient.sessions.create.mutate({
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
      const response = await trpcClient.chat.sendMessage.mutate({
        sessionId: currentSessionId,
        content,
      });

      // Remove temp message and add actual messages
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      if (response.userMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: response.userMessage.id,
            role: response.userMessage.role as 'user' | 'assistant',
            content: response.userMessage.content,
            timestamp: new Date(response.userMessage.timestamp),
          },
        ]);
      }

      if (response.assistantMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: response.assistantMessage.id,
            role: 'assistant',
            content: response.assistantMessage.content,
            timestamp: new Date(response.assistantMessage.timestamp),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsTyping(false);
    }
  };

  const greeting = widget?.settings?.greeting || personality?.description || 'Hello! How can I help you today?';
  const primaryColor = widget?.settings?.primaryColor || '#6366f1';

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        {/* Greeting */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
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
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'text-white'
                    : 'bg-muted text-foreground'
                }`}
                style={message.role === 'user' ? { backgroundColor: primaryColor } : undefined}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isTyping || mode === 'transitioning'}
            style={{ backgroundColor: primaryColor }}
          >
            {isTyping ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
