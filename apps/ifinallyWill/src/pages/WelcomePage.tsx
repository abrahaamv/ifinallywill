/**
 * Public landing page — hero, features, trust signals, CTA
 */

import { DOCUMENT_TYPES, BUNDLE_PRICE } from '../config/documents';

export function WelcomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="ifw-landing-hero py-20 md:py-28 px-6 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-3xl mx-auto leading-tight">
          Your Will, Finally Done
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 opacity-90">
          Create your legally valid will and powers of attorney in under 20 minutes.
          Guided by AI. Affordable for everyone.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/register"
            className="ifw-landing-cta inline-block px-8 py-3 rounded-lg text-lg"
          >
            Get Started — From $89
          </a>
          <a
            href="/how-it-works"
            className="inline-block px-8 py-3 rounded-lg text-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
          >
            How It Works
          </a>
        </div>
        <p className="mt-6 text-sm opacity-70">
          Trusted by 10,000+ Canadians. No lawyer required.
        </p>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Everything You Need to Protect Your Family
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--ifw-text-muted)]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-16 px-6 bg-[var(--ifw-neutral-50)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-[var(--ifw-text-muted)] mb-10">
            No hidden fees. No subscriptions. Pay once, yours forever.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {DOCUMENT_TYPES.map((doc) => (
              <div key={doc.type} className="bg-white border border-[var(--ifw-border)] rounded-xl p-5 text-center">
                <span className="text-3xl">{doc.icon}</span>
                <h3 className="font-semibold mt-3 text-sm">{doc.name}</h3>
                <p className="text-2xl font-bold mt-2">${doc.price}</p>
                <p className="text-xs text-[var(--ifw-text-muted)] mt-1">{doc.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-block bg-white border-2 border-[var(--ifw-primary-500)] rounded-xl p-6">
              <div className="text-sm font-medium text-[var(--ifw-primary-700)] mb-1">Complete Bundle</div>
              <div className="text-3xl font-bold">${BUNDLE_PRICE}</div>
              <div className="text-xs text-[var(--ifw-text-muted)] mt-1">All 4 documents — Save ${DOCUMENT_TYPES.reduce((s, d) => s + d.price, 0) - BUNDLE_PRICE}</div>
              <a
                href="/register"
                className="mt-4 inline-block px-6 py-2 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: 'var(--ifw-primary-700)' }}
              >
                Get the Bundle
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">Why Canadians Choose IFinallyWill</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4">
            <div className="text-3xl mb-3">🇨🇦</div>
            <h3 className="font-semibold mb-1">Province-Specific</h3>
            <p className="text-sm text-[var(--ifw-text-muted)]">
              Templates tailored to your province&apos;s estate laws
            </p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold mb-1">AI-Guided</h3>
            <p className="text-sm text-[var(--ifw-text-muted)]">
              Wilfred AI helps you every step — no legal jargon
            </p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-1">Bank-Level Security</h3>
            <p className="text-sm text-[var(--ifw-text-muted)]">
              Your data is encrypted and never shared
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="ifw-landing-hero py-16 px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Don&apos;t Put It Off Any Longer
        </h2>
        <p className="text-lg opacity-90 max-w-xl mx-auto mb-6">
          Join thousands of Canadians who finally got their estate planning done.
        </p>
        <a
          href="/register"
          className="ifw-landing-cta inline-block px-8 py-3 rounded-lg text-lg"
        >
          Start Your Will Today
        </a>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: '⚡',
    title: 'Done in 20 Minutes',
    description: 'Our step-by-step wizard guides you through every section. Auto-save means you can come back anytime.',
  },
  {
    icon: '🎩',
    title: 'AI Assistant — Wilfred',
    description: 'Stuck on a question? Wilfred explains legal concepts in plain language, right in the sidebar.',
  },
  {
    icon: '👫',
    title: 'Couples Plans',
    description: 'Create matching wills and POAs for you and your partner. Mirror documents with one click.',
  },
  {
    icon: '📋',
    title: 'Powers of Attorney',
    description: 'Property and health care POAs — choose who makes decisions when you can\'t.',
  },
  {
    icon: '📄',
    title: 'Instant PDF Download',
    description: 'Generate your legally valid documents instantly. Print, sign, and witness.',
  },
  {
    icon: '💰',
    title: 'Fraction of Lawyer Cost',
    description: 'Starting at $89 vs $1,000+ at a law firm. Same legal validity.',
  },
];
