/**
 * Chat Page - AI-Powered Conversation Interface
 * Three-tier cost-optimized routing with RAG-enhanced responses
 */

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@platform/ui';
import { Bot, DollarSign, Loader2, MessageCircle, Send, Sparkles, User, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { trpc } from '../utils/trpc';

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

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'realtime'>('ai');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session stats*
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    totalCost: 0,
    avgResponseTime: 0,
    ragUsage: 0,
  });

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

  // Update messages and stats when data changes
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

      // Calculate session stats*
      const assistantMessages = msgs.filter((m) => m.role === 'assistant' && m.metadata);
      setSessionStats({
        totalMessages: msgs.length,
        totalCost: assistantMessages.reduce((sum, m) => sum + (m.metadata?.costUsd || 0), 0),
        avgResponseTime:
          assistantMessages.reduce((sum, m) => sum + (m.metadata?.latencyMs || 0), 0) /
            assistantMessages.length || 0,
        ragUsage: assistantMessages.filter((m) => (m.metadata?.ragChunksRetrieved || 0) > 0).length,
      });
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">AI Chat Assistant</h1>
              <p className="text-muted-foreground mt-2">
                Cost-optimized three-tier routing with RAG-enhanced knowledge base integration
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={chatMode === 'ai' ? 'default' : 'outline'}
                onClick={() => setChatMode('ai')}
                className="flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                AI Chat
              </Button>
              <Button
                variant={chatMode === 'realtime' ? 'default' : 'outline'}
                onClick={() => setChatMode('realtime')}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Real-time
              </Button>
            </div>
          </div>

          {/* Session Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Messages</p>
                    <p className="text-2xl font-bold">{sessionStats.totalMessages}*</p>
                  </div>
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Session Cost</p>
                    <p className="text-2xl font-bold">${sessionStats.totalCost.toFixed(4)}*</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-2xl font-bold">{sessionStats.avgResponseTime.toFixed(0)}ms*</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">RAG Enhanced</p>
                    <p className="text-2xl font-bold">{sessionStats.ragUsage}*</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      {chatMode === 'realtime' ? (
        <div className="flex-1 overflow-hidden">
          {sessionId ? (
            <ChatWindow sessionId={sessionId} wsUrl="ws://localhost:3002/ws" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="p-6 max-w-md text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2">Initializing session...</h2>
                <p className="text-sm text-muted-foreground">
                  Setting up WebSocket connection for real-time chat
                </p>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* AI Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <Card className="p-8 max-w-2xl text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h2 className="text-2xl font-semibold mb-2">Start Your Conversation</h2>
                  <p className="text-muted-foreground mb-4">
                    Ask me anything! I use three-tier cost-optimized AI routing with RAG-enhanced
                    responses from your knowledge base.
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-left">
                    <Badge variant="outline" className="justify-start">
                      <Sparkles className="w-3 h-3 mr-2" />
                      Tier 1: Gemini Flash-Lite 8B (60% of queries, $0.075/1M tokens)
                    </Badge>
                    <Badge variant="outline" className="justify-start">
                      <Sparkles className="w-3 h-3 mr-2" />
                      Tier 2: Gemini Flash (25% of queries, $0.20/1M tokens)
                    </Badge>
                    <Badge variant="outline" className="justify-start">
                      <Sparkles className="w-3 h-3 mr-2" />
                      Tier 3: Claude Sonnet 4.5 (15% of queries, $3.00/1M tokens)
                    </Badge>
                  </div>
                </Card>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <Card
                  className={`max-w-[70%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border-border'
                  }`}
                >
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

                    {message.metadata && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <div className="flex flex-wrap gap-3 text-xs opacity-80">
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
                            <span className="font-medium">${message.metadata.costUsd.toFixed(6)}</span>
                          )}
                          {message.metadata.latencyMs && (
                            <span>{message.metadata.latencyMs}ms</span>
                          )}
                        </div>
                        {message.metadata.ragChunksRetrieved !== undefined && (
                          <div className="flex flex-wrap gap-3 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <span>📚 RAG: {message.metadata.ragChunksRetrieved} chunks***</span>
                            {message.metadata.ragProcessingTimeMs && (
                              <span>⚡ {message.metadata.ragProcessingTimeMs}ms</span>
                            )}
                            {message.metadata.ragTopRelevance &&
                              message.metadata.ragTopRelevance !== 'none' && (
                                <span>🎯 {message.metadata.ragTopRelevance} relevance</span>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-6 h-6 text-secondary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* AI Chat Input */}
          <div className="border-t border-border bg-card p-6">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... (AI will route to optimal tier based on complexity)"
                disabled={isLoading || !sessionId}
                className="flex-1 text-base"
              />
              <Button type="submit" disabled={isLoading || !sessionId || !input.trim()} size="lg">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Annotation Footer */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">*</span>
              <p className="text-muted-foreground">
                <strong>Session Metrics:</strong> Message count, cost, and response times are calculated from actual API responses. RAG usage counts messages enhanced with knowledge base context.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">**</span>
              <p className="text-muted-foreground">
                <strong>Three-Tier Routing:</strong> Complexity scoring (0-18 points) routes queries to Gemini Flash-Lite 8B (simple, 60%), Gemini Flash (moderate, 25%), or Claude Sonnet 4.5 (complex, 15%).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">***</span>
              <p className="text-muted-foreground">
                <strong>RAG Integration:</strong> Hybrid retrieval with Voyage Multimodal-3 embeddings, semantic + keyword search, and reranking. Chunks shown with relevance scoring (high/medium/low).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
