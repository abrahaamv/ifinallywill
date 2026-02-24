/**
 * Public/landing page layout — navbar + footer
 * Navy + gold branding for marketing pages
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function LandingLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b px-6 py-4 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="font-bold text-xl" style={{ color: 'var(--ifw-primary-700)' }}>
            IFinallyWill
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[var(--ifw-neutral-600)] hover:text-[var(--ifw-primary-700)] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a href="/login" className="text-[var(--ifw-neutral-600)] hover:text-[var(--ifw-primary-700)]">
              Login
            </a>
            <a
              href="/register"
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--ifw-primary-700)' }}
            >
              Get Started
            </a>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t pt-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="block text-sm py-1">
                {link.label}
              </a>
            ))}
            <a href="/login" className="block text-sm py-1">Login</a>
            <a
              href="/register"
              className="block text-center px-5 py-2 rounded-lg text-sm font-medium text-white mt-2"
              style={{ backgroundColor: 'var(--ifw-primary-700)' }}
            >
              Get Started
            </a>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-[var(--ifw-neutral-50)]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="font-bold text-lg mb-3" style={{ color: 'var(--ifw-primary-700)' }}>
                IFinallyWill
              </div>
              <p className="text-sm text-[var(--ifw-text-muted)]">
                Making estate planning accessible to every Canadian.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <div className="space-y-2 text-sm text-[var(--ifw-text-muted)]">
                <a href="/how-it-works" className="block hover:text-[var(--ifw-primary-700)]">How It Works</a>
                <a href="/pricing" className="block hover:text-[var(--ifw-primary-700)]">Pricing</a>
                <a href="/about" className="block hover:text-[var(--ifw-primary-700)]">About</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <div className="space-y-2 text-sm text-[var(--ifw-text-muted)]">
                <a href="/privacy" className="block hover:text-[var(--ifw-primary-700)]">Privacy Policy</a>
                <a href="/terms" className="block hover:text-[var(--ifw-primary-700)]">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-xs text-[var(--ifw-text-muted)]">
            &copy; {new Date().getFullYear()} IFinallyWill. All rights reserved. Not a substitute for legal advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
