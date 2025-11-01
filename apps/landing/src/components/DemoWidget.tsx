/**
 * Landing Page Demo Widget
 * Time-limited, cost-optimized chatbot for lead generation
 * Phase 11 Week 5
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@platform/ui/components/button';
import { Card } from '@platform/ui/components/card';
import { Input } from '@platform/ui/components/input';
import { Label } from '@platform/ui/components/label';

interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DemoWidgetProps {
  maxDurationMs?: number; // Default 5 minutes
  onLeadCapture?: (email: string, name?: string) => void;
}

const PRE_LOADED_RESPONSES = {
  greeting: "Hi! I'm your AI assistant demo. I can help answer questions about our platform. What would you like to know?",
  features: "Our platform offers: 1) Real-time AI video chat, 2) Multi-modal understanding (voice, vision, text), 3) Knowledge base integration, 4) Cost-optimized AI routing. Try asking about any specific feature!",
  pricing: "We offer flexible pricing tiers: Starter ($49/mo), Professional ($199/mo), and Enterprise (custom). Each tier includes different agent hours and features. Would you like to schedule a demo to discuss your needs?",
  demo_request: "Great! I'd love to set up a personalized demo. Can you share your email address so our team can reach out?",
  default: "That's a great question! To get a detailed answer and explore our full capabilities, I'd recommend scheduling a demo with our team. Can I collect your email to set that up?",
};

export function DemoWidget({
  maxDurationMs = 5 * 60 * 1000, // 5 minutes
  onLeadCapture
}: DemoWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(maxDurationMs);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [leadCaptureMode, setLeadCaptureMode] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadName, setLeadName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer management
  useEffect(() => {
    if (isOpen && sessionStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime.getTime();
        const remaining = Math.max(0, maxDurationMs - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          handleSessionExpired();
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isOpen, sessionStartTime, maxDurationMs]);

  const handleOpen = () => {
    setIsOpen(true);
    setSessionStartTime(new Date());
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: PRE_LOADED_RESPONSES.greeting,
        timestamp: new Date(),
      },
    ]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setTimeRemaining(maxDurationMs);
    setSessionStartTime(null);
    setLeadCaptureMode(false);
    setLeadEmail('');
    setLeadName('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSessionExpired = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `expired-${Date.now()}`,
        role: 'assistant',
        content: "Your demo session has ended. To continue exploring our platform, please schedule a full demo with our team!",
        timestamp: new Date(),
      },
    ]);
    setLeadCaptureMode(true);
  };

  const getResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('feature') || lowerMessage.includes('capability')) {
      return PRE_LOADED_RESPONSES.features;
    }
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      return PRE_LOADED_RESPONSES.pricing;
    }
    if (lowerMessage.includes('demo') || lowerMessage.includes('try') || lowerMessage.includes('schedule')) {
      setLeadCaptureMode(true);
      return PRE_LOADED_RESPONSES.demo_request;
    }

    return PRE_LOADED_RESPONSES.default;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || timeRemaining === 0) return;

    const userMessage: DemoMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay (200-800ms)
    const typingDelay = Math.random() * 600 + 200;
    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    const responseContent = getResponse(userMessage.content);
    const assistantMessage: DemoMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleLeadSubmit = () => {
    if (!leadEmail.trim()) return;

    onLeadCapture?.(leadEmail, leadName || undefined);

    setMessages((prev) => [
      ...prev,
      {
        id: `lead-${Date.now()}`,
        role: 'assistant',
        content: `Thank you, ${leadName || 'there'}! Our team will reach out to ${leadEmail} shortly to schedule your personalized demo.`,
        timestamp: new Date(),
      },
    ]);

    setLeadCaptureMode(false);
  };

  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
        aria-label="Try Live Demo"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          !
        </span>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Assistant Demo</h3>
          <p className="text-xs opacity-90">
            Time remaining: {formatTimeRemaining()}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="hover:bg-blue-700 rounded p-1 transition-colors"
          aria-label="Close demo"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Lead Capture Form */}
      {leadCaptureMode && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <Label htmlFor="lead-name" className="text-sm font-semibold mb-2">
            Get a Personalized Demo
          </Label>
          <Input
            id="lead-name"
            type="text"
            placeholder="Your name (optional)"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            className="mb-2"
          />
          <Input
            id="lead-email"
            type="email"
            placeholder="Your email *"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            className="mb-2"
          />
          <Button
            onClick={handleLeadSubmit}
            disabled={!leadEmail.trim()}
            className="w-full"
          >
            Schedule Demo
          </Button>
        </div>
      )}

      {/* Input Area */}
      {!leadCaptureMode && (
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder={
                timeRemaining === 0
                  ? 'Session expired'
                  : 'Type your message...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={timeRemaining === 0}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || timeRemaining === 0}
            >
              Send
            </Button>
          </div>
          {timeRemaining <= 60000 && timeRemaining > 0 && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ Less than 1 minute remaining in demo
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
