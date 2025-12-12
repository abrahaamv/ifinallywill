/**
 * Meeting Room Page - Professional Dark Theme
 * AI-powered video meeting room with Visual AI assistant
 * Matches the VisualKit landing page design system
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@platform/ui';
import {
  Bot,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  Send,
  Settings,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';

// Private Beta Banner Component (compact version for meeting room)
function PrivateBetaBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-center relative">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          <span className="text-[12px] font-medium text-white">
            Private Beta
          </span>
        </div>
        <span className="text-white/60 text-[12px]">—</span>
        <span className="text-[12px] text-white/90">
          Launching Q1 2026
        </span>
        <a
          href="https://visualkit.live/contact"
          className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-medium text-white transition-colors"
        >
          <Mail className="w-3 h-3" />
          Inquiries
        </a>
        <button
          onClick={onDismiss}
          className="absolute right-0 p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const displayName = sessionStorage.getItem('displayName') || 'Guest';
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; isAI?: boolean; timestamp: Date }>>([
    {
      sender: 'AI Assistant',
      text: "Hello! I'm your AI meeting assistant. I can see your screen when you share it and help with any questions. Try sharing your screen and ask me what you see!",
      isAI: true,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!sessionStorage.getItem('displayName')) {
      navigate('/');
    }
  }, [navigate]);

  const handleLeave = () => {
    sessionStorage.removeItem('displayName');
    navigate('/');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setMessages((prev) => [...prev, { sender: displayName, text: chatInput, timestamp: new Date() }]);

    const userMessage = chatInput;
    setChatInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'AI Assistant',
          text: getAIResponse(userMessage),
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const getAIResponse = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('share') || lower.includes('screen')) {
      return 'Click the "Share Screen" button in the control bar below. Once you start sharing, I\'ll be able to see what\'s on your screen and help you with visual questions!';
    }
    if (lower.includes('help')) {
      return 'I can help you with:\n• Screen sharing assistance\n• Visual troubleshooting\n• Meeting notes & summaries\n• Technical questions\n\nJust share your screen and describe what you need!';
    }
    if (lower.includes('hello') || lower.includes('hi')) {
      return `Hello ${displayName}! I'm here to help with your meeting. Feel free to share your screen and I'll provide visual guidance.`;
    }
    return "I'm here to assist! Share your screen and I can provide visual guidance, or ask me any questions about your meeting.";
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen flex-col bg-[#08080a]">
      {/* Private Beta Banner */}
      {!bannerDismissed && <PrivateBetaBanner onDismiss={() => setBannerDismissed(true)} />}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 bg-[#08080a]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Video className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white">VisualKit Meet</span>
          </div>

          <div className="h-5 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5">
              <span className="text-[12px] text-white/40">Room:</span>
              <span className="font-mono text-[13px] text-white">{roomId}</span>
            </div>
            <button
              onClick={copyRoomLink}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white transition-all"
              title="Copy room link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Users className="h-3.5 w-3.5 text-white/50" />
            <span className="text-[13px] text-white/60">2 participants</span>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white transition-all">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            <div className="grid h-full gap-4 grid-cols-1 lg:grid-cols-2">
              {/* User Video */}
              <div className="relative flex items-center justify-center rounded-[20px] bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                {isVideoOff ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[17px] font-medium text-white">{displayName}</span>
                    <span className="text-[13px] text-white/40">Camera off</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                      <Video className="h-12 w-12 text-indigo-400" />
                    </div>
                    <span className="text-[14px] text-white/40">Camera preview</span>
                  </div>
                )}

                {/* User Label */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-sm px-3 py-2">
                  <span className="text-[13px] font-medium text-white">{displayName}</span>
                  <span className="text-[11px] text-white/40">(You)</span>
                  {isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
                </div>
              </div>

              {/* AI Agent */}
              <div className="relative flex items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.04] border border-indigo-500/20 overflow-hidden">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Bot className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#08080a]">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[17px] font-medium text-white">AI Assistant</span>
                  <span className="text-[13px] text-indigo-300">Visual AI • Ready to help</span>
                </div>

                {/* AI Status */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-indigo-500/20 backdrop-blur-sm px-3 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                  </span>
                  <span className="text-[12px] font-medium text-indigo-200">AI Agent Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Screen Share Banner */}
          {isScreenSharing && (
            <div className="mx-4 mb-4 flex items-center justify-between rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Monitor className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[14px] font-medium text-emerald-300">Screen sharing active</span>
                  <p className="text-[12px] text-emerald-400/60">AI can see your display</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 rounded-lg"
                onClick={() => setIsScreenSharing(false)}
              >
                <MonitorOff className="h-4 w-4 mr-2" />
                Stop Sharing
              </Button>
            </div>
          )}

          {/* Control Bar */}
          <div className="flex items-center justify-center gap-3 border-t border-white/[0.06] px-6 py-4 bg-[#08080a]">
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                isMuted
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Video Button */}
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                isVideoOff
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                isScreenSharing
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <Monitor className="h-5 w-5" />
            </button>

            {/* Chat Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                isChatOpen
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
              }`}
              title="Toggle chat"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            <div className="mx-2 h-8 w-px bg-white/[0.08]" />

            {/* Leave Button */}
            <button
              onClick={handleLeave}
              className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-6 text-white transition-colors hover:bg-red-600"
            >
              <Phone className="h-5 w-5 rotate-[135deg]" />
              <span className="text-[14px] font-medium">Leave</span>
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="flex w-[360px] flex-col border-l border-white/[0.06] bg-[#08080a]">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">AI Chat</h3>
                  <p className="text-[11px] text-white/40">Visual AI assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.isAI ? '' : 'items-end'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-medium ${msg.isAI ? 'text-indigo-400' : 'text-white/50'}`}>
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-white/30">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`rounded-[16px] px-4 py-3 max-w-[280px] ${
                      msg.isAI
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-100'
                        : 'bg-white/[0.06] border border-white/[0.06] text-white'
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="border-t border-white/[0.06] p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask AI anything..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingRoom;
