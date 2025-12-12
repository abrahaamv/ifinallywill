/**
 * Landing Page App
 * Public marketing site for AI Assistant Platform
 * Features: Hero, features, pricing, testimonials, CTA
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ComingSoonProvider } from './context/ComingSoonContext';
import { MainLayout } from './layouts/MainLayout';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HomePage } from './pages/HomePage';
import { PricingPage } from './pages/PricingPage';

export function App() {
  return (
    <BrowserRouter>
      <ComingSoonProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>
        </Routes>
      </ComingSoonProvider>
    </BrowserRouter>
  );
}
