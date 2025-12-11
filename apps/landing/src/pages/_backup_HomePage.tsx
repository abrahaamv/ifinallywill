/**
 * VisualKit Landing Page
 * Strategy-aligned design following Product Design & Copywriting Strategy
 * Premium dark theme with professional UX
 */

import { Button } from '@platform/ui';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Eye,
  Globe,
  Lock,
  MessageSquare,
  Mic,
  MonitorPlay,
  MousePointerClick,
  Play,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { appUrls } from '../config/urls';

// ============================================================================
// DATA - Strategy Aligned
// ============================================================================

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'SOC 2 Type II' },
  { icon: Lock, label: '256-bit AES' },
  { icon: Globe, label: 'GDPR Compliant' },
  { icon: Zap, label: '99.9% Uptime' },
];

const PRODUCT_TABS = [
  {
    id: 'widget',
    label: 'Free Widget',
    icon: MessageSquare,
    headline: 'AI chat that sees customer screens',
    description: 'Deploy in 5 minutes with a single script tag. Free forever for small teams.',
    features: ['Visual AI assistance', 'Custom branding', 'Knowledge base integration'],
    cta: 'Get Widget Code',
    ctaHref: appUrls.signup,
    pricing: 'Free to start',
  },
  {
    id: 'sdk',
    label: 'SDK / API',
    icon: Code2,
    headline: 'Visual AI via WebSocket + REST',
    description: 'Full programmatic control for custom integrations. Usage-based pricing.',
    features: ['Real-time WebSocket', 'REST API', 'React & JS SDKs'],
    cta: 'Get API Keys',
    ctaHref: appUrls.signup,
    pricing: 'Pay as you go',
  },
  {
    id: 'meetings',
    label: 'Meeting Rooms',
    icon: Video,
    headline: 'AI-powered video with screen sharing',
    description: 'Schedule meetings, record sessions, and add AI agents to any call.',
    features: ['HD video & audio', 'AI transcription', 'Calendar sync'],
    cta: 'Create Your First Room',
    ctaHref: appUrls.meeting,
    pricing: 'Included in Pro',
  },
  {
    id: 'platform',
    label: 'Platform Suite',
    icon: Server,
    headline: 'Everything unified for enterprise',
    description: 'Widget + API + Meetings + Dashboard. SSO, audit logs, and dedicated support.',
    features: ['Single sign-on', 'Custom SLAs', 'Dedicated success manager'],
    cta: 'Contact Sales',
    ctaHref: '/contact',
    pricing: 'Custom pricing',
  },
];

// Strategy-aligned feature cards with benefit-led titles
const FEATURES = [
  {
    icon: Eye,
    title: 'See What They See',
    description: 'AI views customer screens in real-time with their permission. No more "describe what you see"—understand issues instantly.',
    badge: 'Visual AI',
  },
  {
    icon: Zap,
    title: 'Resolve in Minutes, Not Hours',
    description: 'Visual context means faster diagnosis. Average resolution time drops 50% compared to text-only support.',
    badge: 'Speed',
  },
  {
    icon: MousePointerClick,
    title: 'One-Click Connection',
    description: 'Customers connect instantly via browser. No plugins, no downloads, no friction.',
    badge: 'Zero Friction',
  },
  {
    icon: Mic,
    title: 'Voice + Vision + Text',
    description: 'Unified AI that talks, sees, and chats—choose the interaction mode that fits each situation.',
    badge: 'Multi-Modal',
  },
  {
    icon: Users,
    title: 'AI + Human, Seamlessly',
    description: 'When issues need human touch, seamless handoff ensures smooth transition with full context preserved.',
    badge: 'Handoff',
  },
  {
    icon: BookOpen,
    title: 'AI That Learns Your Business',
    description: 'Upload docs, train your AI, and watch resolution rates climb. The more you teach, the smarter it gets.',
    badge: 'Knowledge',
  },
];

const COMPARISON = [
  { feature: 'Visual AI (screen viewing)', visualkit: true, others: false, unique: true },
  { feature: 'Voice + Text + Video unified', visualkit: true, others: false, unique: true },
  { feature: 'Self-hosted option', visualkit: true, others: false, unique: true },
  { feature: 'AI-powered meetings', visualkit: true, others: false, unique: true },
  { feature: 'Text chat', visualkit: true, others: true, unique: false },
  { feature: 'Knowledge base', visualkit: true, others: true, unique: false },
  { feature: 'Human handoff', visualkit: true, others: true, unique: false },
];

// Strategy-recommended FAQ
const FAQ_ITEMS = [
  {
    question: 'Is customer data used to train your AI?',
    answer: 'No. Your data is never used for model training. Sessions are encrypted end-to-end and processed in real-time only.',
  },
  {
    question: 'Is VisualKit GDPR/SOC 2 compliant?',
    answer: 'Yes. We are SOC 2 Type II attested and fully GDPR compliant. Your choice of US, EU, or self-hosted infrastructure.',
  },
  {
    question: 'Does my customer need to download anything?',
    answer: 'No. Screen sharing works instantly in any modern browser—Chrome, Firefox, Safari, Edge. No plugins required.',
  },
  {
    question: 'How long does setup take?',
    answer: '5 minutes for basic widget integration. Add our script tag, configure in the dashboard, and you\'re live.',
  },
  {
    question: 'Can agents take over from AI?',
    answer: 'Yes. Seamless handoff to human agents with full conversation context and AI-generated summary.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: 'You\'ll receive email notifications. Service continues and overage is billed at standard rates. No surprise cutoffs.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'VisualKit reduced our support tickets by 60%. The AI actually sees what customers see—game changer.',
    author: 'Sarah Chen',
    role: 'VP of Support',
    company: 'TechCorp',
    metric: '60% fewer tickets',
  },
  {
    quote: 'We went from 15-minute average resolution to under 2 minutes. Our team can finally focus on complex issues.',
    author: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'StartupXYZ',
    metric: '2 min resolution',
  },
  {
    quote: 'The voice AI is indistinguishable from human agents. Our CSAT scores went up 40% in the first month.',
    author: 'Emily Watson',
    role: 'Head of CX',
    company: 'Enterprise Inc',
    metric: '40% CSAT increase',
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function ProductTab({
  product,
  isActive,
  onClick,
}: {
  product: typeof PRODUCT_TABS[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
        isActive
          ? 'bg-white text-[#08080a]'
          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      <product.icon className="w-4 h-4" />
      {product.label}
    </button>
  );
}

function ProductContent({ product }: { product: typeof PRODUCT_TABS[0] }) {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[12px] font-medium mb-4">
          {product.pricing}
        </div>
        <h3 className="text-[28px] sm:text-[32px] font-bold text-white tracking-[-0.02em] mb-4">
          {product.headline}
        </h3>
        <p className="text-[16px] text-white/50 leading-relaxed mb-6">
          {product.description}
        </p>
        <ul className="space-y-3 mb-8">
          {product.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-[14px] text-white/60">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          className="h-11 px-6 text-[14px] rounded-xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
        >
          <a href={product.ctaHref}>
            {product.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </div>

      {/* Product Preview Placeholder */}
      <div className="relative">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 aspect-[4/3] flex items-center justify-center">
          <div className="text-center">
            <product.icon className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-[14px] text-white/30">Product preview</p>
          </div>
        </div>
        {/* Decorative glow */}
        <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl -z-10" />
      </div>
    </div>
  );
}

function FAQItem({ item, isOpen, onToggle }: { item: typeof FAQ_ITEMS[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[15px] font-medium text-white group-hover:text-white/80 transition-colors pr-4">
          {item.question}
        </span>
        <ChevronRight className={`w-5 h-5 text-white/30 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-[14px] text-white/40 leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

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
          HERO SECTION - Strategy Aligned
          ==================================================================== */}
      <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[13px] font-medium text-white/60">Visual AI for Customer Support</span>
          </div>

          {/* Strategy Headline */}
          <h1 className="text-[36px] sm:text-[48px] md:text-[64px] font-bold tracking-[-0.03em] leading-[1.05] mb-6">
            <span className="text-white">AI Support That Sees</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              What Your Customers See
            </span>
          </h1>

          {/* Strategy Subheadline */}
          <p className="text-[17px] sm:text-[19px] text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Resolve support tickets 50% faster with AI agents that view customer screens in real-time.
            <span className="text-white/70"> Enterprise-grade encryption. Customer-initiated. Nothing stored.</span>
          </p>

          {/* Strategy CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              asChild
              className="group h-12 sm:h-14 px-7 sm:px-9 text-[14px] sm:text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/95 font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-white/20"
            >
              <a href={appUrls.meeting}>
                <Play className="w-4 h-4 mr-2.5" />
                See It In Action
                <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 sm:h-14 px-7 sm:px-9 text-[14px] sm:text-[15px] rounded-2xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] font-medium"
            >
              <a href={appUrls.signup}>
                Start Free Trial
              </a>
            </Button>
          </div>

          {/* No credit card text */}
          <p className="text-[13px] text-white/30 mb-12">No credit card required</p>
        </div>

        {/* Hero Visual - Split Screen Demo Placeholder */}
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Customer Side */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-white/[0.06]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider">Customer Screen</span>
                </div>
                <div className="aspect-video rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                  <div className="text-center">
                    <MonitorPlay className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-[13px] text-white/30">Live screen view</p>
                    <p className="text-[11px] text-white/20 mt-1">Customer initiated • End anytime</p>
                  </div>
                </div>
              </div>

              {/* AI Agent Side */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider">AI Agent</span>
                </div>
                <div className="aspect-video rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-[13px] text-white/30">Visual understanding</p>
                    <p className="text-[11px] text-white/20 mt-1">Real-time guidance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ====================================================================
          TRUST BADGES - Strategy Aligned
          ==================================================================== */}
      <section className="relative py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <badge.icon className="w-4 h-4 text-emerald-400" />
                <span className="text-[13px] font-medium text-white/60">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          PRODUCT TABS - Strategy Aligned (4 Products)
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Products
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Choose your integration
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] w-fit mx-auto">
            {PRODUCT_TABS.map((product, index) => (
              <ProductTab
                key={product.id}
                product={product}
                isActive={activeTab === index}
                onClick={() => setActiveTab(index)}
              />
            ))}
          </div>

          {/* Tab Content */}
          {PRODUCT_TABS[activeTab] && <ProductContent product={PRODUCT_TABS[activeTab]} />}
        </div>
      </section>

      {/* ====================================================================
          FEATURES - Strategy Aligned (Benefit-Led Titles)
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Capabilities
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Visual support that actually works
            </h2>
          </div>

          {/* Feature Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                {/* Badge */}
                <div className="inline-flex px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[11px] font-medium mb-4">
                  {feature.badge}
                </div>

                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-white/60" />
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2 tracking-[-0.01em]">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          COMPARISON - Only VisualKit Features
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Only VisualKit
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Capabilities no one else offers
            </h2>
          </div>

          {/* Checklist Format */}
          <div className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8">
            <div className="space-y-4">
              {COMPARISON.map((item) => (
                <div
                  key={item.feature}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    item.unique ? 'bg-indigo-500/[0.08] border border-indigo-500/20' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.unique ? 'bg-indigo-500/20' : 'bg-emerald-500/20'
                  }`}>
                    <Check className={`w-3.5 h-3.5 ${item.unique ? 'text-indigo-400' : 'text-emerald-400'}`} />
                  </div>
                  <span className={`text-[15px] ${item.unique ? 'text-white font-medium' : 'text-white/60'}`}>
                    {item.feature}
                  </span>
                  {item.unique && (
                    <span className="ml-auto text-[11px] font-medium text-indigo-400 uppercase tracking-wider">
                      Exclusive
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          TESTIMONIALS
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              Results
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Trusted by support teams
            </h2>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.author}
                className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 sm:p-7"
              >
                {/* Metric badge */}
                <div className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[13px] font-semibold mb-5">
                  {testimonial.metric}
                </div>

                <p className="text-[15px] text-white/70 leading-relaxed mb-6">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="text-[14px] font-medium text-white">{testimonial.author}</div>
                  <div className="text-[13px] text-white/40">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          FAQ - Strategy Aligned Questions
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] text-indigo-400/70 font-semibold mb-4">
              FAQ
            </p>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em]">
              Common questions
            </h2>
          </div>

          {/* FAQ Items */}
          <div className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] px-6 sm:px-8">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={item.question}
                item={item}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          CTA SECTION
          ==================================================================== */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Glow */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-white tracking-[-0.02em] mb-6">
              Ready to see it in action?
            </h2>
            <p className="text-[17px] text-white/40 mb-10 max-w-lg mx-auto">
              Watch how support teams resolve issues 50% faster with Visual AI.
              Start free, upgrade when you need to.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                className="h-12 sm:h-14 px-8 text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/95 font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-white/20"
              >
                <a href={appUrls.meeting}>
                  <Play className="w-4 h-4 mr-2" />
                  See It In Action
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 sm:h-14 px-8 text-[15px] rounded-2xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] font-medium"
              >
                <a href={appUrls.signup}>
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <p className="text-[13px] text-white/30 mt-6">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Spacer for footer */}
      <div className="h-16" />
    </div>
  );
}
