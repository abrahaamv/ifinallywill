/**
 * FeaturedOnSection — "As Featured On" with actual media logos
 * Pixel-perfect clone from source FeaturedOnSection.jsx
 */

const LOGOS = [
  { src: '/images/I%20Finally%20Will%20Design_img/source/f1.png', alt: 'Featured 1' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f2.png', alt: 'Featured 2' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f3.png', alt: 'Featured 3' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f4.png', alt: 'Featured 4' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f5.png', alt: 'Featured 5' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f6.png', alt: 'Featured 6' },
  { src: '/images/I%20Finally%20Will%20Design_img/source/f7.png', alt: 'Featured 7' },
];

export function FeaturedOnSection() {
  return (
    <section className="bg-white min-h-[30vh] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest uppercase text-gray-500">
            AS FEATURED ON
          </p>
          <div className="h-px w-56 bg-black/10 mx-auto mt-2" />
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {LOGOS.map((logo) => (
            <img
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              className="h-10 md:h-14 lg:h-16 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-200"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
