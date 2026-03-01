/**
 * FeaturesSection — 3 large alternating cards (Security/Simplicity/Compliance) with images
 * Pixel-perfect clone from source FeaturesSection.jsx
 */

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const colors = {
  gold: '#FFBF00',
  grayText: '#D6DAE1',
};

interface FeatureData {
  id: number;
  title: string;
  description: string;
  cta: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  variant: 'blue' | 'white' | 'gold';
}

const FEATURES_DATA: FeatureData[] = [
  {
    id: 1,
    title: 'One-time payment,\na lifetime of\npeace of mind',
    description:
      "Finish confidently with a step-by-step flow that's compliant with provincial rules and easy to follow.",
    cta: 'Learn more',
    ctaHref: '/how-it-works#steps-to-create-a-will',
    image: '/images/girl and dog.jpeg',
    imageAlt: 'Child with dog',
    variant: 'blue',
  },
  {
    id: 2,
    title: 'No legal jargon,\njust clear answers',
    description:
      'Our guided process walks you through every decision in plain language. Most people finish in under 20 minutes.',
    cta: 'Start For Free',
    ctaHref: '/register',
    image: '/images/couple_thinking%20of%20wilfred.png',
    imageAlt: 'Couple with laptop and Wilfred',
    variant: 'white',
  },
  {
    id: 3,
    title: 'Simple, affordable and stress free',
    description:
      "Most people put this off because it feels overwhelming. We've made it simple and you're guided from start to finish.",
    cta: 'See Pricing',
    ctaHref: '#pricing',
    image: '/images/girl_sleeping.jpeg',
    imageAlt: 'Woman with laptop, child sleeping peacefully',
    variant: 'gold',
  },
];

const bgStyles = {
  blue: {
    container: 'bg-[#0A1E86]',
    text: 'text-white',
    textMuted: 'text-white/70',
    cta: 'border-white/50 text-white hover:bg-white/10',
  },
  white: {
    container: 'bg-white',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    cta: 'border-[#0A1E86] text-[#0A1E86] hover:bg-[#0A1E86]/5',
  },
  gold: {
    container: 'bg-gradient-to-br from-[#FFBF00] to-[#F5A800]',
    text: 'text-[#0A1E86]',
    textMuted: 'text-[#0A1E86]/70',
    cta: 'border-[#0A1E86] text-[#0A1E86] hover:bg-[#0A1E86]/10',
  },
};

function FeatureCard({
  feature,
  index,
  isReversed,
}: {
  feature: FeatureData;
  index: number;
  isReversed: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const style = bgStyles[feature.variant];

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.1 }}
    >
      <div className={`rounded-[28px] ${style.container} shadow-card-xl overflow-hidden`}>
        <div
          className={`grid lg:grid-cols-2 items-stretch ${isReversed ? 'lg:grid-flow-dense' : ''}`}
        >
          {/* Text Content */}
          <div
            className={`flex flex-col justify-center p-8 md:p-12 lg:p-16 ${
              feature.id === 2 || feature.id === 3 ? 'lg:py-20 lg:px-16' : ''
            } ${isReversed ? 'lg:col-start-2' : ''}`}
          >
            <div className={feature.id === 2 || feature.id === 3 ? 'max-w-2xl' : ''}>
              <motion.h3
                className={`font-extrabold whitespace-pre-line leading-tight tracking-tight ${style.text}`}
                style={{
                  fontSize:
                    feature.id === 2 || feature.id === 3
                      ? 'clamp(34px, 5vw, 52px)'
                      : 'clamp(30px, 4.25vw, 48px)',
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {feature.title}
              </motion.h3>
              <motion.p
                className={`mt-5 text-base leading-relaxed ${
                  feature.id === 2 || feature.id === 3 ? 'mt-6 text-lg' : ''
                } ${feature.id === 3 ? 'text-[#0A1E86]' : style.textMuted}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {feature.description}
              </motion.p>
              <motion.a
                href={feature.ctaHref}
                className={`${
                  feature.id === 2 || feature.id === 3 ? 'mt-8' : 'mt-6'
                } inline-block rounded-full border-[1.5px] px-6 py-3 text-sm font-semibold transition-colors duration-200 ${style.cta}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {feature.cta}
              </motion.a>
            </div>
          </div>

          {/* Image Section */}
          <div
            className={`relative ${
              feature.id === 3
                ? 'h-[400px] md:h-[550px] lg:h-full lg:min-h-[600px]'
                : 'h-[350px] md:h-[450px] lg:h-full lg:min-h-[500px]'
            } ${isReversed ? 'lg:col-start-1 lg:row-start-1' : ''} overflow-hidden ${
              feature.id === 3 ? 'lg:-ml-6' : ''
            }`}
          >
            <motion.div
              className={`absolute inset-0 ${feature.id === 2 ? 'bg-white' : ''}`}
              style={{ y: imageY }}
            >
              {feature.id === 3 ? (
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  className="w-full h-full object-contain object-center"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  className={`w-full h-full ${
                    feature.id === 2 ? 'object-cover object-[65%_50%]' : 'object-cover'
                  }`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              {feature.variant === 'gold' && feature.id === 3 && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFBF00]/30 via-transparent to-transparent pointer-events-none" />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden">
      {/* Deep gradient background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="h-full w-full"
          style={{
            background:
              'linear-gradient(180deg, #0C1F3C 0%, #14417B 30%, #0C1F3C 70%, #081428 100%)',
          }}
        />
      </div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 z-10" aria-hidden="true">
        <div className="relative">
          <div className="h-24 w-3 bg-[#FFBF00] rounded-bl-sm" />
          <div className="absolute top-0 right-0 h-3 w-24 bg-[#FFBF00] rounded-bl-sm" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        {/* Section header */}
        <motion.div
          className="relative mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center">
            <motion.p
              className="font-bold tracking-[0.2em] uppercase"
              style={{ color: colors.gold, fontSize: 'clamp(24px, 3vw, 42px)' }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              WHY CHOOSE US
            </motion.p>
            <motion.p
              className="mt-4 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed"
              style={{ color: colors.grayText }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Our guided experience highlights what matters: clarity, compliance and a fast path to
              completion without the legal jargon.
            </motion.p>
          </div>
        </motion.div>

        {/* Feature cards */}
        <div className="space-y-12 lg:space-y-20">
          {FEATURES_DATA.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              index={index}
              isReversed={index % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
