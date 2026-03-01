/**
 * HowDifferentSection — "How We're Different" with 3 cards + Data Security panel
 * Pixel-perfect clone from source HowDifferentSection.jsx
 */

import { motion } from 'framer-motion';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
};

export function HowDifferentSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ backgroundColor: colors.gold, color: colors.blue }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            HOW WE&apos;RE DIFFERENT
          </motion.span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6"
            style={{ color: colors.blue }}
          >
            How Are We Different and How It Matters
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Understanding what makes us different isn&apos;t just marketing — it&apos;s about
            knowing you&apos;re getting a solution built for real-world legal outcomes, not just
            digital convenience.
          </p>
        </motion.div>

        {/* 3-Column Card Grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-12">
          {/* Card 1 - Built on Real Legal Experience */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="h-full"
          >
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 shadow-lg border border-blue-100 h-full flex flex-col">
              <h3
                className="text-2xl font-bold mb-4 flex items-center gap-3"
                style={{ color: colors.blue }}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Built on Real Legal Experience
              </h3>
              <p className="text-gray-700 leading-relaxed flex-grow">
                Built on 18 years of tax-law outcomes, not just software. Your will is structured to
                handle real world complexities, not just pass basic validation.
              </p>
            </div>
          </motion.div>

          {/* Card 2 - AI That Actually Guides Decisions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="h-full"
          >
            <div
              className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-8 shadow-lg border-2 h-full flex flex-col"
              style={{ borderColor: colors.gold }}
            >
              <h3
                className="text-2xl font-bold mb-4 flex items-center gap-3"
                style={{ color: colors.blue }}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                AI That Actually Guides Decisions
              </h3>
              <p className="text-gray-700 leading-relaxed flex-grow">
                Our AI explains choices before you commit. Embedded directly into the process, not a
                chatbot on the side. Make informed decisions in real time.
              </p>
            </div>
          </motion.div>

          {/* Card 3 - Designed for Real Use */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-full"
          >
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-200 h-full flex flex-col">
              <h3
                className="text-2xl font-bold mb-4 flex items-center gap-3"
                style={{ color: colors.navy }}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Designed for Real Use
              </h3>
              <p className="text-gray-700 leading-relaxed flex-grow">
                Designed to stand up under scrutiny when it counts. Every safeguard exists to ensure
                your will works when your family needs it most.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Data Security Panel */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="relative overflow-visible rounded-3xl p-8 md:p-10 text-white max-w-4xl mx-auto"
            style={{ backgroundColor: colors.blue }}
          >
            {/* Google Cloud image */}
            <img
              src="/images/GoogleCloudCloud.png"
              alt="Google Cloud Platform"
              className="absolute bottom-4 -left-8 md:bottom-5 md:-left-12 w-40 h-40 md:w-52 md:h-52 object-contain object-left-bottom opacity-95 z-10"
            />
            {/* Decorative circle */}
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
              style={{ backgroundColor: colors.gold }}
            />

            <div className="relative z-10 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto"
                style={{ backgroundColor: colors.gold }}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>

              <div
                className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4"
                style={{ backgroundColor: colors.gold, color: colors.blue }}
              >
                CANADIAN PROTECTED
              </div>

              <h3
                className="text-2xl md:text-3xl font-extrabold mb-4"
                style={{ color: colors.gold }}
              >
                Your Data Stays With Us
              </h3>

              <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
                We NEVER share your information with third parties. Your personal data is protected
                under Canadian law (PIPEDA) and stays exclusively with iFinallyWill. No selling. No
                sharing. No exceptions. We use Google Cloud Platform (GCP) for secure
                infrastructure, which employs secure-by-design architecture with defense-in-depth,
                custom hardware including Titan security chips for hardware root-of-trust, automated
                at-rest and in-transit encryption, and comprehensive IAM controls — the same
                security technologies Google uses to protect its own data.
              </p>

              <div className="flex flex-wrap gap-3 justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-white">PIPEDA Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-white">Google Cloud Platform</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-white">256-bit Encryption</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
