/**
 * HowToStartSection — 3 steps with image + gold arc + stars rating
 * Pixel-perfect clone from source HowToStart.jsx
 */

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

const brandBlue = '#0A1E86';
const gold = '#FFBF00';

function StepItem({
  icon,
  title,
  children,
  index,
  isInView,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  index: number;
  isInView: boolean;
}) {
  const delay = 0.4 + index * 0.15;

  return (
    <motion.div
      className="flex gap-3 items-start"
      initial={{ opacity: 0, x: 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <motion.div
        className="h-12 w-12 rounded-full grid place-items-center flex-shrink-0"
        style={{ border: `2px solid ${brandBlue}`, color: brandBlue }}
        aria-hidden="true"
        initial={{ scale: 0, rotate: -180 }}
        animate={isInView ? { scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.1, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1, backgroundColor: brandBlue, color: 'white' }}
      >
        {icon}
      </motion.div>
      <div className="pt-0.5">
        <motion.p
          className="font-bold text-base sm:text-lg"
          style={{ color: brandBlue }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: delay + 0.15 }}
        >
          {title}
        </motion.p>
        <motion.p
          className="text-black/70 text-base sm:text-lg leading-relaxed mt-0.5"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: delay + 0.2 }}
        >
          {children}
        </motion.p>
      </div>
    </motion.div>
  );
}

export function HowToStartSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="how-to-start"
      className="bg-white py-16 lg:py-20 min-h-[50vh] flex flex-col justify-center overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <motion.p
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: brandBlue }}
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            HOW TO START
          </motion.p>
          <motion.h2
            className="mt-2 font-extrabold leading-tight"
            style={{ color: brandBlue, fontSize: 'clamp(28px, 5vw, 48px)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            We guide you from start to finish
          </motion.h2>
          <motion.p
            className="mt-3 text-gray-600 max-w-2xl mx-auto leading-relaxed text-base sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Create a legally valid will from the comfort of your home in under 20 minutes. Our
            step-by-step process makes estate planning simple, affordable, and stress-free.
          </motion.p>
        </div>

        {/* Grid: image + steps */}
        <div className="mt-10 lg:mt-14 grid gap-8 lg:gap-12 items-center lg:grid-cols-[1.15fr_1fr]">
          {/* Left: image with decorative gold arc */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {/* Gold arc */}
            <motion.div
              className="pointer-events-none absolute -left-6 -bottom-6 h-36 w-36 md:h-48 md:w-48 z-0"
              aria-hidden="true"
              initial={{ scale: 0, rotate: -90 }}
              animate={isInView ? { scale: 1, rotate: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.5, type: 'spring', stiffness: 100 }}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={gold}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="180 400"
                  strokeDashoffset="30"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
            <motion.div
              className="relative z-10 max-w-lg rounded-2xl overflow-hidden shadow-card-lg"
              whileHover={{ scale: 1.02, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
              transition={{ duration: 0.3 }}
            >
              <img
                src="/images/couplewithbaby.jpeg"
                alt="Parent reading with child"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </motion.div>

          {/* Right: steps + CTA */}
          <div>
            <div className="space-y-5">
              <StepItem
                title="Share Your Wishes"
                index={0}
                isInView={isInView}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path d="M12 21s-7-4.434-7-10a4 4 0 0 1 7-2.646A4 4 0 0 1 19 11c0 5.566-7 10-7 10Z" />
                    <path d="M9 11l2 2 4-4" />
                  </svg>
                }
              >
                Answer some simple questions, without the legal jargon.
              </StepItem>

              <StepItem
                title="Generate Your Will and POAs"
                index={1}
                isInView={isInView}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <rect x="9" y="20" width="6" height="2" rx="0.5" />
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <circle cx="12" cy="10" r="1" />
                    <line x1="6" y1="10" x2="18" y2="10" />
                    <circle cx="6" cy="10" r="0.8" />
                    <circle cx="18" cy="10" r="0.8" />
                    <path d="M4 10l-1.5 2.5h3l-1.5-2.5z" />
                    <path d="M20 10l-1.5 2.5h3l-1.5-2.5z" />
                  </svg>
                }
              >
                In seconds, your custom Will and POAs are ready to be signed.
              </StepItem>

              <StepItem
                title="Get it Signed"
                index={2}
                isInView={isInView}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                    <path d="M14 2v6h6" />
                    <path d="M8 15h4M8 19h8M8 11h6" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                }
              >
                Follow the step-by-step instructions to make it legally binding.
              </StepItem>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Link
                to="/register?start=1"
                className="inline-block mt-5 rounded-full text-white px-7 py-3 font-semibold shadow-md hover:shadow-lg"
                style={{ backgroundColor: brandBlue }}
              >
                Start Free Now
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Trust indicator — Google rating */}
        <motion.div
          className="mt-10 flex items-center justify-center gap-2 text-gray-600 text-base sm:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <motion.svg
                key={i}
                className="h-5 w-5 sm:h-6 sm:w-6"
                viewBox="0 0 20 20"
                fill={brandBlue}
                initial={{ scale: 0, rotate: -180 }}
                animate={isInView ? { scale: 1, rotate: 0 } : {}}
                transition={{ duration: 0.4, delay: 1.1 + i * 0.1, type: 'spring', stiffness: 200 }}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </motion.svg>
            ))}
          </div>
          <span style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)' }}>Rated 4.8 stars on</span>
          <span
            className="font-bold"
            aria-label="Google"
            style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)' }}
          >
            <span style={{ color: '#4285F4' }}>G</span>
            <span style={{ color: '#DB4437' }}>o</span>
            <span style={{ color: '#F4B400' }}>o</span>
            <span style={{ color: '#4285F4' }}>g</span>
            <span style={{ color: '#0F9D58' }}>l</span>
            <span style={{ color: '#DB4437' }}>e</span>
          </span>
        </motion.div>
      </div>
    </section>
  );
}
