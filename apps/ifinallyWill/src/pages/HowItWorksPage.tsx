/**
 * HowItWorksPage — full how-it-works page with 7 sections
 * Pixel-perfect clone from source HowItWorks.jsx + all sub-components
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
  ink: '#202020',
};

/* ───────────────────────────────────────────────
 * 1. HeroSection
 * ─────────────────────────────────────────────── */
function HeroSection() {
  const highlightBrand = (text: string) => {
    const parts = text.split('iFinallyWill');
    if (parts.length === 1) return text;
    return parts.flatMap((part, i) =>
      i < parts.length - 1
        ? [
            part,
            <span
              key={i}
              style={{
                color: '#0A1E86',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                lineHeight: 'inherit',
              }}
            >
              iFinallyWill
            </span>,
          ]
        : part
    );
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* Yellow line at the top */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{ height: '2px', backgroundColor: colors.gold }}
      />

      {/* Background Image */}
      <div
        className="absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          background: 'url(/images/how-it-works-hero.png) lightgray 50% / cover no-repeat',
        }}
      >
        {/* Mobile gradient */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,30,100,0.85) 0%, rgba(10,30,100,0.75) 50%, rgba(10,30,100,0.65) 100%)',
          }}
        />
        {/* Desktop gradient */}
        <div
          className="hidden md:block absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(10,30,100,0.7) 0%, rgba(10,30,100,0.5) 40%, rgba(10,30,100,0.3) 70%, rgba(10,30,100,0.2) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[50vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-0 flex items-center">
        <div className="w-full">
          <motion.h1
            className="mb-4 sm:mb-5"
            style={{
              color: '#FFF',
              fontSize: 'clamp(32px, 8vw, 90px)',
              fontWeight: 700,
              lineHeight: 'clamp(40px, 10vw, 100px)',
              letterSpacing: '-0.02em',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            How it works
          </motion.h1>
          <motion.p
            className="mt-3 sm:mt-5 max-w-full sm:max-w-[610px]"
            style={{
              color: '#FFF',
              fontSize: 'clamp(16px, 4vw, 22px)',
              fontWeight: 700,
              lineHeight: 'clamp(24px, 5vw, 32px)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {highlightBrand(
              'Learn how iFinallyWill can help you make the most informed decision for yourself and your loved ones.'
            )}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
 * 2. BestOptionSection
 * ─────────────────────────────────────────────── */
function BestOptionSection() {
  const descFallback =
    'iFinallyWill is the best solution for creating your will online because it combines simplicity, security, and trusted legal expertise in one seamless experience. The platform guides you step by step through the process, making it easy to create a legally sound will from the comfort of your home, without the stress or high costs of traditional methods.';
  const expFallback =
    "With over 18+ years of dedicated experience in estate planning and will drafting, our team of professional lawyers brings unparalleled expertise to every document we help create. This extensive experience means we understand the nuances of Canadian estate law, have seen countless real-world scenarios, and know exactly what it takes to ensure your will stands up when it matters most. Our proven track record gives you the confidence that your family's future is protected by documents crafted with deep legal knowledge and practical wisdom gained from decades of practice.";

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-24 min-h-[50vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12 sm:mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="mb-4 sm:mb-6 mx-auto"
            style={{
              maxWidth: '954px',
              color: '#0A1E86',
              textAlign: 'center',
              fontSize: 'clamp(32px, 8vw, 90px)',
              fontWeight: 700,
              lineHeight: 'clamp(40px, 10vw, 100px)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            The best option for creating your will
          </motion.h1>
          <motion.div
            className="mx-auto max-w-[751px] w-full"
            style={{
              display: 'flex',
              padding: 'clamp(8px, 2vw, 10px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              background: '#FFBF00',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p
              style={{
                color: '#000',
                fontSize: 'clamp(16px, 4vw, 24px)',
                fontWeight: 700,
                lineHeight: 'clamp(24px, 6vw, 50px)',
                margin: 0,
              }}
            >
              and why it makes sense to protect your family with us
            </p>
          </motion.div>
        </motion.div>

        {/* Professional Lawyers */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center mb-16 sm:mb-20 lg:mb-24"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2
              className="font-bold mb-4 sm:mb-6"
              style={{
                fontSize: 'clamp(24px, 5vw, 40px)',
                lineHeight: 'clamp(30px, 6vw, 50px)',
                color: '#0F0F0F',
              }}
            >
              Professional Lawyers at your fingertips
            </h2>
            <p
              style={{
                fontSize: 'clamp(14px, 3vw, 18px)',
                lineHeight: 'clamp(20px, 4vw, 26px)',
                color: '#000000',
              }}
            >
              {descFallback}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.div
              className="rounded-2xl sm:rounded-3xl overflow-hidden w-full"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src="/images/professional-lawyers.png"
                alt="Professional lawyers reviewing documents on laptop"
                className="w-full h-auto object-cover"
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Over 18+ years */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center relative"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="rounded-2xl sm:rounded-3xl overflow-hidden w-full"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src="/images/family-grandfather-granddaughter.png"
                alt="Grandfather and granddaughter in a warm embrace"
                className="w-full h-auto object-cover"
              />
            </motion.div>
            <motion.div
              className="absolute -right-8 sm:-right-12 -bottom-8 sm:-bottom-12 w-24 h-24 sm:w-40 sm:h-40 hidden lg:block z-10"
              style={{ backgroundColor: 'transparent', pointerEvents: 'none' }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 0.3, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full" style={{ opacity: 0.3 }}>
                <path
                  d="M 40 40 L 40 160 L 160 160"
                  fill="none"
                  stroke="#FFBF00"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </motion.div>
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2
              className="font-bold mb-4 sm:mb-6"
              style={{
                fontSize: 'clamp(24px, 5vw, 40px)',
                lineHeight: 'clamp(30px, 6vw, 50px)',
                color: '#0F0F0F',
              }}
            >
              Over 18+ years of experience
            </h2>
            <p
              style={{
                fontSize: 'clamp(14px, 3vw, 18px)',
                lineHeight: 'clamp(20px, 4vw, 26px)',
                color: '#000000',
              }}
            >
              {expFallback}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
 * 3. AIAdvantageSection
 * ─────────────────────────────────────────────── */
function AIAdvantageSection() {
  const advantages = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: 'Plain Language Explanations',
      desc: 'Complex legal terms explained in simple, everyday language so you understand every decision you make.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      title: 'Step-by-Step Guidance',
      desc: 'Our AI walks you through each section, providing context and recommendations based on your specific situation.',
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
      title: 'Provincial Compliance',
      desc: 'Automatically ensures your will meets the legal requirements for your province, catching potential issues before they become problems.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      title: 'Personalized Recommendations',
      desc: 'Suggests options based on your family structure, assets, and goals like having an estate planning expert by your side.',
    },
  ];

  return (
    <section className="relative py-16 md:py-24 min-h-[50vh] overflow-hidden bg-white">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="aiGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colors.blue} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aiGrid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header + Wilfred */}
        <motion.div
          className="text-center mb-12 md:mb-16 relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Wilfred desktop */}
          <motion.div
            className="hidden md:block absolute top-2 right-4 lg:right-8 xl:right-16 z-20"
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.img
              src="/images/wilfred.png"
              alt="Wilfred - AI Assistant"
              className="w-48 h-48 lg:w-56 lg:h-56 object-contain"
              animate={{ rotate: [0, 5, -5, 0], y: [0, -3, 0] }}
              transition={{
                rotate: {
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
                y: {
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
              }}
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
            />
          </motion.div>

          {/* Wilfred mobile */}
          <motion.div
            className="flex justify-center mb-6 md:hidden"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.img
              src="/images/wilfred.png"
              alt="Wilfred - AI Assistant"
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
              animate={{ rotate: [0, 5, -5, 0], y: [0, -3, 0] }}
              transition={{
                rotate: {
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
                y: {
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
              }}
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
            />
          </motion.div>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4"
            style={{ color: colors.blue }}
          >
            Our Proprietary AI Advantage for You!
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Unlike other platforms that leave you on your own, iFinallyWill&apos;s AI acts as your
            personal guide, explaining complex legal concepts in plain language and helping you make
            informed decisions every step of the way.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
          {advantages.map((adv, index) => (
            <motion.div
              key={adv.title}
              className="group bg-white rounded-2xl p-6 md:p-8 shadow-lg cursor-pointer relative transition-all duration-300"
              style={{ border: '2px solid transparent' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5, transition: { duration: 0.3 } }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.gold;
                e.currentTarget.style.boxShadow =
                  '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 rounded-xl p-3 transition-all duration-300"
                  style={{ backgroundColor: `${colors.gold}20`, color: colors.blue }}
                >
                  {adv.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ color: colors.blue }}>
                    {adv.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{adv.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-block rounded-2xl p-8 md:p-12 bg-white shadow-xl max-w-3xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: colors.blue }}>
              Experience the Difference
            </h3>
            <p className="text-lg text-gray-700 mb-6">
              See how our AI guided approach makes creating your will simpler, clearer, and more
              confident.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-white"
              style={{ backgroundColor: colors.blue }}
            >
              Start Your Will Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
 * 4. WhatToInclude
 * ─────────────────────────────────────────────── */
function WhatToInclude() {
  const includeItems = [
    { label: 'Assets and beneficiaries:', text: 'A list of property and who should inherit it.' },
    { label: 'Executor:', text: 'The person you trust to carry out your instructions.' },
    {
      label: 'Guardianship provisions:',
      text: 'If you have minor children, name who should care for them.',
    },
    {
      label: 'Debts and expenses:',
      text: 'Instructions for handling outstanding bills, funeral costs, or taxes.',
    },
    {
      label: 'Special instructions:',
      text: 'Anything unique, such as charitable donations or family heirlooms you want to pass down.',
    },
  ];

  return (
    <div className="bg-white py-12 sm:py-16 md:py-24 min-h-[50vh]">
      {/* Online vs Traditional */}
      <motion.section
        className="max-w-6xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <motion.div
            className="w-full md:w-1/2 order-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2
              className="font-bold mb-4 sm:mb-6"
              style={{
                color: '#000000',
                fontSize: 'clamp(24px, 5vw, 48px)',
                fontWeight: 700,
                lineHeight: '1.2',
              }}
            >
              Online vs. Traditional Will Creation
            </h2>
            <p
              className="mb-4 sm:mb-6 max-w-full md:max-w-[618px]"
              style={{
                color: '#000',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              Today, you can create a will either through an online service or with the help of an
              estate planning attorney. Each approach has advantages:
            </p>
            <ul className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <li>
                <span
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 700,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                  }}
                >
                  Online wills:
                </span>
                <span
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                    marginLeft: '4px',
                  }}
                >
                  Creating a will online can be an affordable and convenient option. Online tools
                  walk you through a step-by-step questionnaire and are best for straightforward
                  estates.
                </span>
              </li>
              <li>
                <span
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 700,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                  }}
                >
                  Traditional wills:
                </span>
                <span
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                    marginLeft: '4px',
                  }}
                >
                  A more traditional or more detailed will is drafted with a lawyer. These work well
                  if you have complex assets, blended families, or need specialized tax planning.
                </span>
              </li>
            </ul>
            <p
              className="max-w-full md:max-w-[618px]"
              style={{
                color: '#000',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              The right choice depends on your situation. For many people, starting online is
              sufficient, but consulting an attorney can add peace of mind if your estate is
              complicated.
            </p>
          </motion.div>
          <motion.div
            className="w-full md:w-1/2 order-2"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative group">
              <motion.div
                className="hidden sm:block absolute -bottom-8 -left-8 w-24 h-24 sm:w-32 sm:h-32 z-0"
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="44" stroke="#FFBF00" strokeWidth="12" fill="none" />
                </svg>
              </motion.div>
              <motion.div
                className="relative z-10 overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="/images/image2.png"
                  alt="Elderly man reviewing documents"
                  className="w-full h-[250px] sm:h-[320px] md:h-[380px] object-cover"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* What Should be Included */}
      <motion.section
        className="max-w-6xl mx-auto px-4 sm:px-6"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative group">
              <motion.div
                className="hidden sm:block absolute -bottom-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 z-0"
                initial={{ opacity: 0, scale: 0, rotate: 180 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="44" stroke="#FFBF00" strokeWidth="12" fill="none" />
                </svg>
              </motion.div>
              <motion.div
                className="relative z-10 overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="/images/image3.png"
                  alt="Business partners or family members discussing a will"
                  className="w-full h-[250px] sm:h-[320px] md:h-[380px] object-cover"
                />
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2
              className="font-bold mb-4 sm:mb-6"
              style={{
                color: '#000000',
                fontSize: 'clamp(24px, 5vw, 48px)',
                fontWeight: 700,
                lineHeight: '1.2',
              }}
            >
              What Should be Included in a Will?
            </h2>
            <p
              className="mb-4 sm:mb-6 max-w-full md:max-w-[618px]"
              style={{
                color: '#000',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              A will should clearly outline your wishes so there&apos;s no confusion later. Most
              people include:
            </p>
            <ul className="space-y-3 sm:space-y-4">
              {includeItems.map((item) => (
                <li key={item.label}>
                  <span
                    style={{
                      color: '#000',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 700,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: '#000',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      marginLeft: '4px',
                    }}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * 5. StepsToCreateWill
 * ─────────────────────────────────────────────── */
function StepsToCreateWill() {
  const steps = [
    {
      num: '1',
      bold: 'List your assets:',
      text: 'Include property, bank accounts, investments, and personal items you want to pass on.',
    },
    {
      num: '2',
      bold: 'Choose beneficiaries:',
      text: 'Decide who should inherit each part of your estate.',
    },
    {
      num: '3',
      bold: 'Select an executor:',
      text: 'This person will manage your estate and make sure your wishes are carried out.',
    },
    {
      num: '4',
      bold: 'Name guardians (if needed):',
      text: 'Parents can use a will to designate who should care for minor children.',
    },
    {
      num: '5',
      bold: 'Write and sign the will:',
      text: 'You can draft it online, use a lawyer, or complete a template, but it must be signed according to state rules.',
    },
    {
      num: '6',
      bold: 'Store it safely:',
      text: 'Keep it in a secure location and let your executor know where to find it.',
    },
  ];
  const reqs = [
    { num: '1', bold: 'Written', text: '(typed or handwritten, depending on state law).' },
    { num: '2', bold: 'Signed', text: 'by the person making the will.' },
    { num: '3', bold: 'Witnessed', text: "by at least two adults who aren't beneficiaries." },
  ];

  return (
    <motion.div
      className="relative w-full min-h-[50vh]"
      style={{ overflow: 'visible' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Blue background SVG shape */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1944"
        height="1078.5"
        viewBox="0 0 1920 1079"
        fill="none"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0H1944V967C1944 967 914.5 1078.5 657.5 1078.5C400.5 1078.5 0 967 0 967V0Z"
          fill="#0C1F3C"
        />
      </svg>

      <div className="relative z-10 w-full h-full flex flex-col lg:flex-row min-h-[50vh]">
        {/* Left - Image */}
        <motion.div
          className="w-full lg:w-1/2 flex items-start justify-center relative lg:py-0 lg:pt-16 pb-8 pt-12"
          style={{ overflow: 'visible', minHeight: '250px' }}
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Mobile image */}
          <motion.div
            className="lg:hidden mx-auto"
            style={{
              width: 'clamp(320px, 80vw, 500px)',
              height: 'clamp(186px, 46.5vw, 291px)',
              borderRadius: 'clamp(131px, 32.8vw, 205px)',
              background: '#D9D9D9',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 2,
            }}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div
              style={{
                width: 'clamp(400px, 100vw, 600px)',
                height: 'clamp(211px, 52.8vw, 316px)',
                aspectRatio: '1409.97/743.54',
                background: 'url(/images/StepsWill.jpg) lightgray 0px 0px / 100% 100% no-repeat',
                position: 'absolute',
                left: 'clamp(-40px, -10vw, -50px)',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          </motion.div>
          {/* Desktop image */}
          <motion.div
            className="hidden lg:block"
            style={{
              width: '1076px',
              height: '626px',
              borderRadius: '354px',
              background: '#D9D9D9',
              overflow: 'hidden',
              marginLeft: '-600px',
              position: 'relative',
              zIndex: 2,
            }}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div
              style={{
                width: '1198px',
                height: '632px',
                aspectRatio: '1409.97/743.54',
                background: 'url(/images/StepsWill.jpg) lightgray 0px 0px / 100% 100% no-repeat',
                position: 'absolute',
                left: '-122px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Right - Text */}
        <motion.div
          className="w-full lg:w-1/2 flex items-start px-6 py-6 sm:px-8 sm:py-8 md:px-12 md:py-12 lg:pt-16 lg:pb-16 lg:pl-8 lg:pr-16 relative z-10"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div style={{ width: '100%', maxWidth: '100%' }}>
            <motion.h2
              className="mb-4 sm:mb-6"
              style={{
                width: '100%',
                color: '#FFFFFF',
                textAlign: 'left',
                fontSize: 'clamp(28px, 6vw, 70px)',
                fontWeight: 700,
                lineHeight: 'clamp(36px, 7.5vw, 85px)',
              }}
            >
              Steps to Create a Will
            </motion.h2>
            <motion.p
              className="mb-6 sm:mb-8"
              style={{
                width: '100%',
                color: '#FFFFFF',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              Learning how to create a will can feel daunting, but the process is easier when broken
              into clear steps. Here&apos;s what&apos;s typically involved:
            </motion.p>

            <ol
              className="mb-6 sm:mb-8"
              style={{ listStyle: 'none', paddingLeft: 0, width: '100%' }}
            >
              {steps.map((item, idx) => (
                <motion.li
                  key={idx}
                  className="flex items-start"
                  style={{ marginBottom: 'clamp(12px, 3vw, 20px)', width: '100%' }}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                >
                  <span
                    style={{
                      color: '#FFBF00',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 700,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      marginRight: '4px',
                      minWidth: 'clamp(20px, 4vw, 30px)',
                      flexShrink: 0,
                    }}
                  >
                    {item.num}.
                  </span>
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      flex: 1,
                    }}
                  >
                    <span style={{ color: '#FFBF00', fontWeight: 700 }}>{item.bold}</span>{' '}
                    {item.text}
                  </span>
                </motion.li>
              ))}
            </ol>

            <motion.p
              className="mb-3 sm:mb-4"
              style={{
                width: '100%',
                color: '#FFFFFF',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              Each state has its own requirements, but for a will to be valid it must generally be
            </motion.p>

            <ol style={{ listStyle: 'none', paddingLeft: 0, width: '100%' }}>
              {reqs.map((item, idx) => (
                <motion.li
                  key={idx}
                  className="flex items-start"
                  style={{ marginBottom: 'clamp(10px, 2.5vw, 16px)', width: '100%' }}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                >
                  <span
                    style={{
                      color: '#FFBF00',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 700,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      marginRight: '4px',
                      minWidth: 'clamp(20px, 4vw, 30px)',
                      flexShrink: 0,
                    }}
                  >
                    {item.num}.
                  </span>
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      flex: 1,
                    }}
                  >
                    <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{item.bold}</span>{' '}
                    {item.text}
                  </span>
                </motion.li>
              ))}
            </ol>

            <motion.div
              className="mt-8 sm:mt-10 flex justify-start"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base sm:text-lg transition-all hover:scale-105"
                style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
              >
                Start For Free
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────
 * 6. CommonMistakes
 * ─────────────────────────────────────────────── */
function CommonMistakesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#common-mistakes') {
        setTimeout(() => {
          const el = document.getElementById('common-mistakes');
          if (el) {
            const pos = el.getBoundingClientRect().top + window.pageYOffset - 120;
            window.scrollTo({ top: pos, behavior: 'smooth' });
          }
        }, 100);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const mistakes = [
    'Not updating your will. Major life events like marriage, divorce, or the birth of a child should trigger a review. Otherwise, your will may leave out important heirs or contradict your current situation.',
    'Leaving vague instructions. Simply writing "divide equally" or "leave to family" can create disputes. Clear, detailed instructions help avoid delays and conflict.',
    'Forgetting digital assets. Phones, email, and online accounts are often password-protected. Without clear guidance, your executor may not be able to access critical information.',
    'Not following provincial rules. Each province has its own requirements for signing and witnessing a will. Missing these steps can render your will invalid or unenforceable.',
  ];

  return (
    <div className="bg-white py-12 sm:py-16 md:py-24 min-h-[50vh]">
      {/* Common Mistakes */}
      <motion.section
        ref={sectionRef}
        id="common-mistakes"
        className="max-w-6xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32"
        style={{ scrollMarginTop: '120px', paddingTop: '40px' }}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <motion.div
            className="w-full md:w-1/2 order-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2
              id="common-mistakes-title"
              className="font-bold mb-4 sm:mb-6 pt-6"
              style={{
                color: '#0F0F0F',
                fontSize: 'clamp(24px, 5vw, 40px)',
                fontWeight: 700,
                lineHeight: 'clamp(30px, 6vw, 50px)',
                scrollMarginTop: '120px',
              }}
            >
              Common Mistakes to Avoid
            </h2>
            <p
              className="mb-4 sm:mb-6"
              style={{
                color: '#000',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              Even a well-intended will can cause problems if it&apos;s not prepared carefully.
              Watch out for these common missteps:
            </p>
            <ul className="space-y-3 sm:space-y-4">
              {mistakes.map((m, idx) => (
                <motion.li
                  key={idx}
                  className="flex items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                >
                  <span
                    className="mr-3 mt-1 flex-shrink-0"
                    style={{
                      width: 'clamp(6px, 1.5vw, 8px)',
                      height: 'clamp(6px, 1.5vw, 8px)',
                      borderRadius: '50%',
                      backgroundColor: '#000000',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      color: '#000',
                      fontSize: 'clamp(14px, 3vw, 18px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(20px, 4vw, 26px)',
                      flex: 1,
                    }}
                  >
                    {m}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            className="w-full md:w-1/2 order-2"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl">
                <img
                  src="/images/Common-mis.png"
                  alt="Person covering their face at a desk with papers"
                  className="w-full h-[250px] sm:h-[320px] md:h-[380px] object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Updating Your Will */}
      <motion.section
        className="max-w-6xl mx-auto px-4 sm:px-6"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl">
                <img
                  src="/images/Intersect.png"
                  alt="Hand reaching into a filing cabinet"
                  className="w-full h-[250px] sm:h-[320px] md:h-[380px] object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2
              className="font-bold mb-4 sm:mb-6"
              style={{
                color: '#000000',
                fontSize: 'clamp(24px, 5vw, 48px)',
                fontWeight: 700,
                lineHeight: '1.2',
              }}
            >
              Updating Your Will Anytime, at No Cost
            </h2>
            <p
              style={{
                color: '#000',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 400,
                lineHeight: 'clamp(20px, 4vw, 26px)',
              }}
            >
              A will isn&apos;t a one-and-done document. Your life evolves, and your will should
              evolve with it. That&apos;s why you can review and update your will at any time, at no
              additional cost no friction, no penalties. Major life events like marriage, divorce,
              the birth of a child, or meaningful financial changes are natural triggers to revisit
              your will. Even without big changes, experts recommend reviewing it every few years to
              ensure it still reflects your wishes. Being able to make small updates along the way
              for free helps prevent larger issues later and keeps your estate plan accurate,
              current, and aligned with your life as it changes.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * 7. SecureStorage
 * ─────────────────────────────────────────────── */
function SecureStorageSection() {
  return (
    <motion.div
      id="secure-storage"
      className="bg-white py-12 sm:py-16 md:py-24 min-h-[50vh]"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full px-4 sm:px-8 md:px-16 lg:px-24 xl:px-28">
        <div
          className="relative mx-auto w-full max-w-[1707px] rounded-[18px]"
          style={{ backgroundColor: '#F5F5F7' }}
        >
          <div
            className="relative z-10 flex flex-col lg:flex-row items-start gap-8 sm:gap-12 lg:gap-20"
            style={{
              paddingTop: 'clamp(30px, 8vw, 65px)',
              paddingBottom: 'clamp(18px, 4vw, 18px)',
              paddingLeft: 'clamp(18px, 4vw, 18px)',
              paddingRight: 'clamp(18px, 4vw, 18px)',
            }}
          >
            {/* Left - Text */}
            <motion.div
              className="w-full lg:w-1/2 flex flex-col order-1 lg:order-1 relative z-10"
              style={{
                gap: 'clamp(12px, 3vw, 16px)',
                paddingLeft: 'clamp(0px, 8vw, 60px)',
                paddingRight: 'clamp(0px, 4vw, 20px)',
              }}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div>
                <h2
                  className="font-bold mb-2 sm:mb-3"
                  style={{
                    width: '100%',
                    maxWidth: '716px',
                    color: '#0F0F0F',
                    textAlign: 'left',
                    fontSize: 'clamp(24px, 5vw, 40px)',
                    fontWeight: 700,
                    lineHeight: 'clamp(30px, 6vw, 50px)',
                  }}
                >
                  Secure Storage and Executor&apos;s Role
                </h2>
                <p
                  style={{
                    width: '100%',
                    maxWidth: '681px',
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                  }}
                >
                  Once your will is complete, keeping it safe and accessible is just as important as
                  writing it. Your executor needs to know where to find it when the time comes.
                </p>
              </div>

              <div style={{ width: '100%', maxWidth: '698px' }}>
                <h3
                  className="font-bold mb-2 sm:mb-3"
                  style={{
                    color: '#0C1F3C',
                    fontSize: 'clamp(18px, 4vw, 26px)',
                    fontWeight: 700,
                    lineHeight: 'clamp(22px, 4vw, 26px)',
                  }}
                >
                  Choosing a Digital Executor
                </h3>
                <p
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                  }}
                >
                  In today&apos;s world, digital property matters too. You may want to name a
                  digital executor separately. This person should be someone you trust to manage
                  online accounts, passwords, and digital files after you pass away.
                </p>
              </div>

              <div style={{ width: '100%', maxWidth: '698px' }}>
                <h3
                  className="font-bold mb-2 sm:mb-3"
                  style={{
                    color: '#0C1F3C',
                    fontSize: 'clamp(18px, 4vw, 26px)',
                    fontWeight: 700,
                    lineHeight: 'clamp(22px, 4vw, 26px)',
                  }}
                >
                  Where to Store Your Will
                </h3>
                <p
                  style={{
                    color: '#000',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(20px, 4vw, 26px)',
                  }}
                >
                  Many people keep their will in a fireproof safe at home, with their attorney, or
                  in a secure online storage system. Avoid safety deposit boxes that may be
                  difficult to access. Always tell your executor where the document is stored and
                  how to access it.
                </p>
              </div>

              <div
                className="flex flex-col sm:flex-row gap-4"
                style={{ marginTop: 'clamp(8px, 2vw, 12px)' }}
              >
                <Link
                  to="/register"
                  className="transition-all hover:opacity-90 flex items-center justify-center w-full sm:w-[213px]"
                  style={{
                    height: 'clamp(50px, 8vw, 60px)',
                    padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 33px)',
                    borderRadius: '30px',
                    background: '#0A1E86',
                    color: '#FFF',
                    fontSize: 'clamp(16px, 3.5vw, 20px)',
                    fontWeight: 700,
                  }}
                >
                  Start For Free
                </Link>
              </div>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              className="w-full lg:w-1/2 relative h-full flex items-end justify-center order-2 lg:order-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div
                className="relative z-10 lg:hidden w-full flex justify-center mt-6 mb-4"
                style={{
                  width: '100%',
                  maxWidth: '434px',
                  height: 'auto',
                  minHeight: 'clamp(300px, 80vw, 500px)',
                  aspectRatio: '217/300',
                  background: 'url(/images/secure-storage.png) center center / contain no-repeat',
                }}
                role="img"
                aria-label="Woman holding a smartphone"
              />
              <div
                className="hidden lg:block relative z-10"
                style={{
                  width: 'clamp(200px, 50vw, 434px)',
                  height: 'clamp(280px, 70vw, 600px)',
                  aspectRatio: '217/300',
                  background: 'url(/images/secure-storage.png) 50% / cover no-repeat',
                }}
                role="img"
                aria-label="Woman holding a smartphone"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────
 * Main Page
 * ─────────────────────────────────────────────── */
export function HowItWorksPage() {
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash.substring(1));
          if (element) {
            const pos = element.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: Math.max(0, pos), behavior: 'smooth' });
          }
        }, 500);
      }
    };
    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  return (
    <>
      <div className="h-20" />
      <HeroSection />
      <BestOptionSection />
      <AIAdvantageSection />
      <WhatToInclude />
      <StepsToCreateWill />
      <CommonMistakesSection />
      <SecureStorageSection />
    </>
  );
}
