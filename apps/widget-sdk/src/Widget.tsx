/**
 * AI Assistant Widget
 * Embeddable chat widget with Shadow DOM isolation
 * Supports customizable theming and position
 */

import { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@platform/ui';
import { createWidgetTRPCClient } from './utils/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WidgetProps {
  apiKey: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  title?: string;
  placeholder?: string;
  greeting?: string;
}

export function Widget({
  apiKey,
  apiUrl = 'http://localhost:3001/trpc',
  position = 'bottom-right',
  theme = 'auto',
  primaryColor = '#6366f1',
  title = 'AI Assistant',
  placeholder = 'Type your message...',
  greeting = 'Hello! How can I help you today?',
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create tRPC client
  const trpcClient = createWidgetTRPCClient(apiKey, apiUrl);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const session = await trpcClient.sessions.create.mutate({
          mode: 'text',
        });
        setSessionId(session.id);
      } catch (err) {
        console.error('Failed to create session:', err);
        setError('Failed to initialize chat. Please check your API key.');
      }
    };

    createSession();
  }, []);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0 && greeting) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [greeting, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Real API call to sessions.sendMessage endpoint with RAG
      const response = await trpcClient.sessions.sendMessage.mutate({
        sessionId,
        role: 'user',
        content: userMessage.content,
      });

      // Response includes userMessage (echo) and assistantMessage (AI response)
      if ('assistantMessage' in response && response.assistantMessage) {
        const assistantMessage: Message = {
          id: response.assistantMessage.id,
          role: 'assistant',
          content: response.assistantMessage.content,
          timestamp: new Date(response.assistantMessage.timestamp),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 animate-slideUp">
          <Card className="h-[500px] w-[350px] shadow-2xl">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-2">
                <div
                  className="h-3 w-3 rounded-full bg-green-500"
                  style={{ backgroundColor: primaryColor }}
                />
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </CardHeader>

            {/* Error Banner */}
            {error && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Messages */}
            <CardContent className="flex h-[350px] flex-col space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    style={
                      message.role === 'user'
                        ? { backgroundColor: primaryColor, color: 'white' }
                        : undefined
                    }
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <Badge variant="secondary">AI is typing...</Badge>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Toggle Button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-2xl"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </Button>
    </div>
  );
}
