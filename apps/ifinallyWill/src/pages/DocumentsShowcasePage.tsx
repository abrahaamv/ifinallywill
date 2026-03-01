/**
 * DocumentsShowcasePage — interactive document showcase with expandable cards
 * Pixel-perfect clone from source DocumentsShowcase.jsx
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
};

/* ─── Document Card ─── */
interface DocumentType {
  id: number;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  features: string[];
  bestFor: string[];
}

function DocumentCard({
  document,
  isExpanded,
  onToggle,
}: { document: DocumentType; isExpanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      className="bg-white rounded-xl overflow-hidden transition-all duration-300"
      style={{
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        border: isExpanded ? `2px solid ${colors.blue}` : '2px solid transparent',
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)', y: -4 }}
    >
      {/* Header */}
      <div className="p-6 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.blue }}
            >
              {document.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1" style={{ color: colors.navy }}>
                {document.title}
              </h3>
              <p className="text-sm" style={{ color: '#666666' }}>
                {document.shortDesc}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2"
            style={{ color: colors.blue }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0" style={{ borderTop: '1px solid #E5E7EB' }}>
              <div className="pt-6">
                <h4 className="font-semibold mb-3" style={{ color: colors.navy }}>
                  What&apos;s Included:
                </h4>
                <ul className="space-y-2 mb-6">
                  {document.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2" style={{ color: '#666666' }}>
                      <svg
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                        style={{ color: '#4CAF50' }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <h4 className="font-semibold mb-3" style={{ color: colors.navy }}>
                  Best For:
                </h4>
                <ul className="space-y-2 mb-6">
                  {document.bestFor.map((item, index) => (
                    <li key={index} className="flex items-start gap-2" style={{ color: '#666666' }}>
                      <svg
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                        style={{ color: colors.blue }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register?start=1"
                  className="inline-flex items-center justify-center w-full px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:opacity-90"
                  style={{ backgroundColor: colors.blue, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                  Start for Free Now
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Document Data ─── */
const documents: DocumentType[] = [
  {
    id: 1,
    title: 'Primary Will',
    shortDesc: 'Your main estate planning document',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    features: [
      'Province specific legal compliance',
      'Executor appointment',
      'Beneficiary designation',
      'Guardianship provisions (if applicable)',
      'Asset distribution instructions',
      'Clear signing and witnessing requirements',
    ],
    bestFor: [
      'Individuals with straightforward estates',
      'First time will creators',
      'Single adults without complex assets',
    ],
  },
  {
    id: 2,
    title: 'Secondary Will',
    shortDesc: 'For business assets and private company shares',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    features: [
      'Separate probate process for business assets',
      'Reduced probate fees',
      'Private company share distribution',
      'Business asset protection',
      'Coordinated with primary will',
      'Province specific compliance',
    ],
    bestFor: [
      'Business owners',
      'Private company shareholders',
      'Those with corporate assets',
      'People wanting to reduce probate costs',
    ],
  },
  {
    id: 3,
    title: 'Spousal Will',
    shortDesc: 'Coordinated wills for couples',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    features: [
      'Two coordinated wills',
      'Mirrored estate planning',
      'Shared guardianship decisions',
      'Coordinated asset distribution',
      'Conflict prevention',
      'Aligned executor appointments',
    ],
    bestFor: [
      'Married couples',
      'Common law partners',
      'Couples with shared assets',
      'Families with children',
    ],
  },
  {
    id: 4,
    title: 'Power of Attorney for Property',
    shortDesc: 'Financial decision-making authority',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    features: [
      'Financial management authority',
      'Banking and investment decisions',
      'Property management',
      'Bill payment authorization',
      'Business decision making',
      'Province specific compliance',
    ],
    bestFor: [
      'Property owners',
      'Business owners',
      'Those with investments',
      'Anyone wanting financial protection',
    ],
  },
  {
    id: 5,
    title: 'Power of Attorney for Health',
    shortDesc: 'Healthcare decision-making authority',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    features: [
      'Medical decision making authority',
      'Treatment consent decisions',
      'Healthcare provider selection',
      'End of life care preferences',
      'Personal care decisions',
      'Province specific compliance',
    ],
    bestFor: [
      'Everyone over 18',
      'Those with specific healthcare preferences',
      'People with chronic conditions',
      'Anyone wanting healthcare protection',
    ],
  },
];

/* ─── Main Component ─── */
export function DocumentsShowcasePage() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Handle URL parameters to auto-expand documents
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const expandDocs = urlParams.get('expand');
    if (expandDocs) {
      const docIdMap: Record<string, number> = {
        'primary-will': 1,
        'secondary-will': 2,
        'spousal-will': 3,
        'poa-property': 4,
        'poa-health': 5,
      };
      const idsToExpand = expandDocs
        .split(',')
        .map((id) => docIdMap[id])
        .filter((id): id is number => id != null);
      if (idsToExpand.length > 0) {
        setExpandedIds(new Set(idsToExpand));
        setTimeout(() => {
          const element = document.getElementById(`document-${idsToExpand[0]}`);
          if (element) {
            const pos = element.getBoundingClientRect().top + window.pageYOffset - 100;
            requestAnimationFrame(() => {
              window.scrollTo({ top: pos, behavior: 'smooth' });
            });
          }
        }, 100);
      }
    }
  }, []);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow">
        {/* Hero Section */}
        <section
          className="relative pt-32 pb-28 overflow-hidden"
          style={{ backgroundColor: colors.navy }}
        >
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="docGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#docGrid)" />
            </svg>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Complete Estate Planning
              </h1>
              <p className="text-lg text-gray-200 max-w-3xl mx-auto leading-relaxed mt-4">
                Did You Know? Over 50% of Canadians don&apos;t have a will. By starting, you&apos;re
                already ahead of the curve in planning for your family&apos;s future!
              </p>
            </motion.div>
          </div>
        </section>

        {/* Documents Grid - Gold Background */}
        <section className="py-20" style={{ backgroundColor: colors.gold }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: colors.navy }}>
                Design Your Estate Plan
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.navy, opacity: 0.8 }}>
                Click on any document to learn more about what&apos;s included and who it&apos;s
                best for.
              </p>
            </motion.div>
            <div className="max-w-4xl mx-auto space-y-6">
              {documents.map((doc) => (
                <div key={doc.id} id={`document-${doc.id}`}>
                  <DocumentCard
                    document={doc}
                    isExpanded={expandedIds.has(doc.id)}
                    onToggle={() => toggleExpanded(doc.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20" style={{ backgroundColor: colors.offwhite }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Why Choose iFinallyWill?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Every document is crafted with precision and backed by legal expertise.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  ),
                  title: 'Province Specific',
                  description:
                    "Documents tailored to your province's legal requirements, not generic templates.",
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  ),
                  title: 'Guided Process',
                  description:
                    'Step-by-step guidance with plain-language explanations at every stage.',
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  ),
                  title: 'Execution Instructions',
                  description:
                    'Clear signing and witnessing instructions to ensure legal validity.',
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: `${colors.gold}30`, color: colors.blue }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20" style={{ backgroundColor: colors.blue }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Create your complete estate plan in minutes. Province-compliant documents, guided
                process, and peace of mind.
              </p>
              <Link
                to="/register?start=1"
                className="inline-flex items-center px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: colors.gold, color: colors.blue }}
              >
                Start for Free
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
