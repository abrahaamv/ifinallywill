/**
 * ProbateSection — Understanding Probate card with CTA
 * Pixel-perfect clone from source ProbateSection.jsx
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
};

export function ProbateSection() {
  return (
    <section className="py-6 md:py-8 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-bold tracking-widest uppercase" style={{ color: colors.blue }}>
            PROBATE
          </p>
          <div className="h-px w-56 bg-black/10 mx-auto mt-2" />
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-[#0A1E86] to-[#1F2937] rounded-3xl p-5 md:p-6 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Header - Centered */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div
              className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.gold }}
            >
              <svg
                className="w-6 h-6 md:w-7 md:h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke={colors.blue}
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg md:text-xl font-bold mb-1 text-white">
                Understanding Probate
              </h3>
              <p className="text-xs md:text-sm font-semibold text-white">What You Need to Know</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-base md:text-lg mb-5 text-left text-white">
            Probate is one of the most misunderstood parts of estate planning in Canada. Learn what
            probate is, what it costs in Ontario, and how to legitimately reduce probate exposure.
          </p>

          {/* CTA */}
          <div className="flex justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/probate"
                className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 w-full justify-center whitespace-nowrap"
                style={{ backgroundColor: colors.gold }}
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={colors.blue}
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <span className="whitespace-nowrap font-bold" style={{ color: colors.blue }}>
                  Learn About Probate
                </span>
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                  fill="none"
                  stroke={colors.blue}
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
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
