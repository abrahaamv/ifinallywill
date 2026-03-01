/**
 * AIHelpSection — "Chat with Wilfred" promo card with shimmer button
 * Pixel-perfect clone from source AIHelp.jsx
 */

import { motion } from 'framer-motion';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
};

export function AIHelpSection() {
  return (
    <section className="py-6 md:py-8 bg-white">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="relative">
          <motion.div
            className="bg-gradient-to-br from-[#FFBF00] to-[#FFD54F] rounded-3xl px-6 md:px-8 py-8 md:py-10 shadow-lg relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
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

            {/* Header Section */}
            <div className="flex items-start gap-3 mb-5 pr-20 sm:pr-24 md:pr-28 lg:pr-32 relative z-10">
              {/* Chat Icon */}
              <div
                className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#D4A574' }}
              >
                <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                    stroke={colors.blue}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="11.5" r="1.5" fill={colors.blue} />
                  <circle cx="12.5" cy="11.5" r="1.5" fill={colors.blue} />
                  <circle cx="16" cy="11.5" r="1.5" fill={colors.blue} />
                </svg>
              </div>

              {/* Title */}
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: colors.blue }}>
                  Ai Guidance, Right When You Need It
                </h3>
                <p
                  className="text-sm md:text-base font-semibold mb-2"
                  style={{ color: colors.blue }}
                >
                  Meet Wilfred - Your on demand guide for smarter estate decisions
                </p>
              </div>
            </div>

            {/* Body */}
            <p
              className="text-base md:text-lg mb-4 text-left relative z-10"
              style={{ color: '#202020' }}
            >
              Wilfred doesn&apos;t just answer questions. He explains your options, flags common
              mistakes, and helps you make confident choices as you build your Will.
            </p>

            {/* CTA Button with shimmer */}
            <div className="flex justify-center mb-6 relative z-10">
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 50%, #FFBF00 100%)',
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 50px rgba(255, 191, 0, 0.8), 0 0 100px rgba(255, 191, 0, 0.5)',
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative z-10"
              >
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAIModal'));
                  }}
                  className="group relative inline-flex items-center gap-2 px-6 md:px-7 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all duration-300 w-full justify-center whitespace-nowrap overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #0A1E86 0%, #1a3a9e 50%, #0A1E86 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 0 25px rgba(255, 191, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Golden gradient overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,191,0,0.25) 0%, transparent 40%, rgba(255,191,0,0.2) 100%)',
                    }}
                  />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0 relative z-10"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="11.5" r="1.5" fill="#FFFFFF" />
                    <circle cx="12.5" cy="11.5" r="1.5" fill="#FFFFFF" />
                    <circle cx="16" cy="11.5" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <span className="whitespace-nowrap relative z-10 font-bold text-white">
                    Chat with Wilfred
                  </span>
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 relative z-10"
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
                </button>
              </motion.div>
            </div>

            {/* Benefit Badges */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 pt-4 relative z-10">
              <span className="text-sm md:text-base font-medium" style={{ color: colors.blue }}>
                No waiting.
              </span>
              <span className="text-sm md:text-base font-medium" style={{ color: colors.blue }}>
                No guessing.
              </span>
              <span className="text-sm md:text-base font-medium" style={{ color: colors.blue }}>
                No pressure.
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
