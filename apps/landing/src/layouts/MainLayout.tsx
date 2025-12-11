/**
 * Main Layout - Premium Dark Theme
 * Matches the professional design system
 */

import { Button } from '@platform/ui';
import { Github, Linkedin, Mail, Menu, Phone, Sparkles, Twitter, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { appUrls } from '../config/urls';
import { DemoWidget } from '../components/DemoWidget';
import { useComingSoon } from '../context/ComingSoonContext';

// Private Beta Banner Component
function PrivateBetaBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          <span className="text-[13px] font-medium text-white">
            <span className="hidden sm:inline">Currently in </span>Private Beta
          </span>
        </div>
        <span className="text-white/60">—</span>
        <span className="text-[13px] text-white/90">
          Launching Q1 2025
        </span>
        <Link
          to="/contact"
          className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[12px] font-medium text-white transition-colors"
        >
          <Mail className="w-3 h-3" />
          Partnership Inquiries
        </Link>
      </div>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MainLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { openModal } = useComingSoon();

  // Banner height for positioning (approx 40px)
  const bannerOffset = bannerDismissed ? '0px' : '40px';

  // Detect scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const navigationLinks = [
    { path: '/', label: 'Home' },
    { path: '/features', label: 'Features' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#08080a]">
      {/* Private Beta Banner */}
      {!bannerDismissed && <PrivateBetaBanner onDismiss={() => setBannerDismissed(true)} />}

      {/* Spacer for fixed banner */}
      {!bannerDismissed && <div className="h-[40px]" />}

      {/* Header */}
      <header
        className={`fixed left-0 right-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
        style={{ top: bannerOffset }}
      >
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[17px] font-semibold text-white tracking-[-0.01em]">
              VisualKit
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-[13px] h-9 px-4"
              asChild
            >
              <a href={`${appUrls.meeting}/sales-demo`}>
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                Talk to AI
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/[0.04] text-[13px] h-9 px-4"
              onClick={openModal}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              className="bg-white text-[#08080a] hover:bg-white/90 text-[13px] h-9 px-4 font-semibold rounded-xl"
              onClick={openModal}
            >
              Start Free
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#08080a]/95 backdrop-blur-xl">
            <nav className="max-w-6xl mx-auto px-4 py-4 space-y-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-4 py-3 text-[14px] font-medium rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'text-white bg-white/[0.08]'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-4 border-t border-white/[0.06]">
                <Button
                  variant="outline"
                  className="w-full justify-center border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05]"
                  onClick={openModal}
                >
                  Sign In
                </Button>
                <Button
                  className="w-full justify-center bg-white text-[#08080a] hover:bg-white/90"
                  onClick={openModal}
                >
                  Start Free
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Demo Widget - Floating Chat */}
      <DemoWidget
        onLeadCapture={(email, name) => {
          console.log('Lead captured:', { email, name });
          // TODO: Send to backend API
        }}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#08080a]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
            {/* Company Info - Takes 2 columns */}
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-[17px] font-semibold text-white tracking-[-0.01em]">
                  VisualKit
                </span>
              </Link>
              <p className="text-white/40 text-[14px] leading-relaxed mb-6 max-w-[280px]">
                The only AI that can see your customers' screens.
                Voice, vision, and text — unified.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                <a
                  href="https://twitter.com/visualkit"
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/visualkit"
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com/company/visualkit"
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-[12px] font-semibold mb-4 text-white/70 uppercase tracking-wider">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/features" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button
                    onClick={openModal}
                    className="text-[14px] text-white/40 hover:text-white transition-colors"
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <Link to="/security" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="text-[12px] font-semibold mb-4 text-white/70 uppercase tracking-wider">
                Developers
              </h4>
              <ul className="space-y-3">
                <li>
                  <a href="/docs" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/docs/api" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="https://github.com/visualkit" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="/status" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-[12px] font-semibold mb-4 text-white/70 uppercase tracking-wider">
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <a href="https://blog.visualkit.live" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="https://careers.visualkit.live" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-[12px] font-semibold mb-4 text-white/70 uppercase tracking-wider">
                Legal
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/privacy" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    Cookies
                  </Link>
                </li>
                <li>
                  <Link to="/gdpr" className="text-[14px] text-white/40 hover:text-white transition-colors">
                    GDPR
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-[13px]">
              &copy; {new Date().getFullYear()} VisualKit. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-[13px] text-white/30">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
