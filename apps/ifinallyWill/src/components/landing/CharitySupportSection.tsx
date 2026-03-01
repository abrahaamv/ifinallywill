/**
 * CharitySupportSection — "Giving Back Together" with SickKids + Princess Margaret logos
 * Pixel-perfect clone from source CharitySupportSection.jsx
 */

import { motion } from 'framer-motion';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
};

export function CharitySupportSection() {
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center w-full"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
            style={{ backgroundColor: colors.gold, color: colors.blue }}
          >
            Giving Back Together
          </span>

          <h3 className="text-xl font-semibold text-gray-700 mb-8">Proud Supporter Of</h3>

          {/* Logos */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16 w-full ml-8 md:ml-12 lg:ml-16">
            <motion.div
              className="opacity-90 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src="/images/sickkids-logo.png"
                alt="SickKids Foundation"
                className="h-12 md:h-16 lg:h-20 w-auto object-contain"
                loading="lazy"
              />
            </motion.div>

            <motion.div
              className="opacity-90 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src="/images/cancer-fundation-logo.png"
                alt="The Princess Margaret Cancer Foundation"
                className="h-20 md:h-28 lg:h-32 w-auto object-contain"
                loading="lazy"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
