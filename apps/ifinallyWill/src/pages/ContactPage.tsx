/**
 * Contact page — pixel-perfect clone from source Contact.jsx
 * Sections: Hero, Contact Form + AI Assistant sidebar, CTA
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitContactForm } from '../utils/contact';

// Brand colors (blue=#0A1E86, gold=#FFBF00, navy=#0C1F3C, offwhite=#F5F5F7, ink=#202020)

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// Color gradients
const gradients = {
  primary: 'from-[#0A1E86] to-[#0A1E86]',
  secondary: 'from-[#A4C3A2] to-[#A4C3A2]',
  dark: 'from-[#2B2E4A] to-[#1F2937]',
  warm: 'from-[#0A1E86] to-[#0C1F3C]',
};

// Particle positions (pre-computed so they don't change on re-render)
const aiParticles = Array.from({ length: 8 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  yOffset: Math.random() * 30 - 15,
  duration: 3 + Math.random() * 2,
}));

const ctaParticles = Array.from({ length: 20 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  yOffset: Math.random() * 100 - 50,
  duration: 3 + Math.random() * 5,
  delay: Math.random() * 2,
}));

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  message: string;
}

interface SubmitStatus {
  show: boolean;
  message: string;
  type: 'success' | 'danger';
}

export function ContactPage() {
  const [validated, setValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({
    show: false,
    message: '',
    type: 'success',
  });

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setIsSubmitting(true);
    setValidated(true);

    try {
      await submitContactForm(formData);

      setSubmitStatus({
        show: true,
        message: "Your message has been sent successfully! We'll get back to you shortly.",
        type: 'success',
      });

      setFormData({
        fullName: '',
        email: '',
        phone: '',
        city: '',
        message: '',
      });
      setValidated(false);
    } catch (error) {
      setSubmitStatus({
        show: true,
        message: 'There was an error sending your message. Please try again later.',
        type: 'danger',
      });
      if (import.meta.env.DEV) {
        console.error('Error sending message:', error);
      }
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSubmitStatus((prev) => ({ ...prev, show: false }));
      }, 5000);
    }
  };

  return (
    <>
      {/* Spacer for LandingLayout navbar */}
      <div className="h-20" />

      {/* Progress bar for scrolling */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#0A1E86] z-50 origin-left"
        style={{
          scaleX: 0,
          transformOrigin: '0%',
        }}
        animate={{
          scaleX: [0, 1],
          transition: { duration: 0.5 },
        }}
      />

      {/* Accessibility skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:text-black focus:p-4"
      >
        Skip to main content
      </a>

      {/* Hero Section */}
      <section
        id="main-content"
        className="relative pt-32 pb-40 sm:pb-48 lg:pb-56 text-white overflow-hidden"
      >
        {/* Background with gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradients.dark} -z-10`} />

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 -z-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="block">
            <defs>
              <pattern id="contactSmallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
              <pattern id="contactGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#contactSmallGrid)" />
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#contactGrid)" />
          </svg>
        </div>

        {/* Animated light effects */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#0A1E86] filter blur-[150px] opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: 'reverse',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center mt-10 sm:mt-14 lg:mt-16"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-white text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Get in Touch
            </h1>
            <p className="text-2xl sm:text-3xl text-[#F4FAF7] mb-8 leading-relaxed">
              We&apos;re here to answer your questions and help you protect what matters most.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <motion.div
              className="lg:col-span-3"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#F4FAF7]">
                <div className="p-8">
                  {/* Status Alert */}
                  <AnimatePresence>
                    {submitStatus.show && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={`mb-6 rounded-xl p-4 ${
                          submitStatus.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                      >
                        <div className="flex">
                          <div className="flex-shrink-0">
                            {submitStatus.type === 'success' ? (
                              <svg
                                className="h-5 w-5 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-5 w-5 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium">{submitStatus.message}</p>
                          </div>
                          <div className="ml-auto pl-3">
                            <button
                              type="button"
                              className="inline-flex text-gray-400 hover:text-gray-500"
                              onClick={() =>
                                setSubmitStatus((prev) => ({
                                  ...prev,
                                  show: false,
                                }))
                              }
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <h2 className="text-2xl font-bold text-[#2B2E4A] mb-6">Send Us a Message</h2>

                  <form noValidate onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      {/* Full Name */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-[#2B2E4A] mb-1">
                          Full Name<span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Your full name"
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[#0A1E86] focus:ring focus:ring-[rgba(231,111,81,0.2)] focus:ring-opacity-50 transition-colors duration-200"
                          required
                        />
                        {validated && !formData.fullName && (
                          <p className="mt-1 text-sm text-red-500">Please provide your name</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#2B2E4A] mb-1">
                            Email<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your.email@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[#0A1E86] focus:ring focus:ring-[rgba(231,111,81,0.2)] focus:ring-opacity-50 transition-colors duration-200"
                            required
                          />
                          {validated && !formData.email && (
                            <p className="mt-1 text-sm text-red-500">
                              Please provide a valid email address
                            </p>
                          )}
                        </div>

                        {/* Phone */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#2B2E4A] mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(123) 456-7890"
                            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[#0A1E86] focus:ring focus:ring-[rgba(231,111,81,0.2)] focus:ring-opacity-50 transition-colors duration-200"
                          />
                        </div>
                      </div>

                      {/* City */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-[#2B2E4A] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Your city"
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[#0A1E86] focus:ring focus:ring-[rgba(231,111,81,0.2)] focus:ring-opacity-50 transition-colors duration-200"
                        />
                      </div>

                      {/* Message */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-[#2B2E4A] mb-1">
                          Message<span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={5}
                          placeholder="How can we help you?"
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:border-[#0A1E86] focus:ring focus:ring-[rgba(231,111,81,0.2)] focus:ring-opacity-50 transition-colors duration-200"
                          required
                        />
                        {validated && !formData.message && (
                          <p className="mt-1 text-sm text-red-500">Please enter your message</p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div>
                        <motion.button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#0C1F3C] text-white font-medium hover:bg-[#0A1E86] transition-all duration-300 shadow-lg hover:shadow-xl w-full md:w-auto"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isSubmitting ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Sending...
                            </>
                          ) : (
                            'Send Message'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* AI Assistant Card - Quick Help */}
            <motion.div
              className="lg:col-span-2"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.2 }}
            >
              {/* Container for card and mascot */}
              <div className="relative mb-8">
                {/* AI Assistant Card */}
                <div className="bg-gradient-to-br from-[#FFBF00] to-[#FFD54F] rounded-2xl shadow-xl text-[#0A1E86] relative overflow-hidden">
                  {/* Animated background particles */}
                  <div className="absolute inset-0 overflow-hidden">
                    {aiParticles.map((p, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-[#0A1E86]/10 rounded-full"
                        style={{
                          top: p.top,
                          left: p.left,
                        }}
                        animate={{
                          y: [0, p.yOffset],
                          opacity: [0.1, 0.3, 0.1],
                        }}
                        transition={{
                          duration: p.duration,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: 'reverse',
                        }}
                      />
                    ))}
                  </div>

                  {/* Wilfred Mascot - Top Right */}
                  <motion.div
                    className="absolute top-0 right-0 sm:-top-2 sm:-right-2 md:-top-4 md:-right-4 lg:-top-6 lg:-right-6 z-20 pointer-events-none"
                    initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <motion.img
                      src="/images/wilfred.png"
                      alt="Wilfred - Your AI Assistant Mascot"
                      className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 xl:w-52 xl:h-52 object-contain"
                      animate={{
                        y: [0, -6, 0],
                        rotate: [0, 1.5, -1.5, 0],
                      }}
                      transition={{
                        duration: 3.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                      }}
                      style={{
                        filter: 'drop-shadow(0 6px 12px rgba(10, 30, 134, 0.25))',
                      }}
                    />
                  </motion.div>

                  <div className="p-8 relative z-10 pr-20 sm:pr-24 md:pr-28 lg:pr-32">
                    <div className="flex items-center mb-4">
                      <motion.div
                        className="w-12 h-12 rounded-full bg-[#0A1E86]/20 flex items-center justify-center mr-4"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      >
                        {/* Chat AI icon (inline SVG) */}
                        <svg
                          className="w-6 h-6 text-[#0A1E86]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0A1E86]">Need Instant Help?</h3>
                        <p className="text-[#0A1E86] text-sm font-medium">
                          Meet our AI assistance Wilfred
                        </p>
                      </div>
                    </div>

                    <p className="text-[#0A1E86]/90 mb-6 leading-relaxed">
                      Get instant answers about Wills, Power of Attorney, estate planning, and more.
                      Our AI assistant is here to guide you through the process.
                    </p>

                    {/* Button wrapper with glow */}
                    <div className="relative">
                      {/* Pulsing glow ring */}
                      <motion.div
                        className="absolute -inset-1 rounded-2xl -z-10"
                        style={{
                          background:
                            'linear-gradient(135deg, #FFBF00 0%, #FFD54F 50%, #FFBF00 100%)',
                          filter: 'blur(8px)',
                        }}
                        animate={{
                          opacity: [0.4, 0.7, 0.4],
                          scale: [1, 1.02, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.button
                        onClick={() => window.dispatchEvent(new CustomEvent('openAIModal'))}
                        className="group relative w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
                        style={{
                          background:
                            'linear-gradient(135deg, #0A1E86 0%, #1a3a9e 50%, #0A1E86 100%)',
                          boxShadow:
                            '0 0 25px rgba(255, 191, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)',
                        }}
                        whileHover={{
                          scale: 1.03,
                          boxShadow:
                            '0 0 50px rgba(255, 191, 0, 0.8), 0 0 100px rgba(255, 191, 0, 0.5), 0 8px 30px rgba(0, 0, 0, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Golden gradient overlay */}
                        <div
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255,191,0,0.25) 0%, transparent 40%, rgba(255,191,0,0.2) 100%)',
                          }}
                        />
                        {/* Shimmer effect on hover */}
                        <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <svg
                          className="w-6 h-6 flex-shrink-0 relative z-10"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                          <circle cx="9" cy="11.5" r="1.5" fill="#FFFFFF" />
                          <circle cx="12.5" cy="11.5" r="1.5" fill="#FFFFFF" />
                          <circle cx="16" cy="11.5" r="1.5" fill="#FFFFFF" />
                        </svg>
                        <span className="text-white relative z-10 font-bold">
                          Chat with AI Assistant Wilfred
                        </span>
                        <svg
                          className="w-5 h-5 flex-shrink-0 relative z-10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ color: '#FFFFFF' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </motion.button>
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-[#0A1E86]/70 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Quick Answers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>No Wait Time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="bg-[#F4FAF7] rounded-2xl p-6 border border-[#E5E7EB]">
                <h4 className="text-lg font-semibold text-[#2B2E4A] mb-3">Response Time</h4>
                <p className="text-[#6B7280] text-sm">
                  We typically respond to messages within 24 hours. For urgent inquiries, use our AI
                  assistant (Wilfred) for instant help.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        className={`py-16 bg-gradient-to-br ${gradients.dark} text-white relative overflow-hidden`}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#0A1E86]/20 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFBF00]/20 rounded-full filter blur-3xl" />
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          {ctaParticles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                top: p.top,
                left: p.left,
              }}
              animate={{
                y: [0, p.yOffset],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: p.duration,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
                delay: p.delay,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-white text-3xl sm:text-4xl font-bold mb-6">
              Ready to Secure Your Family&apos;s Future?
            </h2>
            <p className="text-xl text-[#F4FAF7] mb-10 max-w-2xl mx-auto">
              Join thousands of Canadians who have already protected their loved ones with our
              legally binding estate planning documents.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/register?start=1"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#FFBF00] text-[#0A1E86] font-bold hover:bg-[#FFD54F] transition-all duration-300 shadow-lg inline-block"
                >
                  <svg
                    className="w-5 h-5 mr-2 inline-block"
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
                  Start For Free
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
