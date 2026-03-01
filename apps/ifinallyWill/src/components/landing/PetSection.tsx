/**
 * PetSection — Pet guardianship section with image + badge + dog-icon CTA
 * Pixel-perfect clone from source PetSection.jsx
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
};

export function PetSection() {
  return (
    <section className="py-20 min-h-[50vh]" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <motion.div
              className="rounded-2xl overflow-hidden shadow-xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src="/images/anika_hugs_dog.jpeg"
                alt="Child hugging a dog"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </motion.div>
          </motion.div>

          {/* Right side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2 text-center lg:text-left"
          >
            <motion.span
              className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4 mx-auto lg:mx-0 text-center"
              style={{ backgroundColor: colors.gold, color: colors.blue }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              PET GUARDIANSHIP
            </motion.span>
            <motion.h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-center lg:text-left"
              style={{ color: colors.navy }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Protect Your Pet in Your Will
            </motion.h2>
            <motion.p
              className="text-lg mb-6 leading-relaxed"
              style={{ color: colors.navy, opacity: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Your pet is family. Don&apos;t leave their future to chance. A pet guardianship plan
              ensures your furry friend is cared for if you pass away or become incapacitated with
              clear instructions for immediate care and long-term placement.
            </motion.p>
            <motion.p
              className="text-lg mb-8 leading-relaxed"
              style={{ color: colors.navy, opacity: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Learn how to choose a caregiver, set aside funds for your pet&apos;s care, and create
              a detailed care plan that gives your pet the stability they deserve.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative inline-block"
              >
                <Link
                  to="/pet-information-guardian"
                  className="inline-flex items-center pl-16 pr-8 py-4 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 relative z-10"
                  style={{ backgroundColor: colors.blue }}
                >
                  Learn More
                  <svg
                    className="w-5 h-5 ml-2"
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
                </Link>
                <img
                  src="/images/ifw_dog.png"
                  alt="IFW Dog"
                  className="absolute left-0 top-1/2 h-20 w-auto sm:h-24 sm:w-auto object-contain z-20"
                  style={{ transform: 'translateY(-50%)' }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
