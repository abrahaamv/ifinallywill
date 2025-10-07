/**
 * Chat Page (Phase 5 - Week 1)
 * AI-powered chat interface with cost-optimized routing
 */

import { useState, useEffect, useRef } from 'react';
import { trpc } from '../utils/trpc';
import { Button, Input, Card } from '@platform/ui';
import { Loader2, Send, User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    costUsd?: number;
    latencyMs?: number;
  };
}

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create session mutation
  const createSession = trpc.sessions.create.useMutation();

  // Send chat message mutation
  const sendMessage = trpc.chat.sendMessage.useMutation();

  // Load messages query
  const { data: messagesData, refetch: refetchMessages } = trpc.sessions.listMessages.useQuery(
    { sessionId: sessionId || '' },
    { enabled: !!sessionId }
  );

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await createSession.mutateAsync({
          mode: 'text',
          metadata: {
            userAgent: navigator.userAgent,
          },
        });
        setSessionId(session.id);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };

    initSession();
  }, []);

  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(
        messagesData.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata || undefined,
        }))
      );
    }
  }, [messagesData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Send message and get AI response
      const result = await sendMessage.mutateAsync({
        sessionId,
        content: userMessage,
      });

      // Add both user and assistant messages
      setMessages((prev) => [
        ...prev,
        {
          id: result.userMessage.id,
          role: result.userMessage.role,
          content: result.userMessage.content,
          timestamp: new Date(result.userMessage.timestamp),
        },
        {
          id: result.assistantMessage.id,
          role: result.assistantMessage.role,
          content: result.assistantMessage.content,
          timestamp: new Date(result.assistantMessage.timestamp),
          metadata: result.assistantMessage.metadata || undefined,
        },
      ]);

      // Refetch messages to ensure sync
      await refetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">AI Chat Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Cost-optimized AI routing with 75-85% cost reduction
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 max-w-md text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Start a conversation</h2>
              <p className="text-sm text-muted-foreground">
                Ask me anything! I'm powered by cost-optimized AI routing that automatically
                selects the best model for your query.
              </p>
            </Card>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            )}

            <Card
              className={`max-w-[80%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.metadata && (
                <div className="mt-2 pt-2 border-t border-border/50 text-xs opacity-70">
                  <div className="flex gap-4">
                    {message.metadata.model && (
                      <span>Model: {message.metadata.model}</span>
                    )}
                    {message.metadata.tokensUsed && (
                      <span>Tokens: {message.metadata.tokensUsed}</span>
                    )}
                    {message.metadata.costUsd && (
                      <span>Cost: ${message.metadata.costUsd.toFixed(6)}</span>
                    )}
                    {message.metadata.latencyMs && (
                      <span>Latency: {message.metadata.latencyMs}ms</span>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-secondary-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || !sessionId}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !sessionId || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
