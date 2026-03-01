/**
 * WelcomePage — full landing page with all sections
 * Pixel-perfect clone from source Welcome.jsx
 * Section order matches source exactly.
 */

import { AIAdvantageSection } from '../components/landing/AIAdvantageSection';
import { AIHelpSection } from '../components/landing/AIHelpSection';
import { CharitySupportSection } from '../components/landing/CharitySupportSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FeaturedOnSection } from '../components/landing/FeaturedOnSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HeroCarousel } from '../components/landing/HeroCarousel';
import { HowDifferentSection } from '../components/landing/HowDifferentSection';
import { HowToStartSection } from '../components/landing/HowToStartSection';
import { InformationSection } from '../components/landing/InformationSection';
import { PetSection } from '../components/landing/PetSection';
import { PricingSection } from '../components/landing/PricingSection';
import { ProbateSection } from '../components/landing/ProbateSection';

export function WelcomePage() {
  return (
    <div>
      <HeroCarousel />
      <AIAdvantageSection />
      <HowToStartSection />
      <FeaturesSection />
      <PricingSection />
      <InformationSection />
      <PetSection />
      <HowDifferentSection />
      <FeaturedOnSection />
      <ProbateSection />
      <AIHelpSection />
      <FaqSection />
      <CharitySupportSection />
    </div>
  );
}
