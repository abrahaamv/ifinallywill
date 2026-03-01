import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  offwhite: '#F5F5F7',
};

export function PetInformationGuardianPage() {
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ctaCardRef,
    offset: ['start end', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 overflow-hidden"
        style={{ backgroundColor: colors.navy }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-white mb-4 sm:mb-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <span
                  className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold"
                  style={{ color: colors.gold }}
                >
                  Pet Guardianship
                </span>
                <span className="block text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mt-2">
                  a real plan for your pet not just good intentions
                </span>
              </motion.h1>
              <motion.p
                className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 sm:mb-6 md:mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                We love pets. And we&apos;re going to say the quiet part out loud: if you don&apos;t
                put a plan in writing, your executor will be forced to improvise while your pet
                waits.
              </motion.p>
              <motion.p
                className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 sm:mb-6 md:mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                This guide gives you a simple, low-drama framework so your dog, cat, or other furry
                roommate is looked after:
              </motion.p>
              <motion.ul
                className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 space-y-2 list-disc list-inside"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                >
                  immediately (the first 24–72 hours)
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                >
                  long-term (the months and years after)
                </motion.li>
              </motion.ul>
              <motion.div
                className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 text-center"
                    style={{ backgroundColor: colors.gold, color: colors.blue }}
                  >
                    Start For Free
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
              className="relative mt-8 lg:mt-0"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                className="rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <img
                  src="/images/anika_hugs_dog.jpeg"
                  alt="Child hugging a dog"
                  className="w-full h-auto object-cover"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="fill-white">
            <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Section 1: What pet guardianship actually means */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: 'white' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              What pet guardianship actually means
            </motion.h2>
            <motion.p
              className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4"
              style={{ color: colors.navy, opacity: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Pet guardianship is simply naming who should take care of your pet if you can&apos;t.
            </motion.p>
            <motion.p
              className="text-base sm:text-lg md:text-xl"
              style={{ color: colors.navy, opacity: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Important nuance: You&apos;re not &quot;appointing a legal guardian&quot; the way you
              would for a child. You&apos;re creating clear written direction so your executor and
              loved ones aren&apos;t guessing under pressure.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Section 2: The 2-speed plan */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: colors.blue }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6 text-white">
              The 2-speed plan: immediate care vs long-term care
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 text-white/90">
              Most people only plan for death. That&apos;s half the risk.
            </p>
            <p className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 text-white/90">
              You need two layers:
            </p>
            <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
              <motion.div
                className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-white/95"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3
                  className="text-lg sm:text-xl font-bold mb-2 sm:mb-3"
                  style={{ color: colors.blue }}
                >
                  Immediate care (today / tomorrow):
                </h3>
                <p className="text-base sm:text-lg" style={{ color: colors.navy, opacity: 0.9 }}>
                  Who helps your pet in the first 24–72 hours?
                </p>
              </motion.div>
              <motion.div
                className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-white/95"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h3
                  className="text-lg sm:text-xl font-bold mb-2 sm:mb-3"
                  style={{ color: colors.blue }}
                >
                  Long-term care (the real hand-off):
                </h3>
                <p className="text-base sm:text-lg" style={{ color: colors.navy, opacity: 0.9 }}>
                  Who becomes the caregiver going forward?
                </p>
              </motion.div>
            </div>
            <p className="text-base sm:text-lg md:text-xl font-semibold mb-2 text-white">
              Why this matters:
            </p>
            <p className="text-base sm:text-lg md:text-xl text-white/90">
              Estate administration takes time. Your pet needs food, medication, and stability now,
              not after paperwork clears.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 3: Step 1 - Choose a pet caregiver */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: colors.offwhite }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              Step 1: Choose a pet caregiver (and a backup)
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              This is a people decision, not a paperwork decision.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Choose:
            </p>
            <ul
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 space-y-2 list-disc list-inside"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              <li>Primary caregiver (first choice)</li>
              <li>Backup caregiver (because life happens)</li>
            </ul>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-white mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3
                className="text-lg sm:text-xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.blue }}
              >
                Caregiver checklist (use this):
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {[
                  'They\'ve clearly agreed (you need a "yes," not a "maybe")',
                  'Lifestyle fit (time, travel, energy level)',
                  'Housing reality (pets allowed, space, landlord rules)',
                  'Kids/other pets: good match or stress factory?',
                  "They can handle your pet's needs (meds, behaviour, special diet)",
                  'They already know your pet (reduces transition shock)',
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-start gap-2 sm:gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                  >
                    <span
                      className="text-lg sm:text-xl mt-1 flex-shrink-0"
                      style={{ color: colors.gold }}
                    >
                      &#9744;
                    </span>
                    <span
                      className="text-sm sm:text-base md:text-lg"
                      style={{ color: colors.navy, opacity: 0.9 }}
                    >
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl border-2"
              style={{ borderColor: colors.gold, backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-base sm:text-lg font-semibold" style={{ color: colors.navy }}>
                Blunt but true:
              </p>
              <p className="text-base sm:text-lg mt-2" style={{ color: colors.navy, opacity: 0.9 }}>
                If you haven&apos;t had the conversation, you don&apos;t have a plan. You have a
                hope.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Step 2 - Make sure your caregiver isn't stuck with the bill */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              Step 2: Make sure your caregiver isn&apos;t stuck with the bill
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Love is free. Vet bills are not.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              The cleanest approach for most people:
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 font-semibold"
              style={{ color: colors.blue }}
            >
              Leave a cash gift to the caregiver to offset ongoing costs.
            </p>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl mb-4 sm:mb-6"
              style={{ backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3
                className="text-lg sm:text-xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.blue }}
              >
                Quick way to estimate support:
              </h3>
              <ul
                className="space-y-2 list-disc list-inside text-sm sm:text-base"
                style={{ color: colors.navy, opacity: 0.9 }}
              >
                {[
                  'Monthly food + basics',
                  'Annual vet checkups/vaccines',
                  'Medications or special diets (if applicable)',
                  'Grooming/boarding/walker (if used)',
                  'The "aging curve" (costs typically increase over time)',
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl border-2"
              style={{ borderColor: colors.gold, backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-base sm:text-lg font-semibold" style={{ color: colors.navy }}>
                Tell-it-like-it-is:
              </p>
              <p className="text-base sm:text-lg mt-2" style={{ color: colors.navy, opacity: 0.9 }}>
                If you leave your pet with no support, you create friction. Friction is how plans
                fail.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 5: Step 3 - Create a Pet Care Playbook */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: colors.offwhite }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              Step 3: Create a &quot;Pet Care Playbook&quot; (so routines don&apos;t collapse)
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              This is the part your pet will feel the most.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              A Pet Care Playbook is a simple 1–2 page document you keep with your estate documents
              (and share with your caregiver). It&apos;s not legalese. It&apos;s operational
              continuity.
            </p>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-white mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3
                className="text-lg sm:text-xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.blue }}
              >
                Include:
              </h3>
              <ul
                className="space-y-2 list-disc list-inside text-sm sm:text-base"
                style={{ color: colors.navy, opacity: 0.9 }}
              >
                {[
                  'Feeding schedule + brand + portions',
                  'Medications (dose, timing, pharmacy)',
                  'Vet name + clinic + phone number',
                  'Microchip/tattoo info + registry details',
                  'Insurance details (if any)',
                  'Behaviour notes (anxieties, triggers, reactivity  be honest)',
                  'Comfort items (bed, toys, crate, carrier)',
                  'Routine essentials (walk cadence, litter type, etc.)',
                  'Emergency contact who knows your pet well',
                  'Optional (high value): "Pet Kit" location note',
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.08 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="p-3 sm:p-4 rounded-lg bg-white border-l-4 mb-4 sm:mb-6"
              style={{ borderColor: colors.gold }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p
                className="text-sm sm:text-base italic"
                style={{ color: colors.navy, opacity: 0.9 }}
              >
                &quot;Leash is here. Carrier is here. Meds are here.&quot;
              </p>
            </motion.div>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl border-2"
              style={{ borderColor: colors.gold, backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <p className="text-base sm:text-lg font-semibold" style={{ color: colors.navy }}>
                Mini callout:
              </p>
              <p className="text-base sm:text-lg mt-2" style={{ color: colors.navy, opacity: 0.9 }}>
                If your caregiver can&apos;t replicate the routine, your pet pays the price.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 6: Step 4 - Cover incapacity too */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              Step 4: Cover incapacity too (this is where most plans fail)
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              If you&apos;re alive but incapacitated, your will doesn&apos;t activate.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              So if your pet plan only exists in your will, you&apos;ve left a major gap.
            </p>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl mb-4 sm:mb-6"
              style={{ backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3
                className="text-lg sm:text-xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.blue }}
              >
                What closes the gap:
              </h3>
              <ul
                className="space-y-2 sm:space-y-3 list-disc list-inside text-sm sm:text-base"
                style={{ color: colors.navy, opacity: 0.9 }}
              >
                <li>Power of Attorney for Health (who can make health decisions)</li>
                <li>Power of Attorney for Property (who can manage finances/paperwork)</li>
              </ul>
            </motion.div>
            <p
              className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Why pet owners should care:
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Because your pet&apos;s care runs through your finances and day-to-day decisions.
              Someone needs authority to act and pay for care.
            </p>
            {/* Recommendation Box */}
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl border-2"
              style={{ borderColor: colors.blue, backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <p className="text-base sm:text-lg font-semibold mb-2" style={{ color: colors.blue }}>
                iFW recommendation:
              </p>
              <p className="text-base sm:text-lg" style={{ color: colors.navy, opacity: 0.9 }}>
                If you have a pet, the &quot;Will + Power of Attorney for Health + Power of Attorney
                for Property&quot; package is typically the right baseline. It covers the full
                decision chain: life + death.
              </p>
            </motion.div>
            <motion.div
              className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 text-center"
                  style={{ backgroundColor: colors.gold, color: 'white' }}
                >
                  Start For Free
                </Link>
              </motion.div>
              {/* Animated Wilfred Image - Right Side of Button */}
              <motion.div
                className="flex-shrink-0 hidden sm:block"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.img
                  src="/images/wilfred_dog_collar.png"
                  alt="Wilfred - AI Assistant with Dog"
                  className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain"
                  animate={{
                    rotate: [0, 5, -5, 0],
                    y: [0, -5, 0],
                  }}
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
                  style={{
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 7: No obvious caregiver */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: colors.offwhite }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              No obvious caregiver? A Plan B that still protects your pet!
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              If you don&apos;t have a reliable person, you still have options &ndash; but they
              require upfront work.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Some humane societies or rescue organizations offer stewardship-style programs where
              the organization may help place your pet with a suitable caregiver (sometimes with
              monitoring).
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4 font-semibold"
              style={{ color: colors.navy }}
            >
              Before you rely on any program, pressure-test it:
            </p>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl bg-white mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <ul className="space-y-2 sm:space-y-3">
                {[
                  'Do they require a signed agreement outside your will?',
                  'Is there an enrollment fee or funding requirement?',
                  'What are their placement timelines?',
                  'What are their medical care and end-of-life policies?',
                  'Do they foster-place or shelter-place?',
                  "What happens if the placement doesn't work?",
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-start gap-2 sm:gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                  >
                    <span
                      className="text-lg sm:text-xl mt-1 flex-shrink-0"
                      style={{ color: colors.gold }}
                    >
                      &#9744;
                    </span>
                    <span
                      className="text-sm sm:text-base md:text-lg"
                      style={{ color: colors.navy, opacity: 0.9 }}
                    >
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="p-4 sm:p-6 rounded-lg sm:rounded-xl border-2"
              style={{ borderColor: colors.gold, backgroundColor: colors.offwhite }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-base sm:text-lg font-semibold" style={{ color: colors.navy }}>
                Bottom line:
              </p>
              <p className="text-base sm:text-lg mt-2" style={{ color: colors.navy, opacity: 0.9 }}>
                This can be a viable Plan B &ndash; but only if you understand the terms upfront.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 8: What happens if you do nothing */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 sm:mb-6"
              style={{ color: colors.navy }}
            >
              What happens if you do nothing...
            </h2>
            <p
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              Your pet doesn&apos;t disappear. The decision just gets outsourced.
            </p>
            <p
              className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              If your documents don&apos;t address your pet clearly:
            </p>
            <ul
              className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 list-disc list-inside text-base sm:text-lg md:text-xl"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              {[
                'your pet can be handled like other property in the estate',
                'your executor may end up making the call under pressure',
                'your pet may bounce between temporary care situations',
              ].map((item, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                >
                  {item}
                </motion.li>
              ))}
            </ul>
            <p
              className="text-base sm:text-lg md:text-xl"
              style={{ color: colors.navy, opacity: 0.9 }}
            >
              That&apos;s not a moral failure. It&apos;s just what happens when there&apos;s no
              operating plan.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Block - WHY CHOOSE US style with image */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div
            ref={ctaCardRef}
            className="relative rounded-[28px] bg-[#0A1E86] shadow-card-xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid lg:grid-cols-2 items-center">
              {/* Text Content - Left */}
              <div className="p-8 md:p-12 lg:p-16">
                <motion.h2
                  className="font-bold whitespace-pre-line leading-[1.1] text-white"
                  style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Your pet is counting on you. Make the plan execution-ready.
                </motion.h2>
                <motion.p
                  className="mt-5 text-base leading-relaxed text-white/70"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Get your will and pet care instructions done in one guided, province-specific
                  flow.
                </motion.p>
              </div>

              {/* Image - Right (girl and dog.jpeg) */}
              <div className="relative h-[350px] md:h-[450px] lg:h-full lg:min-h-[500px]">
                <motion.div className="absolute inset-0" style={{ y: imageY }}>
                  <img
                    src="/images/girl and dog.jpeg"
                    alt="Child with dog"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
