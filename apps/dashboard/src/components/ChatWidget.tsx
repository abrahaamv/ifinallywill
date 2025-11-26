/**
 * Chat Widget - Floating AI Assistant
 * Bottom-right chatbot with three-tier AI routing and RAG integration
 */

import { createModuleLogger } from '../utils/logger';
import { Badge, Button, Card, CardContent, Input } from '@platform/ui';
import {
  Bot,
  Loader2,
  MessageCircle,
  Minimize2,
  Paperclip,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types/message';
import { trpc } from '../utils/trpc';
import { MessageDebugPanel } from './chat/MessageDebugPanel';

const logger = createModuleLogger('ChatWidget');

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create session mutation
  const createSession = trpc.sessions.create.useMutation();

  // Send chat message mutation
  const sendMessage = trpc.chat.sendMessage.useMutation();

  // Upload file mutation
  const uploadFile = trpc.chat.uploadChatFile.useMutation();

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
        metadata: msg.metadata as Message['metadata'],
      }));
      setMessages(msgs);
    }
  }, [messagesData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if ((!input.trim() && !selectedFile) || !sessionId || isLoading) return;

    const userMessage = input.trim();
    let fileName: string | null = null;

    setInput('');
    setIsLoading(true);

    try {
      // Upload file first if selected
      if (selectedFile) {
        setIsUploadingFile(true);

        // Read file as base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:image/png;base64,)
            const base64 = result.split(',')[1] || '';
            if (!base64) {
              reject(new Error('Failed to read file data'));
              return;
            }
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const uploadResult = await uploadFile.mutateAsync({
          sessionId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileContent: fileData,
        });

        fileName = uploadResult.fileName;
        setIsUploadingFile(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      // Send message with optional file attachment
      const messageContent = fileName
        ? `${userMessage}\n\n[Attached: ${fileName}]`
        : userMessage;

      const result = await sendMessage.mutateAsync({
        sessionId,
        content: messageContent,
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
          metadata: result.assistantMessage.metadata as Message['metadata'],
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
      setIsUploadingFile(false);
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

                      {/* Developer Info Panel */}
                      {message.metadata && message.role === 'assistant' && (
                        <div className="px-2">
                          <MessageDebugPanel metadata={message.metadata} />
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
                {/* File attachment preview */}
                {selectedFile && (
                  <div className="mb-2 flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.md"
                  />

                  {/* File attach button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || !sessionId}
                    className="px-2"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading || !sessionId}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !sessionId || (!input.trim() && !selectedFile)}
                    size="sm"
                    className="px-3"
                  >
                    {isLoading || isUploadingFile ? (
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
