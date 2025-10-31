/**
 * Chat Widget - Floating AI Assistant
 * Bottom-right chatbot with three-tier AI routing and RAG integration
 */

import { createModuleLogger } from '@platform/shared';
import { Badge, Button, Card, CardContent, Input } from '@platform/ui';
import {
  Bot,
  Loader2,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  Target,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('ChatWidget');

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
    ragChunksRetrieved?: number;
    ragProcessingTimeMs?: number;
    ragTopRelevance?: 'high' | 'medium' | 'low' | 'none';
  };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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

  // Initialize session when widget opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      const initSession = async () => {
        try {
          const session = await createSession.mutateAsync({
            mode: 'text',
            metadata: {
              userAgent: navigator.userAgent,
              widgetMode: true,
            },
          });
          setSessionId(session.id);
        } catch (error) {
          logger.error('Failed to create session', { error });
        }
      };

      initSession();
    }
  }, [isOpen, sessionId]);

  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.messages) {
      const msgs = messagesData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata || undefined,
      }));
      setMessages(msgs);
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
      logger.error('Failed to send message', { error });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Widget Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all ${
            isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 w-96 h-[600px]'
          } flex flex-col bg-background border border-border rounded-lg shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {isMinimized ? 'Click to expand' : 'Always here to help'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content - Only show when not minimized */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bot className="w-12 h-12 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Welcome! 👋</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      I'm your AI assistant with three-tier routing and RAG integration.
                    </p>
                    <div className="space-y-1 text-xs">
                      <Badge variant="outline" className="w-full justify-start">
                        <Sparkles className="w-3 h-3 mr-2" />
                        Gemini Flash-Lite 8B (60%)
                      </Badge>
                      <Badge variant="outline" className="w-full justify-start">
                        <Sparkles className="w-3 h-3 mr-2" />
                        Gemini Flash (25%)
                      </Badge>
                      <Badge variant="outline" className="w-full justify-start">
                        <Sparkles className="w-3 h-3 mr-2" />
                        Claude Sonnet 4.5 (15%)
                      </Badge>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <Card
                        className={`${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border-border'
                        }`}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Metadata below message for assistant */}
                      {message.metadata && message.role === 'assistant' && (
                        <div className="px-2 space-y-0.5">
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {message.metadata.model && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {message.metadata.model}**
                              </span>
                            )}
                            {message.metadata.tokensUsed && (
                              <span>{message.metadata.tokensUsed} tokens</span>
                            )}
                            {message.metadata.costUsd && (
                              <span>${message.metadata.costUsd.toFixed(6)}</span>
                            )}
                            {message.metadata.latencyMs && (
                              <span>{message.metadata.latencyMs}ms</span>
                            )}
                          </div>
                          {message.metadata.ragChunksRetrieved !== undefined &&
                            message.metadata.ragChunksRetrieved > 0 && (
                              <div className="flex flex-wrap gap-2 text-xs text-blue-600 dark:text-blue-400">
                                <span className="flex items-center gap-1">
                                  📚 RAG: {message.metadata.ragChunksRetrieved} chunks***
                                </span>
                                {message.metadata.ragProcessingTimeMs && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" />{' '}
                                    {message.metadata.ragProcessingTimeMs}ms
                                  </span>
                                )}
                                {message.metadata.ragTopRelevance &&
                                  message.metadata.ragTopRelevance !== 'none' && (
                                    <span className="flex items-center gap-1">
                                      <Target className="w-3 h-3" />{' '}
                                      {message.metadata.ragTopRelevance} relevance
                                    </span>
                                  )}
                              </div>
                            )}
                        </div>
                      )}
                    </div>

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
              <div className="border-t border-border p-3">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading || !sessionId}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !sessionId || !input.trim()}
                    size="sm"
                    className="px-3"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
