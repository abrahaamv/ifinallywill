/**
 * useVKAgent Hook
 * Provides VK-Agent AI functionality to meeting components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  checkAgentHealth,
  getAgentStatus,
  sendText,
  sendScreenFrame,
  captureScreenFrame,
  type AgentStatus,
} from '../lib/vk-agent';

export interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
  isError?: boolean;
}

export interface UseVKAgentReturn {
  messages: Message[];
  isAgentOnline: boolean;
  isAgentReady: boolean;
  isSending: boolean;
  isCapturing: boolean;
  agentStatus: AgentStatus | null;
  sendMessage: (text: string) => Promise<void>;
  sendScreenCapture: (stream: MediaStream, prompt?: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  clearMessages: () => void;
}

export function useVKAgent(userName: string = 'User'): UseVKAgentReturn {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'AI Assistant',
      text: "Hello! I'm Jimmy, your AI meeting assistant powered by Gemini. I can see your screen when you share it and help with any questions. Try sharing your screen and asking me what you see!",
      isAI: true,
      timestamp: new Date(),
    },
  ]);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [isAgentReady, setIsAgentReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  const messageIdCounter = useRef(1);

  const generateId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: generateId(),
        timestamp: new Date(),
      },
    ]);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const health = await checkAgentHealth();
      setIsAgentOnline(health.status === 'healthy');

      const status = await getAgentStatus();
      setAgentStatus(status);
      setIsAgentReady(status.running && status.janus.connected);
    } catch (error) {
      setIsAgentOnline(false);
      setIsAgentReady(false);
      setAgentStatus(null);
    }
  }, []);

  // Check agent status on mount and periodically
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      // Add user message
      addMessage({
        sender: userName,
        text: text.trim(),
        isAI: false,
      });

      setIsSending(true);

      try {
        const result = await sendText(text);

        if (result.success && result.response) {
          addMessage({
            sender: 'AI Assistant',
            text: result.response,
            isAI: true,
          });
        } else {
          addMessage({
            sender: 'AI Assistant',
            text: result.error || "I'm having trouble responding right now. The agent may be processing voice audio. Try again in a moment.",
            isAI: true,
            isError: true,
          });
        }
      } catch (error) {
        addMessage({
          sender: 'AI Assistant',
          text: 'Failed to connect to the AI agent. Please check your connection.',
          isAI: true,
          isError: true,
        });
      } finally {
        setIsSending(false);
      }
    },
    [userName, isSending, addMessage]
  );

  const sendScreenCapture = useCallback(
    async (stream: MediaStream, prompt?: string) => {
      if (isCapturing) return;

      setIsCapturing(true);

      // Add status message
      addMessage({
        sender: 'System',
        text: '📸 Capturing screen for AI analysis...',
        isAI: true,
      });

      try {
        const frameBase64 = await captureScreenFrame(stream);

        if (!frameBase64) {
          addMessage({
            sender: 'AI Assistant',
            text: 'Failed to capture screen frame. Please try again.',
            isAI: true,
            isError: true,
          });
          return;
        }

        const result = await sendScreenFrame(
          frameBase64,
          'image/jpeg',
          prompt || 'Please describe what you see on this screen and help me understand it.'
        );

        if (result.success && result.response) {
          addMessage({
            sender: 'AI Assistant',
            text: result.response,
            isAI: true,
          });
        } else {
          addMessage({
            sender: 'AI Assistant',
            text: result.error || 'Failed to analyze the screen. Please try again.',
            isAI: true,
            isError: true,
          });
        }
      } catch (error) {
        addMessage({
          sender: 'AI Assistant',
          text: 'Error analyzing screen. Please check your connection.',
          isAI: true,
          isError: true,
        });
      } finally {
        setIsCapturing(false);
      }
    },
    [isCapturing, addMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'AI Assistant',
        text: "Messages cleared. I'm still here to help! Share your screen or ask me anything.",
        isAI: true,
        timestamp: new Date(),
      },
    ]);
  }, []);

  return {
    messages,
    isAgentOnline,
    isAgentReady,
    isSending,
    isCapturing,
    agentStatus,
    sendMessage,
    sendScreenCapture,
    checkStatus,
    clearMessages,
  };
}
