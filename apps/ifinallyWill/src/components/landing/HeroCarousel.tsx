/**
 * HeroCarousel — 3-slide auto-advancing carousel
 * Gold background, split layout with text left + image right
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Slide {
  title: string;
  subtitle: string;
  note?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image: { src: string; alt: string };
}

const SLIDES: Slide[] = [
  {
    title: "Your family's future\nsecured in minutes",
    subtitle:
      'Get peace of mind knowing your family is protected with a legally valid will in under 20 minutes',
    note: "Only pay when you're ready",
    primaryCta: { label: 'Start Free Now', href: '/register' },
    secondaryCta: { label: 'Learn How', href: '/how-it-works' },
    image: {
      src: '/images/I%20Finally%20Will%20Design_img/image%201.png',
      alt: 'Family using laptop together',
    },
  },
  {
    title: '60-Day Money-Back\nGuarantee',
    subtitle:
      'If you purchase any iFinallyWill plan and decide not to complete your will, you can cancel within 60 days and receive a full refund — no questions asked.',
    note: "Only pay when you're ready",
    primaryCta: { label: 'Start Free Now', href: '/register' },
    secondaryCta: { label: 'Learn How', href: '/how-it-works' },
    image: { src: '/images/hero-money-back.png', alt: 'Money back guarantee' },
  },
  {
    title: 'Not all wills are\ncreated equal',
    subtitle: 'Ours are based on decades of legal experience',
    note: "Only pay when you're ready",
    primaryCta: { label: 'Start Free Now', href: '/register' },
    secondaryCta: { label: 'Learn How', href: '/how-it-works' },
    image: { src: '/images/couple_3_banner.png', alt: 'Confident couple' },
  },
];

const INTERVAL_MS = 7000;

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next]);

  const slide = SLIDES[currentIndex];
  if (!slide) return null;

  return (
    <section className="relative overflow-hidden bg-brand-gold">
      <div className="mx-auto flex min-h-[500px] max-w-7xl flex-col items-center gap-8 px-4 py-16 md:flex-row md:py-20 lg:gap-12 lg:px-8">
        {/* Text */}
        <div className="flex-1 text-left">
          <h1 className="whitespace-pre-line text-4xl font-extrabold leading-tight text-brand-navy md:text-5xl lg:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-brand-navy/80">
            {slide.subtitle}
          </p>
          {slide.note && (
            <p className="mt-3 text-sm font-medium text-brand-navy/60">{slide.note}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={slide.primaryCta.href}
              className="rounded-full bg-brand-blue px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-brand-navy hover:shadow-xl"
            >
              {slide.primaryCta.label}
            </Link>
            {slide.secondaryCta && (
              <Link
                to={slide.secondaryCta.href}
                className="rounded-full border-2 border-brand-navy px-8 py-3.5 text-base font-semibold text-brand-navy transition-all hover:bg-brand-navy hover:text-white"
              >
                {slide.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="flex-1">
          <img
            src={slide.image.src}
            alt={slide.image.alt}
            className="mx-auto max-h-[400px] w-full object-contain"
          />
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`h-2.5 rounded-full transition-all ${
              i === currentIndex ? 'w-8 bg-brand-blue' : 'w-2.5 bg-brand-navy/30'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
