/**
 * VisualKit Landing Page
 * Agent Deployment & Hosting Platform
 * Three Products: Widget, Support Desk, AI Meetings
 */

import { Button } from '@platform/ui';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  DollarSign,
  Globe,
  Headphones,
  Lock,
  MessageSquare,
  Phone,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { appUrls } from '../config/urls';
import { useComingSoon } from '../context/ComingSoonContext';

// ============================================================================
// DATA - Agent Deployment Platform
// ============================================================================

const TRUST_BADGES = [
  { icon: ShieldCheck, label: '99/100 Security', highlight: true },
  { icon: DollarSign, label: '92% Cheaper' },
  { icon: Zap, label: 'Production Ready' },
  { icon: Globe, label: 'GDPR Compliant' },
];

// Three main products
// comingSoon: true means click opens modal, false means it's a working link
const PRODUCTS = [
  {
    id: 'widget',
    name: 'Free Widget',
    tagline: 'Embed. Don\'t Code.',
    icon: MessageSquare,
    description: 'AI chatbot with voice + vision for any website. Drop a script tag and go live.',
    features: [
      'Shadow DOM isolation (no CSS conflicts)',
      'Screen sharing built-in',
      '52-86KB gzipped bundle',
      'NPM or CDN installation',
    ],
    cta: 'Get Widget Code',
    ctaHref: '#',
    comingSoon: true,
    badge: 'Free Forever',
    color: 'emerald',
  },
  {
    id: 'support',
    name: 'Support Desk',
    tagline: 'AI + Humans. Seamless.',
    icon: Headphones,
    description: 'Full customer service platform with AI triage and human escalation when needed.',
    features: [
      'AI handles 70% of tickets automatically',
      'Seamless handoff to human agents',
      'Full conversation history & context',
      'Open-source Chatwoot under the hood',
    ],
    cta: 'Explore Support Desk',
    ctaHref: '#',
    comingSoon: true,
    badge: 'Human Escalation',
    color: 'blue',
  },
  {
    id: 'meetings',
    name: 'AI Meetings',
    tagline: 'Meet with AI.',
    icon: Video,
    description: 'Video meetings where AI joins as a participant. Screen sharing with real-time AI analysis.',
    features: [
      'AI sees shared screens in real-time',
      'Voice + vision + text unified',
      'Scheduling & recording (premium)',
      'Multi-participant rooms',
    ],
    cta: 'Try AI Meeting',
    ctaHref: appUrls.meeting,
    comingSoon: false,
    badge: 'Zoom Alternative',
    color: 'purple',
  },
];

// Visual AI comparison
const VISUAL_COMPARISON = [
  {
    traditional: '"Can you describe the error?"',
    visualkit: 'Sees the error on screen instantly',
  },
  {
    traditional: '5+ back-and-forth messages',
    visualkit: 'Instant visual understanding',
  },
  {
    traditional: 'Generic troubleshooting steps',
    visualkit: 'Context-aware solutions',
  },
];

// How it works steps
const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Create Agent',
    description: 'Configure personality, voice, and behavior in the dashboard',
    icon: Bot,
  },
  {
    step: 2,
    title: 'Train with RAG',
    description: 'Upload docs, FAQs, and product info to your knowledge base',
    icon: Upload,
  },
  {
    step: 3,
    title: 'Choose Deployment',
    description: 'Widget, Support Desk, or Meetings — or all three',
    icon: Rocket,
  },
  {
    step: 4,
    title: 'Go Live',
    description: 'Deploy in minutes, not months. Scale as you grow.',
    icon: Zap,
  },
];

// Use cases
const USE_CASES = [
  {
    id: 'saas',
    title: 'SaaS Support',
    description: 'Visual debugging — AI sees the error, not just hears about it. Resolve complex issues in minutes.',
    icon: Code2,
    stat: '46% faster resolution',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce',
    description: 'Screen sharing reduces returns — AI helps with sizing, shows defects, guides checkout.',
    icon: Globe,
    stat: '30% fewer returns',
  },
  {
    id: 'fintech',
    title: 'Fintech',
    description: 'Video KYC in under 3 minutes with AI verification. Secure, compliant, and fast.',
    icon: Lock,
    stat: '<3 min KYC',
  },
  {
    id: 'internal',
    title: 'Internal Teams',
    description: 'AI joins meetings to take notes, answer questions, and share screens on demand.',
    icon: Users,
    stat: '2x productivity',
  },
];

// Pricing preview
const PRICING_PREVIEW = [
  { tier: 'Free', widget: '100 chats/mo', support: '1 agent', meetings: '3/week, 5 min' },
  { tier: 'Pro', widget: '2,000 chats/mo', support: '10 agents', meetings: 'Unlimited, 60 min' },
  { tier: 'Enterprise', widget: 'Unlimited', support: 'Unlimited', meetings: 'White-label' },
];

// Security badges
const SECURITY_FEATURES = [
  { label: '99/100 Audit Score', icon: ShieldCheck },
  { label: '76+ RLS Policies', icon: Lock },
  { label: 'OWASP Compliant', icon: Check },
  { label: 'GDPR Ready', icon: Globe },
  { label: 'SOC 2 Roadmap', icon: Server },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function ProductCard({ product, onComingSoon }: { product: typeof PRODUCTS[0]; onComingSoon: () => void }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="group relative rounded-[24px] bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
      {/* Badge */}
      <div className={`inline-flex px-3 py-1.5 rounded-full text-[11px] font-semibold mb-5 border ${colorClasses[product.color as keyof typeof colorClasses]}`}>
        {product.badge}
      </div>

      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
        <product.icon className="w-6 h-6 text-white/70" />
      </div>

      {/* Content */}
      <h3 className="text-[22px] font-bold text-white mb-1 tracking-[-0.01em]">
        {product.name}
      </h3>
      <p className="text-[14px] text-indigo-400 font-medium mb-3">{product.tagline}</p>
      <p className="text-[14px] text-white/40 leading-relaxed mb-6">
        {product.description}
      </p>

      {/* Features */}
      <ul className="space-y-2.5 mb-8">
        {product.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <span className="text-[13px] text-white/50">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {product.comingSoon ? (
        <Button
          onClick={onComingSoon}
          className="w-full h-11 text-[14px] rounded-xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
        >
          {product.cta}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          asChild
          className="w-full h-11 text-[14px] rounded-xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
        >
          <a href={product.ctaHref}>
            {product.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      )}
    </div>
  );
}

function HowItWorksStep({ item, isLast }: { item: typeof HOW_IT_WORKS[0]; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Connector line (hidden on mobile, shown on larger screens) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-indigo-500/30 to-purple-500/30" />
      )}

      {/* Step number */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
        <item.icon className="w-7 h-7 text-indigo-400" />
      </div>

      <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
        Step {item.step}
      </div>
      <h4 className="text-[17px] font-semibold text-white mb-2">{item.title}</h4>
      <p className="text-[13px] text-white/40 max-w-[200px]">{item.description}</p>
    </div>
  );
}

function UseCaseCard({ useCase }: { useCase: typeof USE_CASES[0] }) {
  return (
    <div className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <useCase.icon className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
          {useCase.stat}
        </span>
      </div>
      <h4 className="text-[16px] font-semibold text-white mb-2">{useCase.title}</h4>
      <p className="text-[13px] text-white/40 leading-relaxed">{useCase.description}</p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function HomePage() {
  const { openModal } = useComingSoon();

  return (
    <div className="min-h-screen bg-[#08080a] text-white antialiased selection:bg-indigo-500/30">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-indigo-600/[0.08] rounded-full blur-[128px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] bg-purple-600/[0.06] rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-cyan-600/[0.04] rounded-full blur-[128px]" />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ====================================================================
          HERO SECTION - Agent Deployment Platform
          ==================================================================== */}
      <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[13px] font-medium text-white/60">Agent Deployment Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-[36px] sm:text-[48px] md:text-[64px] font-bold tracking-[-0.03em] leading-[1.05] mb-6">
            <span className="text-white">Deploy AI Agents</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              That Can See
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-[17px] sm:text-[19px] text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Build once. Deploy everywhere.
            <span className="text-white/70"> Your AI agent works in chat widgets, support desks, and video meetings.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              onClick={openModal}
              className="group h-12 sm:h-14 px-7 sm:px-9 text-[14px] sm:text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/95 font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-white/20"
            >
              Start Free
              <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              asChild
              variant="outline"
              className="group h-12 sm:h-14 px-7 sm:px-9 text-[14px] sm:text-[15px] rounded-2xl border-indigo-500/30 bg-indigo-500/10 text-white hover:bg-indigo-500/20 font-medium"
            >
              <a href={`${appUrls.meeting}/sales-demo`}>
                <Phone className="w-4 h-4 mr-2" />
                Talk to AI
              </a>
            </Button>
          </div>

          {/* No credit card text */}
          <p className="text-[13px] text-white/30 mb-12">No credit card required</p>
        </div>

        {/* Trust Badges */}
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                  badge.highlight
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.02] border-white/[0.06] text-white/60'
                }`}
              >
                <badge.icon className="w-4 h-4" />
                <span className="text-[13px] font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          PLATFORM DIAGRAM - One Agent, Three Deployments
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              The Platform
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-4">
              One Agent. Three Deployments.
            </h2>
            <p className="text-[16px] text-white/40 max-w-xl mx-auto">
              Configure your agent once in the dashboard. Deploy it as a widget, connect it to support, or invite it to meetings.
            </p>
          </div>

          {/* Visual Diagram */}
          <div className="relative">
            {/* Dashboard Box */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[14px] font-semibold text-white">Dashboard</div>
                  <div className="text-[12px] text-white/50">Create & Configure Agent</div>
                </div>
              </div>
            </div>

            {/* Arrow Down */}
            <div className="flex justify-center mb-8">
              <div className="w-[2px] h-12 bg-gradient-to-b from-indigo-500/50 to-transparent" />
            </div>

            {/* Three Deployment Options */}
            <div className="grid md:grid-cols-3 gap-4">
              {PRODUCTS.map((product) => (
                <a
                  key={product.id}
                  href={product.ctaHref}
                  className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 text-center hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <product.icon className="w-6 h-6 text-white/60" />
                  </div>
                  <div className="text-[15px] font-semibold text-white mb-1">{product.name}</div>
                  <div className="text-[12px] text-white/40">{product.tagline}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          PRODUCTS - Three Cards
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Products
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Three ways to deploy your agent
            </h2>
          </div>

          {/* Product Cards Grid */}
          <div className="grid md:grid-cols-3 gap-5">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} onComingSoon={openModal} />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          VISUAL AI DIFFERENTIATOR
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              The Difference
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-4">
              AI That Actually Sees
            </h2>
            <p className="text-[16px] text-white/40 max-w-xl mx-auto">
              75% of complex issues require visual context. Our AI sees what your customers see.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
              <div className="text-[32px] font-bold text-emerald-400 mb-1">46%</div>
              <div className="text-[13px] text-white/50">Faster Resolution</div>
            </div>
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-6 text-center">
              <div className="text-[32px] font-bold text-indigo-400 mb-1">75%</div>
              <div className="text-[13px] text-white/50">Need Visual Context</div>
            </div>
            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-6 text-center">
              <div className="text-[32px] font-bold text-purple-400 mb-1">&lt;500ms</div>
              <div className="text-[13px] text-white/50">Response Latency</div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Traditional */}
              <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-white/[0.06]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <span className="text-[13px] font-medium text-white/50 uppercase tracking-wider">Traditional Chatbot</span>
                </div>
                <div className="space-y-4">
                  {VISUAL_COMPARISON.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.05] border border-red-500/10">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-400 text-[12px]">✗</span>
                      </div>
                      <span className="text-[14px] text-white/50">{item.traditional}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VisualKit */}
              <div className="p-6 sm:p-8 bg-indigo-500/[0.03]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[13px] font-medium text-emerald-400 uppercase tracking-wider">VisualKit Agent</span>
                </div>
                <div className="space-y-4">
                  {VISUAL_COMPARISON.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-[14px] text-white/70">{item.visualkit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          COST COMPARISON - For Developers
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              For Developers
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-4">
              92-96% Cheaper Than LiveKit Cloud
            </h2>
            <p className="text-[16px] text-white/40 max-w-xl mx-auto">
              Self-hosted Janus Gateway with free TURN/STUN via VK-ICE. Same capabilities, fraction of the cost.
            </p>
          </div>

          {/* Cost Table */}
          <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-8">
            <div className="grid grid-cols-3 border-b border-white/[0.06]">
              <div className="p-4 sm:p-6 border-r border-white/[0.06]">
                <span className="text-[13px] font-medium text-white/40">Item</span>
              </div>
              <div className="p-4 sm:p-6 border-r border-white/[0.06] text-center">
                <span className="text-[13px] font-medium text-white/40">LiveKit Cloud</span>
              </div>
              <div className="p-4 sm:p-6 text-center bg-emerald-500/[0.05]">
                <span className="text-[13px] font-medium text-emerald-400">VisualKit</span>
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-white/[0.06]">
              <div className="p-4 sm:p-6 border-r border-white/[0.06]">
                <span className="text-[14px] text-white/60">Monthly</span>
              </div>
              <div className="p-4 sm:p-6 border-r border-white/[0.06] text-center">
                <span className="text-[14px] text-white/50">$5,000-$10,000</span>
              </div>
              <div className="p-4 sm:p-6 text-center bg-emerald-500/[0.05]">
                <span className="text-[14px] text-emerald-400 font-semibold">~$400</span>
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-white/[0.06]">
              <div className="p-4 sm:p-6 border-r border-white/[0.06]">
                <span className="text-[14px] text-white/60">Annual</span>
              </div>
              <div className="p-4 sm:p-6 border-r border-white/[0.06] text-center">
                <span className="text-[14px] text-white/50">$60,000-$120,000</span>
              </div>
              <div className="p-4 sm:p-6 text-center bg-emerald-500/[0.05]">
                <span className="text-[14px] text-emerald-400 font-semibold">~$4,800</span>
              </div>
            </div>
            <div className="grid grid-cols-3">
              <div className="p-4 sm:p-6 border-r border-white/[0.06]">
                <span className="text-[14px] text-white/60 font-semibold">Savings</span>
              </div>
              <div className="p-4 sm:p-6 border-r border-white/[0.06] text-center">
                <span className="text-[14px] text-white/30">—</span>
              </div>
              <div className="p-4 sm:p-6 text-center bg-emerald-500/[0.08]">
                <span className="text-[16px] text-emerald-400 font-bold">$55K-$115K/year</span>
              </div>
            </div>
          </div>

          {/* Developer CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              variant="outline"
              className="h-11 px-6 text-[14px] rounded-xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05]"
            >
              <a href="/docs">
                <Code2 className="w-4 h-4 mr-2" />
                View SDK Docs
              </a>
            </Button>
            <Button
              onClick={openModal}
              className="h-11 px-6 text-[14px] rounded-xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
            >
              Get API Key
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          HOW IT WORKS
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Getting Started
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Deploy in 4 steps
            </h2>
          </div>

          {/* Steps Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <HowItWorksStep key={item.step} item={item} isLast={index === HOW_IT_WORKS.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          USE CASES
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Use Cases
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Built for your industry
            </h2>
          </div>

          {/* Use Case Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {USE_CASES.map((useCase) => (
              <UseCaseCard key={useCase.id} useCase={useCase} />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          PRICING PREVIEW
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Pricing
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-4">
              Start free. Scale as you grow.
            </h2>
          </div>

          {/* Pricing Table */}
          <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-8">
            {/* Header Row */}
            <div className="grid grid-cols-4 border-b border-white/[0.06]">
              <div className="p-4 sm:p-5 border-r border-white/[0.06]" />
              <div className="p-4 sm:p-5 border-r border-white/[0.06] text-center">
                <span className="text-[13px] font-semibold text-white/70">Widget</span>
              </div>
              <div className="p-4 sm:p-5 border-r border-white/[0.06] text-center">
                <span className="text-[13px] font-semibold text-white/70">Support</span>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-[13px] font-semibold text-white/70">Meetings</span>
              </div>
            </div>

            {/* Data Rows */}
            {PRICING_PREVIEW.map((row, i) => (
              <div key={row.tier} className={`grid grid-cols-4 ${i < PRICING_PREVIEW.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                <div className="p-4 sm:p-5 border-r border-white/[0.06]">
                  <span className={`text-[14px] font-semibold ${row.tier === 'Free' ? 'text-emerald-400' : 'text-white/70'}`}>
                    {row.tier}
                  </span>
                </div>
                <div className="p-4 sm:p-5 border-r border-white/[0.06] text-center">
                  <span className="text-[13px] text-white/50">{row.widget}</span>
                </div>
                <div className="p-4 sm:p-5 border-r border-white/[0.06] text-center">
                  <span className="text-[13px] text-white/50">{row.support}</span>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <span className="text-[13px] text-white/50">{row.meetings}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              asChild
              variant="outline"
              className="h-11 px-6 text-[14px] rounded-xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05]"
            >
              <a href="/pricing">
                View Full Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECURITY & ENTERPRISE
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Enterprise Ready
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-4">
              Security from day one
            </h2>
            <p className="text-[16px] text-white/40 max-w-xl mx-auto">
              Built with enterprise-grade security. No shortcuts. No compromises.
            </p>
          </div>

          {/* Security Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {SECURITY_FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <feature.icon className="w-4 h-4 text-emerald-400" />
                <span className="text-[13px] font-medium text-white/60">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          FINAL CTA
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Glow */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-6">
              Ready to deploy your AI agent?
            </h2>
            <p className="text-[17px] text-white/40 mb-10 max-w-lg mx-auto">
              Join thousands of teams using VisualKit to deliver AI-powered support with visual context.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              {/* For Everyone */}
              <Button
                onClick={openModal}
                className="h-12 sm:h-14 px-8 text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/95 font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-white/20"
              >
                Start Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* For Developers */}
              <Button
                onClick={openModal}
                variant="outline"
                className="h-12 sm:h-14 px-8 text-[15px] rounded-2xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] font-medium"
              >
                <Code2 className="w-4 h-4 mr-2" />
                Get API Key
              </Button>
            </div>

            <p className="text-[13px] text-white/30">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Spacer for footer */}
      <div className="h-16" />
    </div>
  );
}
