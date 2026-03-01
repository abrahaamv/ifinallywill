/**
 * ProbatePage — comprehensive probate education page
 * Pixel-perfect clone from source Probate.jsx
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

export function ProbatePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-28 sm:pb-32 lg:pb-36 overflow-hidden bg-gradient-to-br from-[#2B2E4A] to-[#1F2937]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#0A1E86]/20 blur-[150px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#FFBF00]/15 blur-[120px]"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
          />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#heroGrid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFBF00]/20 border border-[#FFBF00]/30 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <svg
                  className="w-4 h-4 text-[#FFBF00]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-[#FFBF00] text-sm font-medium">Estate Planning Guide</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Probate in Canada
              </h1>
              <p className="text-xl sm:text-2xl text-gray-300 mb-4">
                What it is, what it costs, and how to reduce fees
              </p>
              <p className="text-lg text-white mb-8 leading-relaxed max-w-3xl mx-auto">
                Probate is one of the most misunderstood parts of estate planning in Canada. Many
                people assume that once they have a Will, everything is simple. In reality, a Will
                is your written instructions — probate is often the proof that banks and
                institutions require before they release assets.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="fill-white">
            <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" />
          </svg>
        </div>
      </section>

      {/* Understanding Probate Section */}
      <section id="understanding-probate" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* What Probate Actually Is */}
            <motion.div variants={fadeInUp} className="mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6">
                What probate actually is
              </h2>
              <div className="bg-gradient-to-r from-[#F4FAF7] to-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  Probate is the court process that confirms a Will is valid and officially
                  recognizes who has the legal authority to administer an estate.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  In Ontario, this authority is granted through a court-issued Estate Certificate.
                  Other provinces use different names, but the purpose is the same: to confirm who
                  can act on behalf of the estate.
                </p>
              </div>
            </motion.div>

            {/* Why Probate Exists */}
            <motion.div variants={fadeInUp} className="mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6">
                Why probate exists
              </h2>
              <div className="bg-gradient-to-r from-[#F4FAF7] to-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  Banks and financial institutions aren&apos;t equipped to verify whether a Will is
                  the most recent version or whether it has been challenged.
                </p>
                <div className="bg-white/60 rounded-lg p-4 my-4 border-l-4 border-[#FFBF00]">
                  <p className="text-gray-700 italic">
                    For example: An executor presents a Will at the bank. The next day, someone else
                    arrives with a newer Will naming a different executor. The bank has no way to
                    know which document is valid.
                  </p>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Probate resolves this uncertainty by providing court confirmation.
                </p>
              </div>
            </motion.div>

            {/* Does Every Will Go Through Probate */}
            <motion.div variants={fadeInUp} className="mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6">
                Does every Will go through probate?
              </h2>
              <div className="bg-gradient-to-r from-[#F4FAF7] to-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Not always — but many estates do. Probate is commonly required when assets are
                  owned solely by the deceased or when an institution&apos;s internal policies
                  require court confirmation.
                </p>
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Assets that require probate */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 overflow-hidden">
                    <h3 className="text-lg sm:text-xl font-bold text-[#0A1E86] mb-4 flex items-start gap-2 leading-tight">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFBF00] flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="break-words">Assets that often require probate</span>
                    </h3>
                    <ul className="space-y-3 text-gray-700">
                      {[
                        'Real estate held in one name',
                        'Non-registered investment accounts',
                        'Bank accounts above institutional thresholds',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#FFBF00] flex-shrink-0 mt-1">•</span>
                          <span className="break-words leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Assets that bypass probate */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 overflow-hidden">
                    <h3 className="text-lg sm:text-xl font-bold text-[#0A1E86] mb-4 flex items-start gap-2 leading-tight">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFBF00] flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <span className="break-words">Assets that often bypass probate</span>
                    </h3>
                    <ul className="space-y-3 text-gray-700">
                      {[
                        'Joint assets with right of survivorship',
                        'Life insurance with named beneficiaries',
                        'Registered accounts with named beneficiaries',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#FFBF00] flex-shrink-0 mt-1">•</span>
                          <span className="break-words leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed mt-6 italic">
                  Even when probate can be avoided, institutions may still request additional
                  documentation.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What Probate Costs */}
      <section className="py-20 bg-[#F4FAF7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6 text-center">
              What probate costs in Ontario
            </h2>
            <div className="bg-white rounded-2xl p-8 sm:p-10 border border-gray-100 shadow-lg">
              <p className="text-xl text-gray-700 mb-6">
                Ontario&apos;s probate fee is called the Estate Administration Tax.
              </p>
              <div className="bg-gradient-to-br from-[#0A1E86]/5 to-[#FFBF00]/5 rounded-xl p-6 mb-6 border border-[#0A1E86]/10">
                <h3 className="text-xl font-bold text-[#0A1E86] mb-4">The tax is calculated as:</h3>
                <ul className="space-y-3 text-lg text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFBF00] font-bold text-xl">•</span>
                    <span>$0 on the first $50,000</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFBF00] font-bold text-xl">•</span>
                    <span>$15 per $1,000 (or part thereof) over $50,000</span>
                  </li>
                </ul>
              </div>
              <div className="bg-[#FFBF00]/10 rounded-xl p-6 border-2 border-[#FFBF00]/30">
                <h3 className="text-xl font-bold text-[#0A1E86] mb-3">Example:</h3>
                <p className="text-lg text-gray-700">
                  A $250,000 probate estate would result in approximately $3,000 in Estate
                  Administration Tax.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How to Reduce Probate Exposure */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-4">
                How people reduce probate exposure
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Probate planning isn&apos;t about avoiding probate at all costs. It&apos;s about
                reducing unnecessary exposure while keeping the plan clean and defensible.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-gradient-to-r from-[#F4FAF7] to-white rounded-2xl p-8 border border-gray-100 shadow-sm"
            >
              <h3 className="text-2xl font-bold text-[#0A1E86] mb-6">Common strategies include:</h3>
              <div className="space-y-4">
                {[
                  'Keeping beneficiary designations current',
                  'Using joint ownership carefully (not as a shortcut)',
                  'For business owners, understanding whether a secondary Will is appropriate (Ontario-specific)',
                  'Ensuring incapacity planning is addressed alongside death planning',
                ].map((strategy, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0A1E86] flex items-center justify-center">
                      <span className="text-white font-bold">{i + 1}</span>
                    </div>
                    <p className="text-lg text-gray-700">{strategy}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <p className="text-gray-700 font-semibold">
                  Important: choosing not to have a Will does not avoid probate. Estates without a
                  Will often still require court involvement — and usually more complexity.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How Long Does Probate Take */}
      <section className="py-20 bg-[#F4FAF7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6 text-center">
              How long does probate take?
            </h2>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <p className="text-xl text-gray-700 leading-relaxed">
                Timelines vary by province and court backlog. Even simple estates often take months.
                Contested estates can take significantly longer.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Make It Easier */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1E86] mb-6 text-center">
              Make it easier on your executor
            </h2>
            <div className="bg-gradient-to-br from-[#0A1E86]/5 to-[#FFBF00]/5 rounded-2xl p-8 sm:p-10 border border-gray-100 shadow-lg">
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                A clear Will, the right executor, updated beneficiaries, and proper Powers of
                Attorney can dramatically reduce stress, delays, and unnecessary cost for the people
                you leave behind.
              </p>
              <p className="text-xl text-gray-700 leading-relaxed">
                With iFinallyWill, you can start free, review everything, and pay only when
                you&apos;re ready to finalize. Complete plans include support for corporate assets
                where applicable.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86]" />
        <motion.div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#FFBF00]/10 blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#0A1E86]/30 blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
        />
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ctaGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ctaGrid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFBF00]/50 via-transparent to-[#FFBF00]/50 rounded-3xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 sm:p-14">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Start Your Estate Planning Today
                </h2>
                <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                  Create a clear Will, reduce probate complexity, and protect your family&apos;s
                  future.
                </p>
                <div className="flex justify-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-[#FFBF00]/50 rounded-full blur-xl" />
                    <Link
                      to="/register?start=1"
                      className="relative inline-flex items-center justify-center px-10 sm:px-12 py-5 sm:py-6 rounded-full bg-gradient-to-r from-[#FFBF00] to-[#FFD54F] text-[#0A1E86] font-bold text-lg sm:text-xl shadow-2xl hover:shadow-[0_20px_60px_rgba(255,191,0,0.4)] transition-all duration-300"
                    >
                      Start For Free
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      >
                        →
                      </motion.span>
                    </Link>
                  </motion.div>
                </div>
                <div className="flex justify-center gap-8 mt-10 pt-8 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-[#FFBF00] font-bold text-2xl">No Credit Card</div>
                    <div className="text-white/50 text-lg">Required</div>
                  </div>
                  <div className="w-px h-12 bg-white/20" />
                  <div className="text-center">
                    <div className="text-[#FFBF00] font-bold text-2xl">Free to Start</div>
                    <div className="text-white/50 text-lg">Pay When Ready</div>
                  </div>
                  <div className="w-px h-12 bg-white/20 hidden sm:block" />
                  <div className="text-center hidden sm:block">
                    <div className="text-[#FFBF00] font-bold text-2xl">Corporate Assets</div>
                    <div className="text-white/50 text-lg">Supported</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
