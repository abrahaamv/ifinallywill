/**
 * Pricing Page - Dark Theme
 * Aligned with guide.md specifications
 */

import { Button } from '@platform/ui';
import { ArrowRight, Check, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useComingSoon } from '../context/ComingSoonContext';

// Guide-aligned pricing structure
const PRICING_PLANS = [
  {
    name: 'Free',
    price: 0,
    annualPrice: 0,
    description: 'For individuals and small projects getting started',
    highlight: false,
    cta: 'Start Free',
    ctaHref: '#',
    limits: {
      conversations: '100/mo',
      teamMembers: '1',
    },
    features: [
      'Visual AI assistance',
      'Text chat',
      'Basic knowledge base',
      'Community support',
      'Widget customization',
      'Email notifications',
    ],
    excluded: ['Meeting rooms', 'Recording', 'API access'],
  },
  {
    name: 'Pro',
    price: 49,
    annualPrice: 39,
    description: 'For growing teams with higher volume needs',
    highlight: true,
    cta: 'Start 14-Day Trial',
    ctaHref: '#',
    limits: {
      conversations: '1,000/mo',
      teamMembers: '5',
    },
    features: [
      'Everything in Free',
      'Voice AI',
      'Screen sharing',
      'Advanced analytics',
      'Priority support',
      'Custom AI training',
      'Slack integration',
      'API access (limited)',
    ],
    excluded: ['Meeting rooms', 'Recording'],
  },
  {
    name: 'Business',
    price: 149,
    annualPrice: 119,
    description: 'For teams needing meetings and advanced features',
    highlight: false,
    cta: 'Start 14-Day Trial',
    ctaHref: '#',
    limits: {
      conversations: '5,000/mo',
      teamMembers: '15',
    },
    features: [
      'Everything in Pro',
      'Meeting rooms',
      'Recording & transcription',
      'Full API access',
      'SSO (SAML)',
      'Audit logs',
      'Custom integrations',
      'Dedicated onboarding',
    ],
    excluded: [],
  },
  {
    name: 'Enterprise',
    price: null,
    annualPrice: null,
    description: 'For organizations with custom requirements',
    highlight: false,
    cta: 'Contact Sales',
    ctaHref: '/contact',
    limits: {
      conversations: 'Unlimited',
      teamMembers: 'Unlimited',
    },
    features: [
      'Everything in Business',
      'Self-hosted option',
      'Custom SLAs',
      'Dedicated success manager',
      'Priority roadmap input',
      'Custom AI models',
      'Volume discounts',
      'HIPAA compliance (add-on)',
    ],
    excluded: [],
  },
];

const FAQ_ITEMS = [
  {
    question: 'What counts as a "conversation"?',
    answer: 'A conversation is a complete interaction session between your customer and the AI, regardless of how many messages are exchanged. If a customer chats for 5 minutes with 20 messages, that\'s 1 conversation.',
  },
  {
    question: 'Is Visual AI included in all plans?',
    answer: 'Yes! Visual AI (screen sharing with AI) is included in all plans, including Free. This is our core differentiator - no competitor offers this at any price.',
  },
  {
    question: 'Is the free tier really free forever?',
    answer: 'Yes. 100 AI conversations per month, forever. No credit card required. We make money when you grow and need more capacity.',
  },
  {
    question: 'What happens if I exceed my conversation limit?',
    answer: 'We\'ll notify you at 80% and 100%. If exceeded, your widget continues working but new conversations are queued until the next billing cycle or you upgrade.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Absolutely. Changes take effect immediately when upgrading (prorated) or at the next billing cycle when downgrading.',
  },
];

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const { openModal } = useComingSoon();

  return (
    <div className="min-h-screen bg-[#08080a] text-white pt-24 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[5%] w-[500px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[128px]" />
        <div className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-purple-600/[0.05] rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6">
            Simple Pricing
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-[-0.03em] mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-[17px] text-white/50 max-w-2xl mx-auto mb-10">
            All plans include Visual AI - the only AI that can see your customers' screens.
            No hidden fees, no per-resolution charges.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-[14px] font-medium ${!isAnnual ? 'text-white' : 'text-white/40'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                isAnnual ? 'bg-indigo-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-[14px] font-medium ${isAnnual ? 'text-white' : 'text-white/40'}`}>
              Annual
              <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[20px] bg-white/[0.02] border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'border-white/[0.06]'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-500 text-[11px] font-semibold text-white">
                  Most Popular
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <h3 className="text-[18px] font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-[13px] text-white/40 min-h-[40px]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.price !== null ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[40px] font-bold text-white tracking-tight">
                        ${isAnnual ? plan.annualPrice : plan.price}
                      </span>
                      <span className="text-[15px] text-white/40">/month</span>
                    </div>
                    {isAnnual && plan.annualPrice !== plan.price && (
                      <p className="text-[12px] text-white/30 mt-1">
                        Billed annually (${(plan.annualPrice ?? 0) * 12}/year)
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-[32px] font-bold text-white">Custom</div>
                )}
              </div>

              {/* Usage Summary */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-white/50">Conversations</span>
                  <span className="text-[13px] font-medium text-white">{plan.limits.conversations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-white/50">Team members</span>
                  <span className="text-[13px] font-medium text-white">{plan.limits.teamMembers}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[13px] text-white/70">{feature}</span>
                  </li>
                ))}
                {plan.excluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0" />
                    <span className="text-[13px] text-white/30">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={plan.name === 'Enterprise' ? undefined : openModal}
                asChild={plan.name === 'Enterprise'}
                className={`w-full h-11 text-[14px] rounded-xl font-semibold ${
                  plan.highlight
                    ? 'bg-white text-[#08080a] hover:bg-white/90'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                {plan.name === 'Enterprise' ? (
                  <Link to="/contact">
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Note */}
        <div className="rounded-[20px] bg-indigo-500/[0.08] border border-indigo-500/20 p-8 text-center mb-20">
          <h3 className="text-[18px] font-semibold text-white mb-4">Compare to Competitors</h3>
          <div className="grid sm:grid-cols-3 gap-6 text-[14px]">
            <div>
              <div className="text-white/50 mb-1">Intercom</div>
              <div className="text-white">$29/seat + $0.99/resolution</div>
              <div className="text-white/40 text-[12px]">~$1,135/mo for 5 users</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Drift</div>
              <div className="text-white">$2,500/month</div>
              <div className="text-white/40 text-[12px]">No free tier</div>
            </div>
            <div>
              <div className="text-indigo-400 mb-1">VisualKit Pro</div>
              <div className="text-white font-semibold">$49/month</div>
              <div className="text-white/40 text-[12px]">+ Visual AI included</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[28px] sm:text-[36px] font-bold text-white text-center mb-12 tracking-[-0.02em]">
            Pricing FAQ
          </h2>

          <div className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] px-6 sm:px-8">
            {FAQ_ITEMS.map((item, index) => (
              <div key={item.question} className="border-b border-white/[0.06] last:border-b-0">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="text-[15px] font-medium text-white group-hover:text-white/80 transition-colors pr-4">
                    {item.question}
                  </span>
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-transform duration-200 flex-shrink-0 ${openFAQ === index ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFAQ === index ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                  <p className="text-[14px] text-white/40 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-20">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white mb-4">
            Not sure which plan?
          </h2>
          <p className="text-[16px] text-white/40 mb-8">
            Start free and upgrade anytime. No credit card required.
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
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
