/**
 * PricingSection — pricing cards with package comparison
 * Off-white (#F5F5F7) background, 3 cards
 */

import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

const PLANS: PricingPlan[] = [
  {
    name: 'Basic Will',
    price: '$49',
    period: 'one-time',
    description: 'Perfect for individuals with straightforward estate planning needs.',
    features: [
      'Primary Will',
      'AI-guided process',
      'Legally valid in your province',
      'Download & print',
      'Edit anytime',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Complete Plan',
    price: '$99',
    period: 'one-time',
    description: 'Everything you need for comprehensive estate protection.',
    features: [
      'Primary Will',
      'Power of Attorney (Property)',
      'Power of Attorney (Health)',
      'AI assistant Wilfred',
      'Secondary Will (where applicable)',
      'Document storage',
      '60-day money-back guarantee',
    ],
    highlighted: true,
    cta: 'Most Popular',
  },
  {
    name: 'Couples Plan',
    price: '$149',
    period: 'one-time',
    description: 'Plan together with your partner and save.',
    features: [
      'Everything in Complete Plan',
      'For both partners',
      'Mirrored wills option',
      'Joint planning dashboard',
      'Spousal POA documents',
      'Priority support',
    ],
    cta: 'Best Value',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-brand-offwhite py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">
            Choose Your Package
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-brand-blue">
            Start free, review everything, and pay only when you&apos;re ready to finalize.
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 transition-all hover:-translate-y-1 ${
                plan.highlighted
                  ? 'border-2 border-brand-gold bg-white shadow-card-lg'
                  : 'border border-gray-200 bg-white shadow-card'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-gold px-4 py-1 text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-brand-navy">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-brand-blue">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-gray-600">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`mt-8 block rounded-full py-3.5 text-center text-base font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-brand-blue text-white hover:bg-brand-navy shadow-lg'
                    : 'border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <div className="mt-16 flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          <div className="order-1 lg:order-none">
            <img
              src="/images/60DaysGood.png"
              alt="60-Day Money-Back Guarantee"
              className="max-w-[320px] sm:max-w-[380px] lg:max-w-[440px] h-auto object-contain"
            />
          </div>
          <div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-blue">
              Our Guarantee
            </h3>
            <p className="mt-4 text-lg sm:text-xl lg:text-2xl text-black/80 leading-relaxed">
              If you purchase any iFinallyWill plan and decide not to complete your will, you can
              cancel within 60 days of purchase and receive a full refund — no questions asked.
            </p>
            <p className="mt-3 text-lg sm:text-xl lg:text-2xl text-black/80 leading-relaxed">
              We don&apos;t push, we don&apos;t pressure; if the timing isn&apos;t right, you get
              your money back. Simple.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
