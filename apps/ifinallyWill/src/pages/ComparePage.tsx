/**
 * ComparePage -- platform comparison with competitors
 *
 * Pixel-perfect port of the legacy Compare.jsx + inline ComparisonSection.
 * Wrapped by LandingLayout (which provides navbar + footer).
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Brand tokens                                                       */
/* ------------------------------------------------------------------ */

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
} as const;

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeInUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Comparison data                                                    */
/* ------------------------------------------------------------------ */

interface FeatureRow {
  name: string;
  us: boolean;
  them: boolean | string;
}

const featureComparison: FeatureRow[] = [
  { name: 'Province-specific legal documents', us: true, them: 'Varies' },
  { name: 'Powers of Attorney included', us: true, them: 'Extra cost' },
  { name: 'Built by licensed lawyers', us: true, them: false },
  {
    name: "Corporate Will included at no extra charge (we're the only ones!)",
    us: true,
    them: false,
  },
  { name: 'Avoid probate on corporate assets - save thousands!', us: true, them: false },
  { name: 'Unlimited revisions', us: true, them: 'Limited' },
  { name: 'Spousal/couples plans', us: true, them: true },
  { name: 'Instant document generation', us: true, them: true },
  { name: '24/7 online access', us: true, them: true },
];

/* ------------------------------------------------------------------ */
/*  Helper: render check / X / badge                                   */
/* ------------------------------------------------------------------ */

function renderFeatureValue(value: boolean | string): React.ReactNode {
  if (value === true) {
    return <span className="text-green-500 font-bold text-lg">&#10003;</span>;
  }
  if (value === false) {
    return <span className="text-red-500 font-bold text-lg">&#10007;</span>;
  }
  if (typeof value === 'string' && value.length > 0) {
    const isNegative = ['Extra cost', 'Limited', 'Varies'].includes(value);
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          isNegative ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
        }`}
      >
        {value}
      </span>
    );
  }
  return <span className="text-gray-300 font-bold text-lg">&#10007;</span>;
}

/* ------------------------------------------------------------------ */
/*  Inline ComparisonSection                                           */
/* ------------------------------------------------------------------ */

function ComparisonSection() {
  return (
    <section className="py-24" style={{ backgroundColor: colors.offwhite }} id="comparison-section">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          variants={fadeInUpVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="text-sm font-bold tracking-widest uppercase mb-4"
            style={{ color: colors.blue }}
          >
            COMPARE &amp; SAVE
          </p>
          <h2
            className="font-extrabold mb-4"
            style={{ color: colors.blue, fontSize: 'clamp(28px, 5vw, 48px)' }}
          >
            Us vs Them
          </h2>
          <p className="mt-3 text-black/70 max-w-3xl mx-auto text-lg">
            See how much you save with our straightforward pricing
          </p>
        </motion.div>

        {/* Pricing comparison table */}
        <motion.div
          className="bg-white rounded-[28px] overflow-hidden ring-1 ring-black/10 shadow-xl"
          variants={fadeInUpVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.blue }}>
                <tr>
                  <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-wider text-white">
                    Package
                  </th>
                  <th className="px-6 py-5 text-center text-sm font-semibold uppercase tracking-wider text-white">
                    <div className="flex items-center justify-center">
                      <span className="font-extrabold text-xl" style={{ color: colors.gold }}>
                        Us
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-5 text-center text-sm font-semibold uppercase tracking-wider text-white">
                    <div className="flex items-center justify-center">
                      <span className="font-extrabold text-xl text-white/60">Them</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {/* Basic Will */}
                <tr className="hover:bg-black/[0.03] transition-all duration-200 group">
                  <td className="px-6 py-6 text-base font-semibold" style={{ color: colors.ink }}>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-4 transition-transform duration-200 group-hover:scale-125"
                        style={{ backgroundColor: colors.blue }}
                      />
                      <div>
                        <div className="font-bold text-lg group-hover:text-opacity-90 transition-colors">
                          Basic Will
                        </div>
                        <div className="text-sm text-black/50 font-normal">1 Will document</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span
                      className="font-extrabold text-2xl transition-transform duration-200 inline-block group-hover:scale-105"
                      style={{ color: colors.blue }}
                    >
                      $89
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center text-black/40">
                    <span className="line-through text-lg">$99</span>
                  </td>
                </tr>

                {/* Complete Plan */}
                <tr
                  className="transition-all duration-200 group relative"
                  style={{ backgroundColor: `${colors.gold}15` }}
                >
                  <td
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: colors.gold }}
                  />
                  <td className="px-6 py-6 text-base font-semibold" style={{ color: colors.ink }}>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-4 transition-transform duration-200 group-hover:scale-125"
                        style={{ backgroundColor: colors.gold }}
                      />
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          Complete Plan
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm transition-transform duration-200 group-hover:scale-105"
                            style={{ backgroundColor: colors.gold, color: colors.blue }}
                          >
                            POPULAR
                          </span>
                        </div>
                        <div className="text-sm text-black/50 font-normal">
                          Will + 2 POAs (Health &amp; Property)
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span
                      className="font-extrabold text-2xl transition-transform duration-200 inline-block group-hover:scale-105"
                      style={{ color: colors.blue }}
                    >
                      $159
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center text-black/40" />
                </tr>

                {/* Couples Plan */}
                <tr className="hover:bg-black/[0.03] transition-all duration-200 group">
                  <td className="px-6 py-6 text-base font-semibold" style={{ color: colors.ink }}>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-4 transition-transform duration-200 group-hover:scale-125"
                        style={{ backgroundColor: colors.blue }}
                      />
                      <div>
                        <div className="font-bold text-lg group-hover:text-opacity-90 transition-colors">
                          Couples Plan
                        </div>
                        <div className="text-sm text-black/50 font-normal">
                          2 Wills + 4 POAs (Complete coverage for both)
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span
                      className="font-extrabold text-2xl transition-transform duration-200 inline-block group-hover:scale-105"
                      style={{ color: colors.blue }}
                    >
                      $249
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center text-black/40">
                    <span className="line-through text-lg">$329</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Savings callout */}
          <div className="px-6 py-4 text-center" style={{ backgroundColor: `${colors.gold}20` }}>
            <p className="text-sm font-semibold" style={{ color: colors.blue }}>
              Save up to <span className="font-extrabold">$140</span> compared to competitors
            </p>
          </div>
        </motion.div>

        {/* Feature comparison table */}
        <motion.div
          className="mt-12"
          variants={fadeInUpVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-xl font-bold text-center mb-6" style={{ color: colors.blue }}>
            What's Included
          </h3>
          <div className="bg-white rounded-[28px] overflow-hidden ring-1 ring-black/10 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: colors.blue }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-white">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      <span className="font-extrabold text-lg" style={{ color: colors.gold }}>
                        Us
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      <span className="font-extrabold text-lg text-white/60">Them</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {featureComparison.map((feature, index) => (
                    <tr
                      key={index}
                      className="hover:bg-black/[0.02] transition-colors duration-200 group"
                    >
                      <td className="px-6 py-4 text-base" style={{ color: colors.ink }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125"
                            style={{
                              backgroundColor: feature.us ? colors.blue : `${colors.ink}30`,
                            }}
                          />
                          <span className="font-medium">{feature.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{renderFeatureValue(feature.us)}</td>
                      <td className="px-6 py-4 text-center">{renderFeatureValue(feature.them)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ComparePage                                                        */
/* ------------------------------------------------------------------ */

export function ComparePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Spacer for fixed navbar provided by LandingLayout */}
      <div className="h-20" />

      <main className="flex-grow">
        {/* Hero Section */}
        <section
          className="relative pt-32 pb-24 overflow-hidden"
          style={{ backgroundColor: colors.navy }}
        >
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ backgroundColor: colors.gold, color: colors.blue }}
              >
                Compare Platforms
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Why Choose{' '}
                <span className="text-4xl sm:text-5xl lg:text-6xl" style={{ color: colors.gold }}>
                  iFinallyWill?
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8 px-4">
                See how our pricing, features, and legal expertise compare to other online will
                services. More documents. Better pricing. Genuine legal experience.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 px-4">
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto justify-center"
                  style={{ backgroundColor: colors.gold, color: colors.blue }}
                >
                  Start For Free
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
                <Link
                  to="/#pricing"
                  className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300 w-full sm:w-auto justify-center"
                >
                  View Pricing
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" fill={colors.offwhite}>
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" />
            </svg>
          </div>
        </section>

        {/* Comparison Table Section */}
        <ComparisonSection />

        {/* CTA Section */}
        <section className="py-20 pb-24 relative" style={{ backgroundColor: colors.blue }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to Create Your Will?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Start with our basic will for just $89 -- save up to $140 vs competitors. Get the
                protection your family deserves.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: colors.gold, color: colors.blue }}
              >
                Start For Free
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

      {/* Separator Line */}
      <div className="w-full py-0" style={{ backgroundColor: colors.blue }}>
        <div className="container mx-auto px-4">
          <div className="h-0.5 w-full" style={{ backgroundColor: colors.gold, opacity: 0.6 }} />
        </div>
      </div>

      {/* Spacer between separator and footer */}
      <div className="h-8" style={{ backgroundColor: colors.blue }} />
    </div>
  );
}
