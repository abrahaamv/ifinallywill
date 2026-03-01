/**
 * For Charities page — charity partnership program
 * Pixel-perfect clone of the source ForCharities.jsx with CMS infrastructure removed.
 */

import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

// Brand colors
const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
} as const;

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Item                                                */
/* ------------------------------------------------------------------ */
interface CharityFAQItemProps {
  isOpen: boolean;
  onToggle: () => void;
  question: React.ReactNode;
  answer: React.ReactNode;
}

function CharityFAQItem({ isOpen, onToggle, question, answer }: CharityFAQItemProps) {
  return (
    <motion.div
      className="bg-[#FAFAFA] rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
      style={{ alignSelf: 'start' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full px-6 py-5 sm:py-6 flex items-center justify-between text-left hover:bg-white/60 transition-colors duration-200 min-h-[100px]"
        aria-expanded={isOpen}
      >
        <span
          className="text-[1.5rem] sm:text-[1.7rem] font-bold pr-4 leading-snug"
          style={{ color: colors.blue }}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          {/* Inline chevron-down SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            style={{ color: colors.blue }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-gray-600 leading-relaxed">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export function ForCharitiesPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Pre-populated body for charity partnership email
  const charityEmailBody = [
    'Name:',
    'Company:',
    'Audience size:',
    'Channels:',
    'Expected monthly volume:',
  ].join('\r\n');

  return (
    <>
      {/* Spacer — LandingLayout provides the navbar */}
      <div className="h-20" />

      {/* ============================================================ */}
      {/*  Hero Section                                                */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-32 sm:pb-40 lg:pb-48 overflow-hidden bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#0A1E86]/20 filter blur-[150px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#FFBF00]/15 filter blur-[120px]"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
          />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="charityHeroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#charityHeroGrid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
              {/* Left: Content */}
              <motion.div
                variants={fadeInLeft}
                initial="hidden"
                animate="visible"
                className="text-center lg:text-left"
              >
                {/* Kicker badge */}
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-[#FFBF00]/50"
                  style={{
                    backgroundColor: colors.gold,
                    color: colors.blue,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Inline heart SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    style={{ color: colors.blue }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span
                    className="text-sm font-bold tracking-widest"
                    style={{ color: colors.blue }}
                  >
                    Charity Partnerships &bull; Planned Giving &bull; Fundraising
                  </span>
                </motion.div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Help donors protect their family and fundraise at the same time.
                </h1>

                <p className="text-xl sm:text-2xl text-gray-300 mb-4 leading-relaxed">
                  iFinallyWill is the <strong className="text-white">only online platform</strong>{' '}
                  that{' '}
                  <strong className="text-white">
                    enables charities to fundraise through Wills and Powers of Attorney
                  </strong>
                  . By sharing a co branded link, each completed estate planning document triggers a{' '}
                  <strong className="text-[#FFBF00]">
                    minimum 20% donation back to your charity
                  </strong>
                  ,{' '}
                  <strong className="text-white">
                    creating ongoing impact without asking donors to give more
                  </strong>
                  .
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="#contact"
                      className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#FFBF00] text-[#0A1E86] font-bold hover:bg-[#FFD54F] transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Activate revenue share
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      >
                        &rarr;
                      </motion.span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="#how"
                      className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm text-white font-bold border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
                    >
                      See the workflow
                    </Link>
                  </motion.div>
                </div>

                <p className="text-xl sm:text-2xl text-gray-400 mt-6 text-center">
                  *Revenue share is paid on qualifying purchases tracked through your unique
                  partnership link and reporting dashboard.
                </p>
              </motion.div>

              {/* Right: Visual/Illustration - AIAdvantage Style Card */}
              <motion.div
                variants={fadeInRight}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                className="hidden lg:flex justify-center lg:justify-end"
              >
                <motion.div
                  className="relative"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  {/* Outer glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#FFBF00]/30 via-[#FFBF00]/10 to-[#FFBF00]/30 rounded-[2rem] blur-2xl" />

                  {/* Main card with glassmorphism */}
                  <div className="relative bg-gradient-to-br from-[#FFBF00] via-[#FFD54F] to-[#FFBF00] rounded-3xl p-1 shadow-2xl">
                    <div className="bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86] rounded-[1.4rem] p-8 sm:p-10 relative overflow-hidden min-w-[420px] max-w-[480px]">
                      {/* Animated neural network background */}
                      <div className="absolute inset-0 opacity-20">
                        <svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 400 300"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {/* Nodes */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="4"
                            fill="#FFBF00"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="150"
                            cy="80"
                            r="5"
                            fill="#FFBF00"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="250"
                            cy="40"
                            r="4"
                            fill="#FFBF00"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="350"
                            cy="70"
                            r="5"
                            fill="#FFBF00"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="80"
                            cy="150"
                            r="6"
                            fill="#FFBF00"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="200"
                            cy="150"
                            r="8"
                            fill="#FFBF00"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="320"
                            cy="140"
                            r="5"
                            fill="#FFBF00"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="60"
                            cy="250"
                            r="4"
                            fill="#FFBF00"
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="180"
                            cy="230"
                            r="5"
                            fill="#FFBF00"
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.circle
                            cx="300"
                            cy="260"
                            r="4"
                            fill="#FFBF00"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2.3, repeat: Number.POSITIVE_INFINITY }}
                          />
                          {/* Connections */}
                          <motion.line
                            x1="50"
                            y1="50"
                            x2="150"
                            y2="80"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="150"
                            y1="80"
                            x2="250"
                            y2="40"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="250"
                            y1="40"
                            x2="350"
                            y2="70"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="80"
                            y1="150"
                            x2="200"
                            y2="150"
                            stroke="#FFBF00"
                            strokeWidth="1.5"
                            opacity="0.4"
                            animate={{ opacity: [0.2, 0.6, 0.2] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="200"
                            y1="150"
                            x2="320"
                            y2="140"
                            stroke="#FFBF00"
                            strokeWidth="1.5"
                            opacity="0.4"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="50"
                            y1="50"
                            x2="80"
                            y2="150"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="150"
                            y1="80"
                            x2="200"
                            y2="150"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="80"
                            y1="150"
                            x2="60"
                            y2="250"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="200"
                            y1="150"
                            x2="180"
                            y2="230"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                          />
                          <motion.line
                            x1="320"
                            y1="140"
                            x2="300"
                            y2="260"
                            stroke="#FFBF00"
                            strokeWidth="1"
                            opacity="0.3"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                          />
                        </svg>
                      </div>

                      {/* Main content */}
                      <div className="relative z-10 space-y-5">
                        {/* Header - What you unlock */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="flex justify-center mb-5"
                        >
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                            <span className="text-xs sm:text-sm font-bold text-white/90">
                              What you unlock
                            </span>
                          </div>
                        </motion.div>

                        {/* Feature Cards Grid - 2x2 */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          {/* Card 1 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-3.5 border border-white/10 flex flex-col items-center justify-center text-center"
                          >
                            <div className="text-2xl sm:text-3xl font-bold text-[#FFBF00] mb-1.5 leading-tight">
                              20%
                            </div>
                            <div className="text-[10px] sm:text-xs text-white/70 leading-tight">
                              revenue share on completed purchases
                            </div>
                          </motion.div>

                          {/* Card 2 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.55 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-3.5 border border-white/10 flex flex-col items-center justify-center text-center"
                          >
                            <div className="text-2xl sm:text-3xl font-bold text-[#FFBF00] mb-1.5 leading-tight">
                              $0
                            </div>
                            <div className="text-[10px] sm:text-xs text-white/70 leading-tight">
                              upfront cost to launch
                            </div>
                          </motion.div>

                          {/* Card 3 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-3.5 border border-white/10 flex flex-col items-center justify-center text-center"
                          >
                            <div className="text-2xl sm:text-3xl font-bold text-[#FFBF00] mb-1.5 leading-tight">
                              Trackable
                            </div>
                            <div className="text-[10px] sm:text-xs text-white/70 leading-tight">
                              unique links + reporting dashboard
                            </div>
                          </motion.div>

                          {/* Card 4 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.65 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-3.5 border border-white/10 flex flex-col items-center justify-center text-center"
                          >
                            <div className="text-2xl sm:text-3xl font-bold text-[#FFBF00] mb-1.5 leading-tight">
                              Brandsafe
                            </div>
                            <div className="text-[10px] sm:text-xs text-white/70 leading-tight">
                              professionally built, partner-ready assets
                            </div>
                          </motion.div>
                        </div>

                        {/* Concluding Statement */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="bg-[#FFBF00]/20 backdrop-blur-sm rounded-lg p-4 border border-[#FFBF00]/30"
                        >
                          <p className="text-xs sm:text-sm text-white leading-relaxed text-center">
                            <strong className="text-white font-bold">Positioning that wins:</strong>{' '}
                            this isn&apos;t &quot;ask for a donation.&quot; It&apos;s{' '}
                            <strong className="text-[#FFBF00] font-bold">
                              &quot;Get your will done&quot;
                            </strong>{' '}
                            and{' '}
                            <strong className="text-[#FFBF00] font-bold">
                              &quot;support the cause automatically.&quot;
                            </strong>
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 120"
            className="fill-white w-full h-auto block"
            style={{ minHeight: '80px', transform: 'translateY(1px)' }}
            preserveAspectRatio="none"
          >
            <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" />
          </svg>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  How It Works Section                                        */}
      {/* ============================================================ */}
      <section id="how" className="py-20 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-5xl mx-auto mb-12 text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-block px-5 py-2.5 rounded-full text-sm sm:text-base font-bold mb-6 shadow-md"
              style={{ backgroundColor: colors.gold, color: colors.blue }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              HOW IT WORKS
            </motion.span>
            <motion.h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
              style={{ color: colors.blue }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              How it works
            </motion.h2>
            <motion.p
              className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              We&apos;ve engineered a turnkey partnership model that converts &quot;good
              intentions&quot; into completed legacy documents and measurable fundraising. Your
              charity gets a co&#8209;branded campaign page, a unique trackable link, and a
              plug&#8209;and&#8209;play outreach kit.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Left card: Steps 1 & 2 */}
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden grid grid-rows-2"
            >
              <div className="flex gap-5 sm:gap-6 items-start p-8 sm:p-10 border-b-2 border-gray-200 min-h-[280px] sm:min-h-[300px]">
                <div
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                  style={{ backgroundColor: colors.blue }}
                >
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                    style={{ color: colors.blue }}
                  >
                    We set up your campaign page + tracking link
                  </h3>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                    We set up your charity campaign page + tracking link so supporters know their
                    purchase supports your mission.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 sm:gap-6 items-start p-8 sm:p-10 min-h-[280px] sm:min-h-[300px]">
                <div
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                  style={{ backgroundColor: colors.blue }}
                >
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                    style={{ color: colors.blue }}
                  >
                    You promote to supporters
                  </h3>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                    Your team gets a ready-to-deploy partner kit: email copy, newsletter blocks,
                    social captions, and event scripts.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right card: Steps 3 & 4 */}
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden grid grid-rows-2"
            >
              <div className="flex gap-5 sm:gap-6 items-start p-8 sm:p-10 border-b-2 border-gray-200 min-h-[280px] sm:min-h-[300px]">
                <div
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                  style={{ backgroundColor: colors.blue }}
                >
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                    style={{ color: colors.blue }}
                  >
                    Donors complete wills with guided support
                  </h3>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                    A streamlined, plain&#8209;language experience designed to reduce drop&#8209;off
                    and increase completions.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 sm:gap-6 items-start p-8 sm:p-10 min-h-[280px] sm:min-h-[300px]">
                <div
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                  style={{ backgroundColor: colors.blue }}
                >
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                    style={{ color: colors.blue }}
                  >
                    You receive revenue share + reporting
                  </h3>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                    Each qualifying purchase triggers a minimum 20% revenue share paid to the
                    charity, with transparent reporting.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Reality Check Banner */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 max-w-6xl mx-auto bg-gradient-to-br from-[#FFBF00]/15 to-[#FFD54F]/10 rounded-3xl p-6 sm:p-8 lg:p-10 border-3 border-[#FFBF00] shadow-xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-800 leading-relaxed font-semibold">
              <strong style={{ color: colors.blue }}>Reality check:</strong> most &quot;wills for
              charities&quot; pages are awareness plays. Ours is a{' '}
              <strong style={{ color: colors.blue }}>performance channel</strong> with measurable
              ROI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Revenue Share Section                                       */}
      {/* ============================================================ */}
      <section
        id="fundraise"
        className="py-20 sm:py-24"
        style={{ backgroundColor: colors.offwhite }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-5xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
                style={{ color: colors.blue }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Revenue share fundraising
              </motion.h2>
              <motion.p
                className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                This is the differentiator. Your charity isn&apos;t just &quot;listed&quot; or
                &quot;supported.&quot; You&apos;re running a monetizable campaign where a portion of
                every will purchase comes back to you automatically.
              </motion.p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-10">
              {/* Card 1: Minimum 20% back */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Minimum 20% back
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Every qualifying purchase through your campaign link returns{' '}
                  <strong className="font-bold">at least 20%</strong> to your charity.
                </p>
              </motion.div>

              {/* Card 2: No cost to launch */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                  style={{ color: colors.blue }}
                >
                  No cost to launch
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  No setup fee. No platform fee. Your team gets a ready-to-deploy partner kit and
                  campaign assets.
                </p>
              </motion.div>

              {/* Card 3: Trackable and auditable */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Trackable and auditable
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Unique links + reporting = clear attribution, payout tracking, and clean internal
                  governance.
                </p>
              </motion.div>
            </div>

            {/* Campaign Math Banner */}
            <motion.div
              variants={fadeInUp}
              className="bg-gradient-to-br from-[#FFBF00]/15 to-[#FFD54F]/10 rounded-3xl p-6 sm:p-8 lg:p-10 border-3 border-[#FFBF00] shadow-xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-800 leading-relaxed font-semibold">
                <strong style={{ color: colors.blue }}>Campaign math:</strong> every Will or Power
                of Attorney completed by your supporters delivers two outcomes at once real progress
                for donors and a predictable revenue stream for your charity.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ROI / Revenue Examples Section                              */}
      {/* ============================================================ */}
      <section id="roi" className="py-20 sm:py-24" style={{ backgroundColor: colors.offwhite }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-6xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Header */}
            <div className="text-center mb-14">
              <motion.h2
                className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight"
                style={{ color: colors.blue }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Revenue examples
              </motion.h2>
              <motion.p
                className="text-black/70 text-base sm:text-lg max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Qualifying purchases through your link. Revenue share on every completed will.
              </motion.p>
            </div>

            {/* Revenue Cards Grid */}
            <motion.div
              className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3 items-stretch"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {/* 1,000 wills */}
              <motion.div
                className="relative bg-white rounded-2xl p-6 sm:p-8 flex flex-col shadow-md overflow-visible ring-1 ring-gray-200"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <div className="flex justify-center -mt-10 mb-5">
                  <span className="rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-gray-200 text-gray-600">
                    1,000 WILLS
                  </span>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-2 leading-tight text-left"
                  style={{ color: colors.blue }}
                >
                  1,000 completed wills
                </h3>
                <p className="text-sm font-normal mb-4 text-left" style={{ color: colors.blue }}>
                  Direct funding to your charity
                </p>
                <div
                  className="text-3xl sm:text-4xl font-bold mb-4 text-left"
                  style={{ color: colors.gold }}
                >
                  ${(1000 * 249 * 0.2).toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 mt-auto text-left">
                  Automatically generated through supporter participation.
                </p>
              </motion.div>

              {/* 5,000 wills */}
              <motion.div
                className="relative bg-white rounded-2xl p-6 sm:p-8 flex flex-col shadow-md overflow-visible ring-1 ring-gray-200"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <div className="flex justify-center -mt-10 mb-5">
                  <span className="rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-gray-200 text-gray-600">
                    5,000 WILLS
                  </span>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-2 leading-tight text-left"
                  style={{ color: colors.blue }}
                >
                  5,000 completed wills
                </h3>
                <p className="text-sm font-normal mb-4 text-left" style={{ color: colors.blue }}>
                  Direct funding to your charity
                </p>
                <div
                  className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold mb-4 text-left"
                  style={{ color: colors.gold }}
                >
                  ${(5000 * 249 * 0.2).toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 mt-auto text-left">
                  No additional fundraising effort required.
                </p>
              </motion.div>

              {/* 10,000 wills */}
              <motion.div
                className="relative bg-white rounded-2xl p-6 sm:p-8 flex flex-col shadow-md overflow-visible ring-1 ring-gray-200"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <div className="flex justify-center -mt-10 mb-5">
                  <span className="rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-gray-200 text-gray-600">
                    10,000 WILLS
                  </span>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-2 leading-tight text-left"
                  style={{ color: colors.blue }}
                >
                  10,000 completed wills
                </h3>
                <p className="text-sm font-normal mb-4 text-left" style={{ color: colors.blue }}>
                  Direct funding to your charity
                </p>
                <div
                  className="text-3xl sm:text-4xl font-bold mb-4 text-left"
                  style={{ color: colors.gold }}
                >
                  ${(10000 * 249 * 0.2).toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 mt-auto text-left">
                  Scales linearly as more supporters participate.
                </p>
              </motion.div>
            </motion.div>

            {/* Note */}
            <motion.div
              className="mt-10 max-w-2xl mx-auto text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <p className="text-base sm:text-lg text-black/60">
                <strong style={{ color: colors.blue }}>Note:</strong> Package 3 ($249) as baseline.
                Your share is based on the final price of any qualifying purchase.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Features Section                                            */}
      {/* ============================================================ */}
      <section
        id="features"
        className="py-20 sm:py-24"
        style={{ backgroundColor: colors.offwhite }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-6xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <motion.h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
                style={{ color: colors.blue }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Built for donor trust and charity governance
              </motion.h2>
              <motion.p
                className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Your brand is on the line. This is why we focus on clarity, defensibility, and donor
                confidence while giving your charity the visibility to manage outcomes.
              </motion.p>
            </div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Feature 1 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Co&#8209;branded charity page
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Your logo, your messaging, your impact story with a clean, conversion ready
                  layout.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Partner outreach kit
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Email copy, newsletter blocks, social captions, and event scripts your team can
                  deploy instantly.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Planned&#8209;giving friendly
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Messaging that encourages legacy consideration without friction or aggressive
                  pressure tactics.
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Real&#8209;time reporting
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  See the sales dashboard, revenue share, and support for your users.
                </p>
              </motion.div>

              {/* Feature 5 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Operational simplicity
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  No internal admin burden you promote, we handle the platform experience, you
                  receive payouts.
                </p>
              </motion.div>

              {/* Feature 6 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  Nationwide Partnership Opportunities:
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  Documents are customized to provincial rules to ensure everything is done
                  correctly across Canada.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ Section                                                 */}
      {/* ============================================================ */}
      <section id="faq" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: colors.blue }}>
                FAQ
              </h2>
              <p className="text-[1.5rem] sm:text-[1.7rem] text-gray-600 leading-snug">
                Designed to eliminate friction for leadership, fundraising teams, and supporters.
              </p>
            </div>

            <motion.div
              className="grid md:grid-cols-2 gap-5 sm:gap-6"
              style={{ alignItems: 'start' }}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <CharityFAQItem
                isOpen={openFaqIndex === 0}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                question="Is the revenue share guaranteed at 20%?"
                answer="Yes. The Strategic tier offers a 20% commission on every qualifying purchase attributed to your tracking link. Your signed affiliate agreement confirms the rate, payout schedule, and reconciliation terms."
              />

              <CharityFAQItem
                isOpen={openFaqIndex === 1}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                question="Who can we promote this to?"
                answer="Anyone: donors, members, volunteers, staff, board networks, event attendees, and your broader community. The offer is simple: complete a will and support the cause."
              />

              <CharityFAQItem
                isOpen={openFaqIndex === 2}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                question={<>What does &quot;qualifying purchase&quot; mean?</>}
                answer="A completed paid transaction attributable to your campaign link, as shown in your reporting. (This protects the integrity of payout accounting.)"
              />

              <CharityFAQItem
                isOpen={openFaqIndex === 3}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
                question="Is this a planned giving program?"
                answer="It complements planned giving but it's not limited to bequests. The primary measurable outcome is completed estate documents; the fundraising outcome is the embedded revenue share on purchases."
              />

              <CharityFAQItem
                isOpen={openFaqIndex === 4}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}
                question="Can we co-brand the experience?"
                answer="Yes. Your charity gets a campaign page and outreach assets aligned to your voice and visual identity (within a clean, high-trust framework)."
              />

              <CharityFAQItem
                isOpen={openFaqIndex === 5}
                onToggle={() => setOpenFaqIndex(openFaqIndex === 5 ? null : 5)}
                question="How do payouts work?"
                answer="Payout frequency and remittance details are set in your partner agreement. Reporting is provided to support reconciliation and governance."
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Testimonials Section                                        */}
      {/* ============================================================ */}
      <section id="testimonials" className="py-20" style={{ backgroundColor: colors.offwhite }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-6xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
                style={{ color: colors.blue }}
              >
                What partner charities say
              </h2>
              <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
                We&apos;re building a partner roster that cares about donor outcomes and fundraising
                accountability. If you want to be an early flagship partner, this is your lane.
              </p>
            </div>

            <motion.div
              className="grid md:grid-cols-3 gap-6 items-stretch"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Testimonial 1 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col h-full"
              >
                <h3 className="text-2xl font-bold mb-4 pt-1" style={{ color: colors.blue }}>
                  &quot;High trust. Easy to deploy.&quot;
                </h3>
                <p className="text-base text-gray-600 leading-relaxed mb-6 flex-grow">
                  This was one of the simplest programs we&apos;ve ever rolled out. Clear
                  positioning, minimal lift for our team, and immediate credibility with our
                  audience. It felt aligned from day one.
                </p>
                <p className="text-base text-gray-600 mt-auto">
                  <strong className="font-bold" style={{ color: colors.blue }}>
                    Charity Partner
                  </strong>{' '}
                  &bull; Executive Director
                </p>
              </motion.div>

              {/* Testimonial 2 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col h-full"
              >
                <h3 className="text-2xl font-bold mb-4" style={{ color: colors.blue }}>
                  &quot;A fundraising channel that doesn&apos;t feel like fundraising.&quot;
                </h3>
                <p className="text-base text-gray-600 leading-relaxed mb-6 flex-grow">
                  Supporters received real value, which changed the conversation entirely.
                  Conversion was stronger because it didn&apos;t feel like an ask it felt like a
                  smart, mutually beneficial initiative.
                </p>
                <p className="text-base text-gray-600 mt-auto">
                  <strong className="font-bold" style={{ color: colors.blue }}>
                    Charity Partner
                  </strong>{' '}
                  &bull; VP Development
                </p>
              </motion.div>

              {/* Testimonial 3 */}
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col h-full"
              >
                <h3 className="text-2xl font-bold mb-4" style={{ color: colors.blue }}>
                  &quot;Board-friendly reporting and clean attribution.&quot;
                </h3>
                <p className="text-base text-gray-600 leading-relaxed mb-6 flex-grow">
                  The tracking, reconciliation, and payout reporting were exactly what our board
                  expects. Everything was transparent, auditable, and easy to stand behind.
                </p>
                <p className="text-base text-gray-600 mt-auto">
                  <strong className="font-bold" style={{ color: colors.blue }}>
                    Charity Partner
                  </strong>{' '}
                  &bull; Treasurer
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Contact Section                                             */}
      {/* ============================================================ */}
      <section id="contact" className="py-24 relative overflow-hidden">
        {/* Rich gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86]" />

        {/* Decorative gradient orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#FFBF00]/10 filter blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#0A1E86]/30 filter blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="charityContactGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#charityContactGrid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Premium card container */}
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFBF00]/50 via-transparent to-[#FFBF00]/50 rounded-3xl blur-xl opacity-50" />

              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 sm:p-14">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-4">
                  Activate your charity partnership
                </h2>
                <p className="text-2xl text-white/80 text-center mb-10 max-w-3xl mx-auto">
                  If you want a fundraising channel that also delivers real donor value, this is the
                  play. We&apos;ll set up your co&#8209;branded page and tracking link, and hand
                  your team a complete promotion kit.
                </p>

                {/* Contact Options */}
                <div className="grid md:grid-cols-3 gap-6 mb-10 items-stretch">
                  {/* Option A: Book setup */}
                  <motion.div
                    variants={fadeInUp}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full"
                  >
                    <h3 className="text-2xl font-bold text-white mb-3 min-h-[3.5rem] leading-tight pt-1">
                      Option A: Book setup
                    </h3>
                    <p className="text-white/70 mb-4 text-base flex-grow">
                      Fast-track launch with a 15-minute call to confirm branding, payout details,
                      and timeline.
                    </p>
                    <motion.a
                      href={`mailto:partners@ifinallywill.com?subject=${encodeURIComponent('Charity Partnership Setup Call')}&body=${encodeURIComponent(charityEmailBody)}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full bg-gradient-to-r from-[#FFBF00] to-[#FFD54F] text-[#0A1E86] font-bold hover:shadow-xl transition-all duration-300 text-base mt-auto"
                    >
                      Email Us
                    </motion.a>
                  </motion.div>

                  {/* Option B: Get Kit */}
                  <motion.div
                    variants={fadeInUp}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full"
                  >
                    <h3 className="text-2xl font-bold text-white mb-3 min-h-[3.5rem] leading-tight">
                      Option B: Get the charity kit
                    </h3>
                    <p className="text-white/70 mb-4 text-base flex-grow">
                      Receive the one-pager, sample announcements, social posts, and the co-branded
                      landing page template.
                    </p>
                    <motion.a
                      href={`mailto:partners@ifinallywill.com?subject=${encodeURIComponent('Request the iFinallyWill Charity Kit')}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full bg-gradient-to-r from-[#FFBF00] to-[#FFD54F] text-[#0A1E86] font-bold hover:shadow-xl transition-all duration-300 text-base mt-auto"
                    >
                      Request the kit
                    </motion.a>
                  </motion.div>

                  {/* Option C: What we need */}
                  <motion.div
                    variants={fadeInUp}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full"
                  >
                    <h3 className="text-2xl font-bold text-white mb-3 min-h-[3.5rem] leading-tight">
                      What we need from you
                    </h3>
                    <p className="text-white/70 mb-4 text-base flex-grow">
                      Logo, preferred charity description, remittance details, and your internal
                      contact for approvals. That&apos;s it.
                    </p>
                    <p className="text-white/60 text-base mt-auto">
                      You can launch with a basic page in 48-72 hours once assets are received.
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
