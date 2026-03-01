/**
 * AIAdvantageSection — dark navy section with premium AI card + Wilfred mascot
 * Pixel-perfect clone from source AIAdvantage.jsx
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export function AIAdvantageSection() {
  return (
    <section
      id="ai-advantage"
      className="relative mt-0 pt-28 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24 overflow-hidden"
      style={{ backgroundColor: '#0C1F3C' }}
    >
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
              <span style={{ color: colors.gold }}>You Decide With Confidence</span>
            </h2>

            <p className="text-lg sm:text-xl text-white">(Not just fill out forms)</p>

            <div className="space-y-4 text-base sm:text-lg leading-relaxed">
              <p className="text-white">
                Other online providers generate documents. iFinallyWill guides decisions in real
                time while you&apos;re building.
              </p>
              <p className="text-white">
                This isn&apos;t a chatbot on the side. This is AI embedded directly into the estate
                planning process.
              </p>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/register"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: colors.gold, color: colors.blue }}
              >
                <span className="font-extrabold">Start For Free</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right - Premium AI Card */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Outer glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#FFBF00]/30 via-[#FFBF00]/10 to-[#FFBF00]/30 rounded-[2rem] blur-2xl" />

            {/* Main card with gold gradient border */}
            <div className="relative bg-gradient-to-br from-[#FFBF00] via-[#FFD54F] to-[#FFBF00] rounded-3xl p-1 shadow-2xl">
              <div className="bg-gradient-to-br from-[#2B2E4A] via-[#1F2937] to-[#0A1E86] rounded-[1.4rem] px-8 pt-20 pb-20 relative overflow-hidden">
                {/* Neural network background */}
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none">
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
                    <motion.line
                      x1="50"
                      y1="50"
                      x2="150"
                      y2="80"
                      stroke="#FFBF00"
                      strokeWidth="1"
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
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                    />
                  </svg>
                </div>

                {/* Floating Legal Expert AI badge */}
                <motion.div
                  className="absolute top-4 left-4 z-20"
                  animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                >
                  <div className="bg-gradient-to-br from-[#FFBF00] to-[#FFD54F] rounded-2xl px-4 py-3 shadow-xl border-2 border-white/20 flex items-center gap-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="#0A1E86" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    <span className="text-base sm:text-lg font-bold text-[#0A1E86]">
                      Legal Expert AI
                    </span>
                  </div>
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
                    We are the only ones with an AI assistant (Wilfred) to help guide you every step
                    of the way.
                  </h3>

                  {/* Bottom stats */}
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
  );
}
