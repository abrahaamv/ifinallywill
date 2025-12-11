/**
 * About Page - Dark Theme
 * Matches the professional design system
 */

import { ArrowRight, Eye, Target, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@platform/ui';
import { useComingSoon } from '../context/ComingSoonContext';

const VALUES = [
  {
    icon: Target,
    title: 'Cost Efficiency',
    description: 'We optimize every interaction to deliver maximum value at minimum cost. Our intelligent routing achieves $0.50/1M tokens - 97% below industry standard.',
  },
  {
    icon: Zap,
    title: 'Enterprise Quality',
    description: 'No compromises on quality, security, or reliability. Built for mission-critical deployments with SOC 2 compliance and 99.9% uptime SLA.',
  },
  {
    icon: Users,
    title: 'Developer First',
    description: 'Type-safe APIs, comprehensive docs, and embeddable widgets. We prioritize developer experience in every decision we make.',
  },
];

const TECH_STACK = [
  {
    title: 'Visual AI Architecture',
    description: 'Real-time screen sharing with Gemini 2.0 Flash Live API. Native voice, vision, and text - unified in sub-500ms latency interactions.',
  },
  {
    title: 'Intelligent Model Routing',
    description: 'Automatic selection: Gemini Flash for 85% routine tasks, Claude for 15% complex reasoning. Achieves 75-85% cost reduction.',
  },
  {
    title: 'Enterprise Infrastructure',
    description: 'PostgreSQL 16+ with Row-Level Security, Redis Streams for real-time messaging, Auth.js authentication, Drizzle ORM for type-safe queries.',
  },
  {
    title: 'Modern Frontend Stack',
    description: 'React 18 + Vite 6, Tailwind CSS v4, shadcn/ui components, and tRPC for type-safe client-server communication.',
  },
];

export function AboutPage() {
  const { openModal } = useComingSoon();

  return (
    <div className="min-h-screen bg-[#08080a] text-white pt-24 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-[128px]" />
        <div className="absolute bottom-[30%] right-[5%] w-[400px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6">
            <Eye className="w-3.5 h-3.5" />
            About VisualKit
          </div>
          <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.1] mb-6">
            <span className="text-white">Building the Future of</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              AI Customer Support
            </span>
          </h1>
          <p className="text-[17px] text-white/50 max-w-2xl mx-auto">
            We believe AI should be accessible, affordable, and powerful for every organization.
            Our mission is to democratize enterprise-grade AI capabilities.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-24">
          <div className="rounded-[24px] bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.04] border border-indigo-500/20 p-8 sm:p-12">
            <h2 className="text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.02em] mb-6 text-center">
              Our Mission
            </h2>
            <div className="space-y-5 text-[16px] text-white/60 leading-relaxed">
              <p>
                Customer support AI is broken. Enterprise tools charge $15-30 per 1M tokens while
                delivering text-only interactions. Support agents waste hours asking customers
                to describe what they see on screen.
              </p>
              <p>
                We built VisualKit to fix this. Our Visual AI sees customer screens in real-time,
                eliminating the back-and-forth. Combined with intelligent model routing, we deliver
                enterprise-grade AI at <span className="text-white font-medium">$0.50/1M tokens</span> - a 97% cost reduction.
              </p>
              <p>
                By making advanced AI assistance financially viable for businesses of all sizes,
                we're enabling faster resolutions, happier customers, and teams that can focus on
                complex problems instead of routine queries.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-24">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.02em] mb-10 text-center">
            Our Values
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="group rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                  <value.icon className="w-5 h-5 text-white/60 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Section */}
        <section className="mb-24">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.02em] mb-10 text-center">
            Our Technology
          </h2>
          <div className="space-y-4">
            {TECH_STACK.map((tech) => (
              <div
                key={tech.title}
                className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.03] transition-colors"
              >
                <h3 className="text-[16px] font-semibold text-white mb-2">{tech.title}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed">{tech.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-24">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-[32px] font-bold text-indigo-400 mb-1">97%</div>
              <div className="text-[13px] text-white/40">Cost Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-[32px] font-bold text-emerald-400 mb-1">&lt;500ms</div>
              <div className="text-[13px] text-white/40">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-[32px] font-bold text-purple-400 mb-1">99.9%</div>
              <div className="text-[13px] text-white/40">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-[32px] font-bold text-pink-400 mb-1">100+</div>
              <div className="text-[13px] text-white/40">Languages</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white mb-4">
            Join Us in Building the Future
          </h2>
          <p className="text-[16px] text-white/40 mb-8 max-w-lg mx-auto">
            Start with our free tier and see Visual AI in action.
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
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
