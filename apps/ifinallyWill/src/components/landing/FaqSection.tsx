/**
 * FaqSection — FAQ accordion on gold background
 * With child-kite image on left (desktop)
 */

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'Do I still need to visit a lawyer?',
    a: 'No. Our documents are created based on decades of legal experience and meet all provincial requirements. However, for complex estates (e.g., businesses, properties in multiple countries), you may want to consult a lawyer.',
  },
  {
    q: 'What if I have a blended family?',
    a: 'Our platform handles blended families beautifully. You can specify step-children, children from previous relationships, and set up specific bequests for each family member.',
  },
  {
    q: 'What happens if my life situation changes?',
    a: 'You can update your will anytime at no extra cost. Life changes like marriage, divorce, new children, or moving provinces are all handled through our easy update process.',
  },
  {
    q: "Where should I store my will once it's signed?",
    a: 'Keep the original signed will in a secure, accessible location. Inform your executor where it is. We recommend a fireproof safe at home, a safety deposit box, or with your lawyer.',
  },
  {
    q: 'Do I need a will even if my spouse will inherit everything?',
    a: 'Yes! Without a will, provincial intestacy laws determine distribution — which may not match your wishes. A will also names guardians for minor children, which intestacy cannot do.',
  },
  {
    q: 'What is a primary will?',
    a: "A primary will covers assets that require probate (real estate, bank accounts, investments). It's the main document that governs the distribution of your estate.",
  },
  {
    q: 'What is a secondary will and when would I need one?',
    a: "A secondary will covers assets that don't require probate (private company shares, personal property). Available in Ontario and BC, it can save thousands in probate fees.",
  },
  {
    q: 'Can I have both primary and secondary wills?',
    a: 'Yes! In Ontario and British Columbia, having both a primary and secondary will is a common and recommended strategy to minimize probate fees on eligible assets.',
  },
  {
    q: 'Will a secondary will affect my everyday assets?',
    a: 'No. Your primary will handles everyday assets like bank accounts and real estate. The secondary will only covers specific probate-exempt assets like private company shares.',
  },
] as const;

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <span className="pr-4 text-base font-semibold text-gray-800">{question}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{answer}</div>}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="bg-brand-gold py-20 min-h-[50vh] relative">
      {/* Top divider */}
      <svg
        className="absolute -top-6 left-0 right-0 h-[60px]"
        viewBox="0 0 1440 60"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M0,20 C480,0 960,40 1440,10 L1440,60 L0,60 Z" fill="#FFBF00" />
      </svg>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center">
          <h2
            className="font-extrabold text-brand-blue"
            style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}
          >
            Got any questions?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-black/80">
            We&apos;ve answered the most common questions in plain language to help you feel
            confident about getting your will done — without legal jargon or guesswork.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-5">
          {/* Image (desktop only) */}
          <div className="hidden lg:col-span-2 lg:block">
            <img
              src="/images/I%20Finally%20Will%20Design_img/gay_kid.png"
              alt="Child with kite"
              className="mx-auto max-h-[500px] object-contain"
            />
          </div>

          {/* FAQ accordion */}
          <div className="space-y-3 lg:col-span-3">
            {FAQ_ITEMS.map(({ q, a }) => (
              <FaqItem key={q} question={q} answer={a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
