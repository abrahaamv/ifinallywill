/**
 * Landing Page Demo Widget
 * Dark theme, time-limited chatbot with video call option
 * Phase 11 Week 5 - Enhanced for Agent Deployment Platform
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@platform/ui/components/button';
import { Input } from '@platform/ui/components/input';
import { Label } from '@platform/ui/components/label';
import { MessageSquare, X, Send, Video, Sparkles } from 'lucide-react';
import { appUrls } from '../config/urls';

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
  greeting: "Hi! I'm the VisualKit AI assistant. I can help you understand our platform — from the free chatbot widget to AI-powered video meetings. What would you like to know?",
  features: "VisualKit offers 3 deployment options:\n\n1. **Free Widget** - Embed AI chat on any website\n2. **Support Desk** - Full customer service with human escalation\n3. **AI Meetings** - Video calls where AI joins as a participant\n\nAll three share the same AI brain you configure once. Want to know more about any of these?",
  widget: "Our **Free Widget** is an AI chatbot you embed with a single script tag:\n\n• Shadow DOM isolation (no CSS conflicts)\n• Screen sharing built-in\n• 52-86KB gzipped bundle\n• Voice + vision + text\n\nIt's free forever for small teams. Would you like the embed code?",
  meetings: "**AI Meetings** is our Zoom alternative where AI joins as a participant:\n\n• AI sees shared screens in real-time\n• Voice + vision + text unified\n• Scheduling & recording (premium)\n• Multi-participant rooms\n\nWant to try a demo meeting with our AI? Click 'Join Video Call' below!",
  support: "**Support Desk** is our full customer service platform:\n\n• AI handles 70% of tickets automatically\n• Seamless handoff to human agents\n• Full conversation history & context\n• Powered by open-source Chatwoot\n\nPerfect for teams that need both AI and human support.",
  pricing: "We offer flexible pricing:\n\n**Free**: 100 chats/mo, 1 agent, 3 meetings/week\n**Pro**: 2,000 chats/mo, 10 agents, unlimited meetings\n**Enterprise**: Unlimited everything + white-label\n\nWant to schedule a call to discuss your needs?",
  demo_request: "I'd love to show you more! You can:\n\n1. **Join a video call** with me right now (click 'Join Video Call' below)\n2. **Schedule a demo** with our team\n3. **Start free** and explore on your own\n\nWhat works best for you?",
  default: "Great question! I can help with:\n\n• How our 3 products work together\n• Pricing and plans\n• Technical capabilities\n• Live demo of our AI\n\nOr click 'Join Video Call' to see our AI Meetings in action!",
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
  const [messageCount, setMessageCount] = useState(0);
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
    setMessageCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSessionExpired = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `expired-${Date.now()}`,
        role: 'assistant',
        content: "Your demo session has ended. To continue exploring VisualKit:\n\n• **Join a video call** with our AI\n• **Sign up free** and deploy your own agent\n• **Schedule a demo** with our team",
        timestamp: new Date(),
      },
    ]);
    setLeadCaptureMode(true);
  };

  const getResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('feature') || lowerMessage.includes('what can') || lowerMessage.includes('products')) {
      return PRE_LOADED_RESPONSES.features;
    }
    if (lowerMessage.includes('widget') || lowerMessage.includes('chat') || lowerMessage.includes('embed')) {
      return PRE_LOADED_RESPONSES.widget;
    }
    if (lowerMessage.includes('meeting') || lowerMessage.includes('video') || lowerMessage.includes('zoom') || lowerMessage.includes('call')) {
      return PRE_LOADED_RESPONSES.meetings;
    }
    if (lowerMessage.includes('support') || lowerMessage.includes('desk') || lowerMessage.includes('human') || lowerMessage.includes('escalat')) {
      return PRE_LOADED_RESPONSES.support;
    }
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing') || lowerMessage.includes('plan')) {
      return PRE_LOADED_RESPONSES.pricing;
    }
    if (lowerMessage.includes('demo') || lowerMessage.includes('try') || lowerMessage.includes('schedule') || lowerMessage.includes('show')) {
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
    setMessageCount((prev) => prev + 1);

    // Simulate typing delay (300-800ms)
    const typingDelay = Math.random() * 500 + 300;
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

    // After 5 messages, suggest video call
    if (messageCount >= 4 && !leadCaptureMode) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `suggestion-${Date.now()}`,
            role: 'assistant',
            content: "Enjoying our chat? For a fuller experience, **join a video call** where I can see your screen and help even better!",
            timestamp: new Date(),
          },
        ]);
      }, 1000);
    }
  };

  const handleLeadSubmit = () => {
    if (!leadEmail.trim()) return;

    onLeadCapture?.(leadEmail, leadName || undefined);

    setMessages((prev) => [
      ...prev,
      {
        id: `lead-${Date.now()}`,
        role: 'assistant',
        content: `Thank you${leadName ? `, ${leadName}` : ''}! Our team will reach out to ${leadEmail} shortly. In the meantime, feel free to explore our platform!`,
        timestamp: new Date(),
      },
    ]);

    setLeadCaptureMode(false);
  };

  const handleJoinVideoCall = () => {
    window.open(appUrls.meeting, '_blank');
  };

  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render simple markdown (bold only)
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 z-50 flex items-center gap-3"
        aria-label="Chat with AI"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[14px] font-medium pr-1">Chat with AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[580px] shadow-2xl shadow-black/50 z-50 flex flex-col rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0c0c0e]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[15px]">VisualKit AI</h3>
            <p className="text-[11px] text-white/70">
              Demo • {formatTimeRemaining()} remaining
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="hover:bg-white/10 rounded-lg p-2 transition-colors"
          aria-label="Close demo"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0c0c0e]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/[0.05] border border-white/[0.08] text-white/80'
              }`}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-line">
                {renderMarkdown(message.content)}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Video Call CTA */}
      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0a0a0c]">
        <button
          onClick={handleJoinVideoCall}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[13px] font-medium transition-all"
        >
          <Video className="w-4 h-4" />
          Join Video Call with AI
        </button>
      </div>

      {/* Lead Capture Form */}
      {leadCaptureMode && (
        <div className="p-4 bg-indigo-600/10 border-t border-indigo-500/20">
          <Label htmlFor="lead-name" className="text-[12px] font-semibold text-white/70 mb-2 block">
            Get a Personalized Demo
          </Label>
          <Input
            id="lead-name"
            type="text"
            placeholder="Your name (optional)"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            className="mb-2 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-[13px]"
          />
          <Input
            id="lead-email"
            type="email"
            placeholder="Your email *"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            className="mb-3 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-[13px]"
          />
          <Button
            onClick={handleLeadSubmit}
            disabled={!leadEmail.trim()}
            className="w-full bg-white text-[#08080a] hover:bg-white/90 text-[13px] h-10"
          >
            Schedule Demo
          </Button>
        </div>
      )}

      {/* Input Area */}
      {!leadCaptureMode && (
        <div className="p-4 border-t border-white/[0.06] bg-[#0a0a0c]">
          <div className="flex gap-2">
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
              className="flex-1 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-[13px] h-10"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || timeRemaining === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {timeRemaining <= 60000 && timeRemaining > 0 && (
            <p className="text-[11px] text-amber-400 mt-2">
              Less than 1 minute remaining in demo
            </p>
          )}
        </div>
      )}
    </div>
  );
}
