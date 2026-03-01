/**
 * InformationSection — 4 info cards (2x2 grid) with images
 * Pixel-perfect clone from source InformationSection.jsx + InfoCard.jsx
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const brandBlue = '#0A1E86';
const offwhite = '#F5F5F7';

interface InfoCardProps {
  title: string;
  description: string;
  image: { src: string; alt: string; containerClass?: string; imageClass?: string };
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

function InfoCard({ title, description, image, primaryCta, secondaryCta }: InfoCardProps) {
  return (
    <div className="relative rounded-2xl bg-white shadow-card hover:shadow-card-lg transition-shadow duration-300 overflow-hidden p-4 sm:p-5 md:p-6 h-full">
      <div className="flex flex-col h-full">
        {/* Text block */}
        <div className="flex flex-col flex-grow">
          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-[#111827] text-center">
            {title.includes('\n')
              ? title.split('\n').map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))
              : title}
          </h3>
          <p className="mt-1.5 sm:mt-2 text-gray-600 text-xs sm:text-sm leading-relaxed text-center">
            {description}
          </p>
          <div className="mt-auto pt-3 sm:pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {primaryCta && (
              <Link
                to={primaryCta.href}
                className="rounded-full min-w-[7.5rem] sm:min-w-[8rem] px-5 py-2 text-center text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                style={{ backgroundColor: brandBlue }}
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                to={secondaryCta.href}
                className="rounded-full min-w-[7.5rem] sm:min-w-[8rem] px-5 py-2 text-center text-sm font-semibold border-[1.5px] hover:bg-gray-50 transition-colors duration-200"
                style={{ color: brandBlue, borderColor: brandBlue }}
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>

        {/* Image area */}
        <div className="mt-3 sm:mt-4">
          <div
            className={`rounded-xl overflow-hidden ${image.containerClass || 'h-36 sm:h-48 md:h-56'}`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className={`w-full h-full object-contain ${image.imageClass || ''}`}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InformationSection() {
  return (
    <section
      className="py-8 sm:py-10 lg:py-12 min-h-[50vh] flex flex-col justify-center"
      style={{ backgroundColor: offwhite }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 min-h-[520px] sm:min-h-[560px] items-stretch"
          style={{ gridTemplateRows: '1fr 1fr' }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {/* Card 1: comparison */}
          <motion.div
            className="h-full min-h-0"
            variants={{
              hidden: { opacity: 0, y: 25 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <InfoCard
              title="iFinallyWill vs Competition"
              description="See how our guided process, provincial compliance and lifetime updates stack up against Competition."
              secondaryCta={{ label: 'Compare', href: '/compare' }}
              image={{
                src: '/images/Wilfred%20no1.jpeg',
                alt: 'Wilfred',
                containerClass: 'h-44 sm:h-48 md:h-52 flex items-center justify-center',
                imageClass: 'object-contain w-auto h-full max-w-full',
              }}
            />
          </motion.div>

          {/* Card 2: peace of mind */}
          <motion.div
            className="h-full min-h-0"
            variants={{
              hidden: { opacity: 0, y: 25 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <InfoCard
              title="Peace of mind under 20 mins"
              description="Finish your will today with clear, step-by-step guidance. No legal jargon just answers."
              primaryCta={{ label: 'Learn more', href: '/ai-guidance' }}
              image={{
                src: '/images/relax-couple-sofa-remove-background.png',
                alt: 'Family smiling',
                containerClass:
                  'h-44 sm:h-48 md:h-52 flex items-center justify-center overflow-hidden',
                imageClass: 'h-full w-[110%] object-contain',
              }}
            />
          </motion.div>

          {/* Card 3: difference between wills */}
          <motion.div
            className="h-full min-h-0"
            variants={{
              hidden: { opacity: 0, y: 25 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <InfoCard
              title={"What's the difference between a Will\nand a Secondary Will?"}
              description="A secondary will can help avoid probate for certain assets. Learn when it's useful and how to set it up."
              primaryCta={{
                label: 'Learn more',
                href: '/documents-showcase?expand=secondary-will',
              }}
              image={{
                src: '/images/I%20Finally%20Will%20Design_img/image_7_edit.png',
                alt: 'Couple reviewing documents',
                containerClass:
                  'h-44 sm:h-48 md:h-52 flex items-center justify-center overflow-hidden',
                imageClass: 'w-full h-full object-contain',
              }}
            />
          </motion.div>

          {/* Card 4: common mistakes */}
          <motion.div
            className="h-full min-h-0"
            variants={{
              hidden: { opacity: 0, y: 25 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <InfoCard
              title="Common mistakes to avoid"
              description="From missing witnesses to unclear executors learn the top mistakes that delay estates and how to prevent them."
              primaryCta={{ label: 'Learn more', href: '/how-it-works#common-mistakes' }}
              image={{
                src: '/images/I%20Finally%20Will%20Design_img/image%208.png',
                alt: 'Person reviewing papers',
                containerClass:
                  'h-44 sm:h-48 md:h-52 flex items-center justify-center overflow-hidden',
                imageClass: 'w-full h-full object-contain',
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
