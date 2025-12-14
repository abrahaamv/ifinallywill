/**
 * Meeting Lobby Page - Professional Dark Theme
 * Matches the VisualKit landing page design system
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label } from '@platform/ui';
import { appUrls } from '../config/urls';
import { useComingSoon } from '../context/ComingSoonContext';
import {
  Bot,
  Eye,
  Mail,
  Mic,
  Monitor,
  Shield,
  Users,
  Video,
  X,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// Private Beta Banner Component
function PrivateBetaBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          <span className="text-[13px] font-medium text-white">
            <span className="hidden sm:inline">Currently in </span>Private Beta
          </span>
        </div>
        <span className="text-white/60">—</span>
        <span className="text-[13px] text-white/90">
          Launching Q1 2026
        </span>
        <a
          href={`${appUrls.landing}/contact`}
          className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[12px] font-medium text-white transition-colors"
        >
          <Mail className="w-3 h-3" />
          Partnership Inquiries
        </a>
      </div>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

const FEATURES = [
  {
    icon: Eye,
    title: 'AI That Sees Your Screen',
    description: 'Share your screen and AI understands visual context instantly. No more describing what you see.',
    color: 'indigo',
  },
  {
    icon: Mic,
    title: 'Voice + Vision + Text',
    description: 'Talk naturally, share visuals, or type. Sub-500ms latency for seamless conversation.',
    color: 'purple',
  },
  {
    icon: Bot,
    title: 'AI Joins as Participant',
    description: 'Unlike chatbots, our AI joins meetings as a real participant that can see, hear, and respond.',
    color: 'pink',
  },
  {
    icon: Users,
    title: 'Human Escalation',
    description: 'When AI isn\'t enough, seamlessly escalate to human agents with full context transfer.',
    color: 'emerald',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: '99/100 security audit score. OWASP compliant, E2E encryption, SOC 2 ready.',
    color: 'blue',
  },
  {
    icon: Zap,
    title: '85% Cost Savings',
    description: 'Self-hosted infrastructure means massive savings compared to enterprise video platforms.',
    color: 'amber',
  },
];

const STATS = [
  { value: '46%', label: 'Faster Resolution' },
  { value: '75%', label: 'Visual Issues Solved' },
  { value: '99/100', label: 'Security Score' },
];

// Demo Room ID
const DEMO_ROOM_ID = 'demo-visualkit';

export function LobbyPage() {
  const { openModal } = useComingSoon();
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');

  // Banner height offset
  const bannerOffset = bannerDismissed ? '0px' : '40px';

  // Handle joining the demo room
  const handleJoinDemo = () => {
    const name = displayName.trim() || 'Demo User';
    sessionStorage.setItem('displayName', name);
    navigate(`/${DEMO_ROOM_ID}`);
  };

  // Handle joining with custom room
  const handleJoinRoom = () => {
    if (!roomId.trim()) return;
    const name = displayName.trim() || 'Guest';
    sessionStorage.setItem('displayName', name);
    navigate(`/${roomId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white">
      {/* Private Beta Banner */}
      {!bannerDismissed && <PrivateBetaBanner onDismiss={() => setBannerDismissed(true)} />}

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[15%] w-[600px] h-[600px] bg-indigo-600/[0.06] rounded-full blur-[128px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-[128px]" />
        <div className="absolute top-[60%] right-[30%] w-[400px] h-[400px] bg-pink-600/[0.04] rounded-full blur-[128px]" />
      </div>

      {/* Navigation */}
      <nav
        className="relative border-b border-white/[0.06] backdrop-blur-sm bg-[#08080a]/80 sticky z-50"
        style={{ top: bannerOffset }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-[17px] font-semibold text-white">VisualKit Meet</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={appUrls.landing}
              className="text-[14px] text-white/50 hover:text-white transition-colors"
            >
              Home
            </a>
            <a
              href={`${appUrls.landing}/features`}
              className="text-[14px] text-white/50 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href={`${appUrls.landing}/pricing`}
              className="text-[14px] text-white/50 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <Button
              onClick={openModal}
              className="h-9 px-4 text-[13px] rounded-xl bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative pb-24"
        style={{ paddingTop: bannerDismissed ? '64px' : '104px' }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                AI-Powered Video Meetings
              </div>

              <h1 className="text-[40px] sm:text-[48px] lg:text-[56px] font-bold tracking-[-0.03em] leading-[1.1] mb-6">
                <span className="text-white">Video Meetings with</span>
                <br />
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  AI That Can See
                </span>
              </h1>

              <p className="text-[17px] text-white/50 leading-relaxed mb-8 max-w-lg">
                The only video conferencing platform where AI agents join your meetings,
                see your screen, and assist in real-time. Like Zoom, but with intelligent
                co-pilots that understand visual context.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mb-10">
                {['Visual AI Understanding', 'Voice + Vision + Text', 'Screen Share Analysis', '85% Cost Savings'].map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/60"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-[28px] font-bold text-white tracking-tight">{stat.value}</div>
                    <div className="text-[13px] text-white/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Join/Create Card */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-[24px] bg-white/[0.02] border border-white/[0.06] p-8">
                <div className="text-center mb-8">
                  <h2 className="text-[22px] font-semibold text-white mb-2">Start a Meeting</h2>
                  <p className="text-[14px] text-white/40">
                    Create a new room or join an existing one
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-[13px] text-white/60">
                      Your Name *
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="e.g., Alex from Marketing"
                      className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <p className="text-[11px] text-white/30">This is how you'll appear to others</p>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/[0.06]" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                      <span className="bg-[#08080a] px-3 text-white/30">Join existing room</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roomId" className="text-[13px] text-white/60">
                      Room ID
                    </Label>
                    <Input
                      id="roomId"
                      placeholder="Paste room link or ID here"
                      className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl font-mono"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={!roomId.trim()}
                    className="w-full h-12 bg-white text-[#08080a] hover:bg-white/90 font-semibold rounded-xl text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Join Meeting
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/[0.06]" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                      <span className="bg-[#08080a] px-3 text-white/30">or try our demo</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleJoinDemo}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-[15px] border-0"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Try AI Demo Room
                  </Button>
                  <p className="text-center text-[11px] text-white/30">
                    Experience our AI assistant with screen sharing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6">
              <Monitor className="w-3.5 h-3.5" />
              Visual AI Platform
            </div>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-white tracking-[-0.02em] mb-4">
              Why VisualKit Meet?
            </h2>
            <p className="text-[16px] text-white/40 max-w-2xl mx-auto">
              Traditional video calls are just video. VisualKit brings AI that actually
              participates, understands what it sees, and helps you get things done.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-4 group-hover:bg-${feature.color}-500/20 transition-all`}>
                  <feature.icon className={`w-5 h-5 text-${feature.color}-400`} />
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[24px] bg-gradient-to-br from-indigo-500/[0.1] to-purple-500/[0.05] border border-indigo-500/20 p-12 text-center">
            <h2 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-4">
              Ready to Meet Smarter?
            </h2>
            <p className="text-[16px] text-white/50 max-w-2xl mx-auto mb-8">
              Join teams using AI-powered video meetings.
              Start your first meeting in seconds - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => document.getElementById('displayName')?.focus()}
                className="h-12 px-8 text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
              >
                Start Free Meeting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                asChild
                className="h-12 px-8 text-[15px] rounded-2xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05]"
              >
                <a href={`${appUrls.landing}/contact`}>Schedule a Demo</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.06] py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Video className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white">VisualKit Meet</span>
            </div>
            <div className="flex items-center gap-6 text-[13px] text-white/40">
              <a href={`${appUrls.landing}/privacy`} className="hover:text-white transition-colors">Privacy</a>
              <a href={`${appUrls.landing}/terms`} className="hover:text-white transition-colors">Terms</a>
              <a href={`${appUrls.landing}/security`} className="hover:text-white transition-colors">Security</a>
              <a href={appUrls.landing} className="hover:text-white transition-colors">VisualKit.live</a>
            </div>
            <p className="text-[13px] text-white/30">
              &copy; 2025 VisualKit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
