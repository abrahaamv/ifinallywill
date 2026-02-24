/**
 * Pricing page — document prices, bundle offer, comparison
 */

import { DOCUMENT_TYPES, BUNDLE_PRICE, BUNDLE_SAVINGS } from '../config/documents';

export function PricingPage() {
  const totalIndividual = DOCUMENT_TYPES.reduce((s, d) => s + d.price, 0);

  return (
    <div>
      <section className="ifw-landing-hero py-16 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Simple pricing. No subscriptions. Pay once, yours forever.
        </p>
      </section>

      <section className="py-16 px-6 max-w-5xl mx-auto">
        {/* Individual documents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {DOCUMENT_TYPES.map((doc) => (
            <div key={doc.type} className="border border-[var(--ifw-border)] rounded-xl p-6 text-center">
              <span className="text-4xl">{doc.icon}</span>
              <h3 className="font-semibold mt-4">{doc.name}</h3>
              <p className="text-3xl font-bold mt-3">${doc.price}</p>
              <p className="text-xs text-[var(--ifw-text-muted)] mt-2">{doc.description}</p>
              <a href="/register" className="mt-4 block text-sm font-medium py-2 rounded-lg border border-[var(--ifw-primary-500)] text-[var(--ifw-primary-700)] hover:bg-[var(--ifw-primary-50)]">
                Get Started
              </a>
            </div>
          ))}
        </div>

        {/* Bundle */}
        <div className="border-2 border-[var(--ifw-primary-500)] rounded-xl p-8 text-center max-w-lg mx-auto">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--ifw-primary-700)] mb-2">
            Best Value
          </div>
          <h2 className="text-2xl font-bold">Complete Estate Bundle</h2>
          <p className="text-sm text-[var(--ifw-text-muted)] mt-2">
            All 4 documents — Will, Secondary Will, POA Property, POA Health
          </p>
          <div className="mt-4">
            <span className="text-4xl font-bold">${BUNDLE_PRICE}</span>
            <span className="text-lg text-[var(--ifw-text-muted)] line-through ml-3">${totalIndividual}</span>
          </div>
          <p className="text-sm text-[var(--ifw-success)] font-medium mt-1">
            Save ${BUNDLE_SAVINGS}
          </p>
          <a href="/register" className="mt-6 inline-block px-8 py-3 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: 'var(--ifw-primary-700)' }}>
            Get the Bundle
          </a>
        </div>

        {/* Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">How We Compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4 text-[var(--ifw-primary-700)]">IFinallyWill</th>
                  <th className="text-center py-3 px-4 text-[var(--ifw-text-muted)]">Lawyer</th>
                  <th className="text-center py-3 px-4 text-[var(--ifw-text-muted)]">DIY Kit</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="py-3 px-4 text-center">{row.ifw}</td>
                    <td className="py-3 px-4 text-center text-[var(--ifw-text-muted)]">{row.lawyer}</td>
                    <td className="py-3 px-4 text-center text-[var(--ifw-text-muted)]">{row.diy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

const COMPARISON = [
  { feature: 'Will + 2 POAs', ifw: '$189', lawyer: '$1,500+', diy: '$50-100' },
  { feature: 'Time to Complete', ifw: '20 min', lawyer: '2-4 weeks', diy: '2-5 hours' },
  { feature: 'AI Guidance', ifw: '✅', lawyer: '❌', diy: '❌' },
  { feature: 'Province-Specific', ifw: '✅', lawyer: '✅', diy: '⚠️ Generic' },
  { feature: 'Couples Support', ifw: '✅', lawyer: '✅ (extra cost)', diy: '❌' },
  { feature: 'Instant Download', ifw: '✅', lawyer: '❌', diy: '✅' },
  { feature: 'Legally Valid', ifw: '✅', lawyer: '✅', diy: '⚠️ If done right' },
];
