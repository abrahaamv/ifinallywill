/**
 * AI Guidance page — showcases AI assistant features
 * Pixel-perfect TypeScript clone of the source AIGuidance.jsx
 */

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Brand palette                                                      */
/* ------------------------------------------------------------------ */
const BRAND = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (replace the custom Icon component)               */
/* ------------------------------------------------------------------ */
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function ChatAiIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature data                                                       */
/* ------------------------------------------------------------------ */
interface AIFeature {
  number: string;
  title: string;
  description: string;
  result?: string;
  highlight?: string;
  icon: (props: { className?: string }) => ReactNode;
}

const AI_FEATURES: AIFeature[] = [
  {
    number: '1',
    title: 'Explains Choices Before You Commit',
    description:
      'Our AI explains what a question means, why it matters, and what changes if you choose option A vs B.',
    result: 'Fewer mistakes. Less second-guessing.',
    icon: InfoIcon,
  },
  {
    number: '2',
    title: 'Translates Legal Language Into Plain English',
    description:
      'No jargon. No Googling. No guessing. Our AI breaks down estate and legal concepts at the exact moment they appear, so you stay in flow and keep moving forward.',
    icon: DocumentTextIcon,
  },
  {
    number: '3',
    title: "Flags Things You Didn't Know to Ask",
    description:
      "Most estate mistakes happen because people don't know what they don't know. Our AI highlights common oversights, surfaces risk areas early, and helps you slow down where it actually matters.",
    icon: ShieldCheckIcon,
  },
  {
    number: '4',
    title: 'Builds Confidence  Not Just Speed',
    description:
      "Other platforms optimize for completion. We optimize for confidence at completion. That's why users finish feeling relieved  not unsure.",
    icon: HeartIcon,
  },
  {
    number: '5',
    title: 'Handles Business & Corporate Reality',
    description:
      "If you own a corporation, a basic will isn't enough. Our AI explains personal vs corporate assets, why a separate corporate assets will exists, and guides you through decisions most platforms ignore.",
    highlight: 'No other online will platform does this.',
    icon: ChartBarIcon,
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function AIGuidancePage() {
  return (
    <>
      {/* Spacer for LandingLayout navbar */}
      <div className="h-20" />

      {/* ============================================================ */}
      {/* Hero Section (inline port of AIAdvantage)                     */}
      {/* ============================================================ */}
      <section
        id="ai-advantage"
        className="relative mt-0 pt-28 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24 overflow-hidden"
        style={{ backgroundColor: BRAND.navy }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#0A1E86]/20 filter blur-[150px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#FFBF00]/15 filter blur-[120px]"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse' }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* No section_title for AI Guidance page */}

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Section */}
            <motion.div
              className="space-y-6"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-white">
                AI Guidance That Helps{' '}
                <span
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold"
                  style={{ color: BRAND.gold }}
                >
                  You Decide With Confidence
                </span>
              </h2>

              <p className="text-lg sm:text-xl text-white">(Not just fill out forms)</p>

              <div className="space-y-4 text-base sm:text-lg leading-relaxed">
                <p className="text-white" style={{ color: '#FFFFFF' }}>
                  Other online providers generate documents. iFinallyWill guides decisions in real
                  time while you&apos;re building.
                </p>
                <p className="text-white" style={{ color: '#FFFFFF' }}>
                  This isn&apos;t a chatbot on the side. This is AI embedded directly into the
                  estate planning process.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ backgroundColor: BRAND.gold, color: BRAND.blue }}
                >
                  <span className="font-extrabold text-[#0A1E86]">Start For Free</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Hero Image - Premium AI Assistant Card */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Outer glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#FFBF00]/30 via-[#FFBF00]/10 to-[#FFBF00]/30 rounded-[2rem] blur-2xl" />

              {/* Main card with glassmorphism */}
              <div className="relative bg-gradient-to-br from-[#FFBF00] via-[#FFD54F] to-[#FFBF00] rounded-3xl p-1 shadow-2xl">
                <div className="bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86] rounded-[1.4rem] px-8 pt-20 pb-20 relative overflow-hidden">
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

                  {/* Floating Legal Expert AI badge */}
                  <motion.div
                    className="absolute -top-100 -left-50 z-20"
                    animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
                    transition={{
                      duration: 4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  >
                    <div className="bg-gradient-to-br from-[#FFBF00] to-[#FFD54F] rounded-2xl px-4 py-3 shadow-xl border-2 border-white/20 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A1E86]" />
                      <span className="text-base sm:text-lg font-bold text-[#0A1E86]">
                        Legal Expert AI
                      </span>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-[#FFBF00]/50 rounded-2xl blur-lg -z-10" />
                  </motion.div>

                  {/* Main content */}
                  <div className="text-center py-10 relative z-10">
                    {/* AI Icon with animated rings */}
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-72 lg:h-72 mx-auto mb-8">
                      {/* Outer rotating ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-dashed border-[#FFBF00]/40"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 20,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        }}
                      />
                      {/* Middle pulsing ring */}
                      <motion.div
                        className="absolute inset-2 rounded-full border border-[#FFBF00]/60"
                        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      />
                      {/* Wilfred with Dog Mascot */}
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.05, 1],
                          y: [0, -8, 0],
                          rotate: [0, 2, -2, 0],
                        }}
                        transition={{
                          scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
                          y: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
                          rotate: {
                            duration: 4,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: 'easeInOut',
                          },
                        }}
                      >
                        <motion.img
                          src="/images/wilfred_dog_collar.png"
                          alt="Wilfred - Your AI Assistant Mascot with Dog"
                          className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-72 lg:h-72 object-contain drop-shadow-2xl"
                          style={{
                            filter: 'drop-shadow(0 10px 25px rgba(10, 30, 134, 0.3))',
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                        />
                      </motion.div>
                      {/* Floating particles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-[#FFBF00] rounded-full"
                          style={{ top: '50%', left: '50%' }}
                          animate={{
                            x: [0, Math.cos((i * 60 * Math.PI) / 180) * 50],
                            y: [0, Math.sin((i * 60 * Math.PI) / 180) * 50],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.3,
                          }}
                        />
                      ))}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 mt-6 max-w-2xl mx-auto">
                      <span className="text-white">
                        We are the only ones with an AI assistant (Meet Wilfred) to help guide you
                        every step of the way.
                      </span>
                    </h3>

                    {/* Bottom stats/badges */}
                    <div className="flex justify-center gap-6 mt-12">
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="text-2xl font-bold text-[#FFBF00]">24/7</div>
                        <div className="text-white/60 text-sm">Available</div>
                      </motion.div>
                      <div className="w-px bg-white/20" />
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="text-2xl font-bold text-[#FFBF00]">100%</div>
                        <div className="text-white/60 text-sm">Guided</div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* What Our AI Does Section                                      */}
      {/* ============================================================ */}
      <section className="py-20" style={{ backgroundColor: BRAND.offwhite }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left side - Image (centered, consistent size) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1 flex justify-center"
            >
              <motion.div
                className="rounded-2xl overflow-hidden shadow-xl w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="/images/emc2.jpg"
                  alt="AI Intelligence - You don't have to be Einstein"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            </motion.div>

            {/* Right side - Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <motion.span
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: BRAND.gold, color: BRAND.blue }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                AI GUIDANCE
              </motion.span>
              <motion.h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
                style={{ color: BRAND.navy }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                What Our AI Does
              </motion.h2>
              <motion.p
                className="text-lg mb-6 leading-relaxed"
                style={{ color: BRAND.navy, opacity: 0.9 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                You don&apos;t have to be Einstein to complete your will. Wilfred is here to help
                you from start to finish.
              </motion.p>
              <motion.p
                className="text-lg mb-8 leading-relaxed"
                style={{ color: BRAND.navy, opacity: 0.9 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Real guidance, real understanding, real confidence. Our AI assistant guides you
                through every step, explaining legal terms in plain English and helping you make
                informed decisions.
              </motion.p>
            </motion.div>
          </div>

          {/* Feature cards */}
          <motion.div
            className="space-y-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {AI_FEATURES.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <motion.div
                  key={feature.number}
                  variants={fadeInUp}
                  className="bg-gradient-to-r from-[#F4FAF7] to-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Number badge */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-[#0A1E86] flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">{feature.number}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <FeatureIcon className="w-6 h-6 text-[#FFBF00]" />
                        <h3 className="text-xl lg:text-2xl font-bold text-[#2B2E4A]">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-lg leading-relaxed mb-3">
                        {feature.description}
                      </p>
                      {feature.result && (
                        <p className="text-[#0A1E86] font-semibold">Result: {feature.result}</p>
                      )}
                      {feature.highlight && (
                        <p className="text-[#0A1E86] font-bold mt-2 text-xl lg:text-2xl">
                          {feature.highlight}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Bottom Line CTA Section                                       */}
      {/* ============================================================ */}
      <section className="py-24 relative overflow-hidden">
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

        {/* Animated floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                background: i % 2 === 0 ? '#FFBF00' : 'rgba(255,255,255,0.3)',
              }}
              animate={{
                y: [0, -30 - Math.random() * 40, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Number.POSITIVE_INFINITY,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Grid pattern overlay */}
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

              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-10 sm:p-14 overflow-visible">
                {/* Wilfred - top right, big and floating */}
                <motion.div
                  className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 md:-top-8 md:-right-8 z-20 pointer-events-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <motion.img
                    src="/images/wilfred.png"
                    alt="Wilfred - Your AI Assistant Mascot"
                    className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-52 lg:h-52 object-contain"
                    animate={{
                      y: [0, -14, 0],
                      rotate: [0, 3, -3, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                    style={{
                      filter: 'drop-shadow(0 12px 28px rgba(10, 30, 134, 0.35))',
                    }}
                  />
                </motion.div>

                {/* Badge */}
                <motion.div
                  className="flex justify-center mb-8 relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#FFBF00]/20 border border-[#FFBF00]/40">
                    <SparklesIcon className="w-5 h-5 text-[#FFBF00]" />
                    <span className="text-[#FFBF00] font-semibold">The Choice is Clear</span>
                  </div>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-8 relative z-10">
                  Bottom Line
                </h2>

                <div className="text-center space-y-6 mb-12 relative z-10">
                  <p className="text-xl sm:text-2xl text-white/80">
                    If you want forms, there are lots of options.
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl text-white">
                    If you want{' '}
                    <span className="text-[#FFBF00] text-xl sm:text-2xl lg:text-3xl font-bold">
                      guidance
                    </span>
                    ,{' '}
                    <span className="text-[#FFBF00] text-xl sm:text-2xl lg:text-3xl font-bold">
                      clarity
                    </span>{' '}
                    and{' '}
                    <span className="text-[#FFBF00] text-xl sm:text-2xl lg:text-3xl font-bold">
                      confidence
                    </span>{' '}
                    there&apos;s iFinallyWill.
                  </p>
                </div>

                {/* CTA Buttons - Start For Free + Chat with Wilfred */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
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
                      <SparklesIcon className="w-6 h-6 mr-3" />
                      Start For Free
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      >
                        &rarr;
                      </motion.span>
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <Link
                      to="/ai-mode"
                      className="relative inline-flex items-center justify-center px-10 sm:px-12 py-5 sm:py-6 rounded-full bg-gradient-to-r from-[#FFBF00] to-[#FFD54F] text-[#0A1E86] font-bold text-lg sm:text-xl shadow-2xl hover:shadow-[0_20px_60px_rgba(255,191,0,0.4)] transition-all duration-300"
                    >
                      <ChatAiIcon className="w-6 h-6 mr-3" />
                      Chat with Wilfred
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      >
                        &rarr;
                      </motion.span>
                    </Link>
                  </motion.div>
                </div>

                {/* Trust indicators */}
                <div className="flex justify-center gap-8 mt-10 pt-8 border-t border-white/10 relative z-10">
                  <div className="text-center">
                    <div className="text-[#FFBF00] font-bold text-lg">No Credit Card</div>
                    <div className="text-white/50 text-sm">Required</div>
                  </div>
                  <div className="w-px h-12 bg-white/20" />
                  <div className="text-center">
                    <div className="text-[#FFBF00] font-bold text-lg">60 Days</div>
                    <div className="text-white/50 text-sm">Money Guarantee</div>
                  </div>
                  <div className="w-px h-12 bg-white/20 hidden sm:block" />
                  <div className="text-center hidden sm:block">
                    <div className="text-[#FFBF00] font-bold text-lg">AI Guided</div>
                    <div className="text-white/50 text-sm">Every Step</div>
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
