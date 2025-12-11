/**
 * Features Page - Dark Theme
 * Matches the professional design system
 */

import { ArrowRight, Brain, Code, Database, Eye, FileSearch, FileText, Globe, Key, Lock, MessageSquare, Shield, TrendingDown, Users, Zap, Share2, Book } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@platform/ui';
import { useComingSoon } from '../context/ComingSoonContext';

const FEATURE_CATEGORIES = [
  {
    title: 'Visual AI Capabilities',
    description: 'The only AI that sees what your customers see',
    features: [
      {
        icon: Eye,
        title: 'Real-Time Screen Sharing',
        description: 'AI analyzes customer screens in real-time. No more "can you describe what you see?" - just show it.',
        highlight: 'Industry First',
      },
      {
        icon: MessageSquare,
        title: 'Voice Conversations',
        description: 'Natural voice interactions with sub-500ms latency. Supports 30+ languages with native Gemini voice.',
      },
      {
        icon: FileText,
        title: 'Text + Visual Chat',
        description: 'Seamless switching between text and visual modes. Context maintained across all interaction types.',
      },
      {
        icon: Share2,
        title: 'Document Analysis',
        description: 'Share screenshots, PDFs, and documents. AI extracts and understands visual content instantly.',
      },
    ],
  },
  {
    title: 'AI Intelligence',
    description: 'Cost-optimized without compromising quality',
    features: [
      {
        icon: TrendingDown,
        title: 'Smart Model Routing',
        description: 'Automatic selection: Gemini 2.0 Flash for speed, Claude for complexity. 75% cost reduction vs single-model.',
        highlight: '$0.50/1M tokens',
      },
      {
        icon: Database,
        title: 'Knowledge Base (RAG)',
        description: 'Upload docs, FAQs, product manuals. Hybrid retrieval with semantic search + keyword matching + reranking.',
      },
      {
        icon: Brain,
        title: 'Context Memory',
        description: 'AI remembers conversation history and references previous interactions. Multi-turn dialogue understanding.',
      },
      {
        icon: Globe,
        title: 'Multi-Language',
        description: '100+ text languages, 30+ voice languages. Auto-detection and seamless translation.',
      },
    ],
  },
  {
    title: 'Enterprise Security',
    description: 'Built for compliance-heavy industries',
    features: [
      {
        icon: Shield,
        title: 'Multi-Tenant Isolation',
        description: 'PostgreSQL Row-Level Security (RLS) ensures complete data separation. Zero cross-tenant data access.',
        highlight: 'SOC 2 Ready',
      },
      {
        icon: Key,
        title: 'SSO / SAML',
        description: 'Enterprise single sign-on with SAML 2.0. Works with Okta, Azure AD, Google Workspace.',
      },
      {
        icon: Lock,
        title: 'End-to-End Encryption',
        description: 'TLS 1.3 in transit, AES-256 at rest. Secure key rotation and management.',
      },
      {
        icon: FileSearch,
        title: 'Audit Logging',
        description: 'Complete audit trails for compliance. Every action logged with timestamps and user context.',
      },
    ],
  },
  {
    title: 'Developer Experience',
    description: 'Build faster with type-safe APIs',
    features: [
      {
        icon: Code,
        title: 'REST + tRPC APIs',
        description: 'Type-safe tRPC for TypeScript projects. REST endpoints for broad compatibility. Full OpenAPI spec.',
      },
      {
        icon: Zap,
        title: 'WebSocket Real-Time',
        description: 'Bidirectional messaging with Redis Streams. Sub-100ms latency, auto-reconnection, sticky sessions.',
      },
      {
        icon: Users,
        title: 'Embeddable Widget',
        description: 'NPM package + CDN. Shadow DOM isolation, customizable themes, 52KB gzipped.',
      },
      {
        icon: Book,
        title: 'Comprehensive Docs',
        description: 'Interactive API playground, code examples in 8 languages, integration guides.',
      },
    ],
  },
];

export function FeaturesPage() {
  const { openModal } = useComingSoon();

  return (
    <div className="min-h-screen bg-[#08080a] text-white pt-24 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-indigo-600/[0.05] rounded-full blur-[128px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6">
            <Eye className="w-3.5 h-3.5" />
            Visual AI Platform
          </div>
          <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.1] mb-6">
            <span className="text-white">Features Built for</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Enterprise Scale
            </span>
          </h1>
          <p className="text-[17px] text-white/50 max-w-2xl mx-auto">
            Everything you need for AI-powered customer support. Visual AI, voice, text,
            knowledge base, and enterprise security - unified in one platform.
          </p>
        </div>

        {/* Feature Categories */}
        <div className="space-y-24">
          {FEATURE_CATEGORIES.map((category) => (
            <section key={category.title}>
              {/* Category Header */}
              <div className="mb-10">
                <h2 className="text-[28px] sm:text-[32px] font-bold text-white tracking-[-0.02em] mb-2">
                  {category.title}
                </h2>
                <p className="text-[15px] text-white/40">{category.description}</p>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-2 gap-5">
                {category.features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group relative rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                  >
                    {feature.highlight && (
                      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                        {feature.highlight}
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                      <feature.icon className="w-5 h-5 text-white/60 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-[14px] text-white/40 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="mt-24 rounded-[24px] bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.04] border border-indigo-500/20 p-8 sm:p-12">
          <div className="text-center mb-10">
            <h2 className="text-[28px] sm:text-[32px] font-bold text-white tracking-[-0.02em] mb-3">
              Why VisualKit?
            </h2>
            <p className="text-[15px] text-white/50">See what sets us apart from traditional support tools</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-[40px] font-bold text-indigo-400 mb-2">75%</div>
              <div className="text-[14px] text-white/70 mb-1">Cost Reduction</div>
              <div className="text-[13px] text-white/40">vs single-model pricing</div>
            </div>
            <div className="text-center">
              <div className="text-[40px] font-bold text-emerald-400 mb-2">&lt;500ms</div>
              <div className="text-[14px] text-white/70 mb-1">Response Latency</div>
              <div className="text-[13px] text-white/40">real-time voice + vision</div>
            </div>
            <div className="text-center">
              <div className="text-[40px] font-bold text-purple-400 mb-2">99.9%</div>
              <div className="text-[14px] text-white/70 mb-1">Uptime SLA</div>
              <div className="text-[13px] text-white/40">enterprise-grade reliability</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white mb-4">
            Ready to See Visual AI in Action?
          </h2>
          <p className="text-[16px] text-white/40 mb-8 max-w-lg mx-auto">
            Start with our free tier - includes Visual AI, voice, and text.
            No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={openModal}
              className="h-12 px-8 text-[15px] rounded-2xl bg-white text-[#08080a] hover:bg-white/95 font-semibold"
            >
              Start Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              asChild
              className="h-12 px-8 text-[15px] rounded-2xl border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05]"
            >
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
