/**
 * About page — pixel-perfect clone from source AboutUs.jsx
 * Sections: Hero, Trust Badges, Why We Exist, Practitioners, AI Clarity,
 *           Life Changes, Who We're For, Core Values, CTA
 */

import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Brand colors
const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
function HeroSection({ isZoomed }: { isZoomed: boolean }) {
  return (
    <section className="relative pt-32 pb-32 sm:pb-40 lg:pb-48 overflow-hidden bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86]">
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
            <pattern id="aboutHeroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aboutHeroGrid)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Floating Wilfred - Right side (only when NOT zoomed) */}
        {!isZoomed && (
          <motion.div
            className="hidden md:block absolute top-1/2 right-4 lg:right-8 xl:right-16 -translate-y-1/2 z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.img
              src="/images/lawyer_Wilfred-removebg-preview.png"
              alt="Wilfred - Lawyer"
              className="w-48 h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 object-contain"
              animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
              transition={{
                y: {
                  duration: 3.5,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
                rotate: {
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
              }}
              style={{ filter: 'drop-shadow(0 8px 20px rgba(10, 30, 134, 0.3))' }}
            />
          </motion.div>
        )}

        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              About iFinallyWill
            </h1>

            <h2
              className="text-4xl sm:text-5xl lg:text-6xl mb-8 leading-tight"
              style={{ color: colors.gold }}
            >
              The Legal Difference
            </h2>

            <p
              className="text-white mb-4 font-normal max-w-4xl mx-auto text-xl"
              style={{ lineHeight: '1.5' }}
            >
              iFinallyWill is Canada's estate-planning platform built to make creating legally valid
              Wills and Powers of Attorney simple, secure, and accessible without the traditional
              cost, complexity, or delay.
            </p>

            <p
              className="text-white mb-4 font-normal max-w-4xl mx-auto text-xl"
              style={{ lineHeight: '1.5' }}
            >
              For nearly two decades, the people behind iFinallyWill have been answering the same
              questions. Not in surveys. Not in support tickets. But across real desks, in real
              legal matters, as part of active Canadian estate planning and probate work.
            </p>

            <p
              className="text-white font-normal max-w-4xl mx-auto text-xl"
              style={{ lineHeight: '1.5' }}
            >
              Those experiences shaped this platform.
            </p>
          </motion.div>

          {/* Wilfred - Below text (only when zoomed > 120%) */}
          {isZoomed && (
            <motion.div
              className="flex items-center justify-center pointer-events-none mt-8"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.img
                src="/images/lawyer_Wilfred-removebg-preview.png"
                alt="Wilfred - Lawyer"
                className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 object-contain"
                animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
                transition={{
                  y: {
                    duration: 3.5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  },
                  rotate: {
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  },
                }}
                style={{ filter: 'drop-shadow(0 8px 20px rgba(10, 30, 134, 0.3))' }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trusted Where It Matters Most                                      */
/* ------------------------------------------------------------------ */
function TrustSection() {
  const badges = [
    {
      title: 'Built by practitioners',
      text: 'With over 18 years of active Canadian estate planning, probate, and trust administration experience',
    },
    { title: 'Designed to work in court', text: 'Not just on screen' },
    {
      title: 'Province-compliant by design',
      text: 'Documents structured to meet execution and witnessing requirements',
    },
    {
      title: 'Industry-first, AI-guided clarity',
      text: 'So users understand decisions not just fill out forms',
    },
    {
      title: 'Bank-level security',
      text: 'With Canadian privacy compliance and zero monetization of personal data',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto mb-12 text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
            style={{ color: colors.blue }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Trusted Where It Matters Most
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            iFinallyWill isn't an experiment. It's built on real legal experience, tested against
            real outcomes, and designed to stand up when documents are actually relied on.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <h3
                className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                style={{ color: colors.blue }}
              >
                {badge.title}
              </h3>
              <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                {badge.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Why We Exist                                                       */
/* ------------------------------------------------------------------ */
function WhyWeExistSection() {
  const questions = [
    'Is this actually legal?',
    'What happens if something goes wrong?',
    'Who stands behind this when my family needs it most?',
  ];

  const problems = [
    "We've seen Wills challenged because of ambiguity.",
    "We've seen estates delayed for years due to poor execution.",
    'We\'ve seen families forced into court over documents that "looked fine" online but failed when it mattered.',
  ];

  return (
    <section className="py-20 sm:py-24" style={{ backgroundColor: colors.offwhite }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto"
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
              Why We Exist
            </motion.h2>
            <motion.p
              className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Over the last 18+ years, clients have consistently asked:
            </motion.p>
          </div>

          {/* Questions */}
          <motion.div
            variants={fadeInUp}
            className="max-w-4xl mx-auto mb-10 space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {questions.map((question, index) => (
              <div
                key={index}
                className="flex gap-4 sm:gap-5 items-center border-b border-blue-100 pb-4"
              >
                <div
                  className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-md"
                  style={{ backgroundColor: colors.blue }}
                >
                  ?
                </div>
                <p
                  className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight"
                  style={{ color: colors.blue }}
                >
                  {question}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Problem statement */}
          <motion.div
            variants={fadeInUp}
            className="max-w-4xl mx-auto space-y-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-800 leading-relaxed font-semibold text-center">
              Those questions didn't inspire a product idea. They revealed a problem.
            </p>
            <div className="space-y-5 mt-6 max-w-4xl mx-auto">
              {problems.map((item, index) => (
                <p
                  key={index}
                  className="text-lg sm:text-xl lg:text-2xl text-gray-800 leading-relaxed font-semibold"
                >
                  <span
                    className="font-bold text-lg sm:text-xl lg:text-2xl"
                    style={{ color: colors.blue }}
                  >
                    {index + 1}.
                  </span>{' '}
                  {item}
                </p>
              ))}
            </div>
          </motion.div>

          {/* Solution pull-quote */}
          <motion.div
            variants={fadeInUp}
            className="max-w-4xl mx-auto mt-10 border-l-4 pl-5 sm:pl-6 border-[#FFBF00]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-900 leading-relaxed font-semibold">
              It was created by entrepreneurs, business owners, and one of the top national tax and
              estate law teams in North America people who understand both how estate planning
              should work and where it breaks down in real life.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Built by Practitioners                                             */
/* ------------------------------------------------------------------ */
function PractitionersSection() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto"
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
              Built by Practitioners. Designed for the Real World.
            </motion.h2>
          </div>

          <motion.div
            variants={fadeInUp}
            className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium mb-4">
              iFinallyWill is powered by over 18 years of active legal practice in Canadian estate
              planning, probate, and trust administration.
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium">
              Every workflow, prompt, and safeguard in the platform is designed to eliminate
              ambiguity, enforce provincial compliance, and prioritize proper execution so documents
              don't just look correct on screen, but actually work when tested in the real world.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  AI-Guided Clarity                                                  */
/* ------------------------------------------------------------------ */
function AIGuidedSection() {
  const checkItems = [
    'What each decision means?',
    'Why it matters?',
    'How it affects loved ones later?',
  ];

  return (
    <section className="py-20 sm:py-24" style={{ backgroundColor: colors.offwhite }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto"
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
              AI-Guided Clarity (Not Just Forms)
            </motion.h2>
          </div>

          <motion.div
            variants={fadeInUp}
            className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium mb-6">
              At the core of iFinallyWill is an industry-first, AI-guided experience designed to
              help people understand their decisions not just complete documents.
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium mb-6">
              Instead of legal jargon or static templates, the platform walks users step by step
              through each choice, explaining:
            </p>
            <ul className="space-y-4 mb-8">
              {checkItems.map((item, index) => (
                <li key={index} className="flex gap-5 sm:gap-6 items-center">
                  <div
                    className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-lg"
                    style={{ backgroundColor: colors.blue }}
                  >
                    ✓
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium flex-1">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 leading-relaxed font-medium">
              The result is confident, informed estate planning that produces province-compliant
              documents ready to be printed, signed, and witnessed according to local law.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Designed for Life Changes                                          */
/* ------------------------------------------------------------------ */
function LifeChangesSection() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto"
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
              Designed for Life as It Actually Changes
            </motion.h2>
          </div>

          <motion.div
            variants={fadeInUp}
            className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 leading-relaxed font-medium mb-6">
              Estate planning isn't a one-time task. Life evolves.
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 leading-relaxed font-medium mb-6">
              That's why iFinallyWill is built as a decision-support system, not a "set it and
              forget it" product. Documents can be revisited as families grow, assets change, and
              responsibilities evolve so plans remain relevant, not outdated.
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 leading-relaxed font-medium">
              Behind the interface, documents are developed with legal expertise and continuously
              updated to remain accurate, compliant, and current.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Who We're For                                                      */
/* ------------------------------------------------------------------ */
function AudienceSection() {
  const audiences = [
    {
      title: 'Individuals',
      desc: 'Who want a legally valid Will completed correctly, with guidance they can trust.',
    },
    {
      title: 'Parents and Families',
      desc: 'Who need guardianship decisions, asset distribution, and Powers of Attorney aligned and documented properly.',
    },
    {
      title: 'Homeowners and Business Owners',
      desc: 'Who want responsible planning, including Secondary Wills where applicable, without excessive legal fees.',
    },
    {
      title: 'Couples',
      desc: 'Who want coordinated estate plans that reduce confusion for executors later.',
    },
    {
      title: 'Organizations and Charities',
      desc: 'Who want to offer a meaningful value-add to their communities while creating sustainable revenue or fundraising impact through our partner-first model.',
    },
  ];

  return (
    <section className="py-20 sm:py-24" style={{ backgroundColor: colors.offwhite }}>
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
              Who We're For
            </motion.h2>
            <motion.p
              className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              iFinallyWill is designed for Canadians who want clarity, confidence, and control
              without unnecessary friction.
            </motion.p>
          </div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {audiences.map((audience, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  {audience.title}
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  {audience.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Core Values                                                        */
/* ------------------------------------------------------------------ */
function CoreValuesSection() {
  const values = [
    {
      title: 'Security First',
      desc: 'Bank-level data security, Canadian privacy compliance, and zero monetization of personal data. Your legacy is not a dataset.',
    },
    {
      title: 'Clarity Without Jargon',
      desc: 'Plain-language guidance, step-by-step execution clarity, and explicit explanations of why each decision matters.',
    },
    {
      title: 'Long-Term Relevance',
      desc: 'Not a one-time transaction. A platform built for life changes, evolving families, and growing assets.',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white">
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
              Our Core Values
            </motion.h2>
          </div>

          <motion.div
            className="grid md:grid-cols-3 gap-6 sm:gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                  style={{ color: colors.blue }}
                >
                  {value.title}
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Section                                                        */
/* ------------------------------------------------------------------ */
function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86]" />

      {/* Decorative gradient orbs */}
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

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="aboutCTAGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aboutCTAGrid)" />
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
                The Bottom Line
              </h2>
              <p className="text-white/80 text-center mb-4 text-[2rem]">
                There's no shortage of online will platforms.
              </p>
              <p className="text-white/80 text-center mb-8 text-[2rem]">
                There is a shortage of platforms built by people who have seen the consequences when
                estate planning goes wrong.
              </p>
              <p className="font-bold text-white text-center mb-8 text-[2.5rem]">
                iFinallyWill exists to close that gap.
              </p>
              <p className="italic text-center mb-10 text-[2rem]" style={{ color: colors.gold }}>
                Because when the document is finally needed, it's already too late to fix it.
              </p>
              <div className="text-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-10 py-4 rounded-full bg-gradient-to-r from-[#FFBF00] to-[#FFD54F] text-[#0A1E86] font-bold hover:shadow-xl transition-all duration-300 text-lg"
                  >
                    <span className="font-extrabold text-[#0A1E86]">Start For Free</span>
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
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  AboutPage — Main Component                                         */
/* ================================================================== */
export function AboutPage() {
  const [isZoomed, setIsZoomed] = useState(false);

  const checkZoom = useCallback(() => {
    let zoomLevel = 1;
    if (window.visualViewport) {
      zoomLevel = window.visualViewport.scale || 1;
    } else {
      zoomLevel = screen.width / window.innerWidth;
    }
    const widthRatio = window.outerWidth / window.innerWidth;
    const isHighZoom = zoomLevel > 1.2 || widthRatio > 1.2;
    setIsZoomed(isHighZoom);
  }, []);

  // Check zoom on mount and resize
  useEffect(() => {
    checkZoom();
    window.addEventListener('resize', checkZoom);
    return () => window.removeEventListener('resize', checkZoom);
  }, [checkZoom]);

  return (
    <>
      <div className="h-20" />
      <HeroSection isZoomed={isZoomed} />
      <TrustSection />
      <WhyWeExistSection />
      <PractitionersSection />
      <AIGuidedSection />
      <LifeChangesSection />
      <AudienceSection />
      <CoreValuesSection />
      <CTASection />
    </>
  );
}
