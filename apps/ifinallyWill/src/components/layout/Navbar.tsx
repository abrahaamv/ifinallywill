/**
 * UnifiedNavbar — gold (#FFBF00) fixed header
 * Ported from source UnifiedNavbar.tsx
 * Gold background, blue (#0A1E86) brand text, Resources dropdown,
 * responsive mobile menu, smooth-scroll pricing support.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
} as const;

function getSmartCTAPath(isAuthenticated: boolean): string {
  return isAuthenticated ? '/app/dashboard' : '/register?start=1';
}

export interface NavbarProps {
  isHomePage?: boolean;
}

export function Navbar({ isHomePage = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  const smartCTAPath = useMemo(() => getSmartCTAPath(isAuthenticated), [isAuthenticated]);

  const handleSmoothScroll = (e: React.MouseEvent, targetId: string): void => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 80;
      requestAnimationFrame(() => {
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      });
    }
    setMobileMenuOpen(false);
  };

  // Track hash for active state on pricing
  useEffect(() => {
    setCurrentHash(window.location.hash);
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top
        ? Number.parseInt(document.body.style.top || '0', 10) * -1
        : 0;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, scrollY);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string): boolean => {
    const currentPath = location.pathname;
    if (path === '/') return currentPath === '/' || currentPath === '';
    if (path === '#pricing') return currentHash === '#pricing';
    if (path.startsWith('/')) return currentPath === path;
    return currentPath.startsWith(path);
  };

  const isResourcesActive = (): boolean =>
    isActive('/help-centre') || isActive('/compare') || isActive('/about') || isActive('/contact');

  const handlePricingClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (isHomePage) {
      handleSmoothScroll(e, 'pricing');
    } else {
      navigate('/#pricing');
      setTimeout(() => {
        const element = document.getElementById('pricing');
        if (element) {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - 80;
          requestAnimationFrame(() => {
            window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
          });
        }
      }, 300);
    }
    setMobileMenuOpen(false);
  };

  const getLinkStyle = (path: string) => ({
    color: isActive(path) ? colors.blue : 'inherit',
    borderBottom: isActive(path) ? `2px solid ${colors.blue}` : '2px solid transparent',
    paddingBottom: '4px',
  });

  const getMobileLinkStyle = (path: string) => ({
    color: isActive(path) ? colors.blue : 'inherit',
    borderLeft: isActive(path) ? `3px solid ${colors.blue}` : '3px solid transparent',
    paddingLeft: '12px',
  });

  const RESOURCE_LINKS = [
    { to: '/help-centre', label: 'FAQ' },
    { to: '/compare', label: 'Compare' },
    { to: '/about', label: 'About Us' },
    { to: '/for-charities', label: 'For Charities' },
    { to: '/contact', label: 'Contact Us' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 w-full border-b border-black/5 z-50"
      style={{ backgroundColor: colors.gold }}
    >
      <div className="relative w-full h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo + tagline */}
        <Link to="/" className="flex flex-col">
          <span
            className="font-bold"
            style={{
              color: colors.blue,
              fontSize: '28px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              lineHeight: '1.2',
            }}
          >
            iFinallyWill
          </span>
          <span
            className="text-xs sm:text-sm font-medium"
            style={{ color: colors.blue, lineHeight: '1.2', marginTop: '2px' }}
          >
            Finally. A Smarter Will.
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden xl:flex items-center flex-wrap gap-3 sm:gap-4 lg:gap-5 text-black"
          style={{ fontSize: 'clamp(0.8rem, 1.2vw + 0.5rem, 1rem)' }}
        >
          {/* AI Guidance */}
          <Link
            to="/ai-guidance"
            className={`flex items-center gap-2 transition-all duration-200 cursor-pointer ${
              isActive('/ai-guidance') ? 'font-bold' : 'hover:opacity-70'
            }`}
            style={getLinkStyle('/ai-guidance')}
          >
            AI Guidance
            <motion.img
              src="/images/wilfred.png"
              alt="Wilfred"
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain flex-shrink-0"
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            />
          </Link>

          {/* How It Works */}
          <Link
            to="/how-it-works"
            className={`transition-all duration-200 cursor-pointer whitespace-nowrap ${
              isActive('/how-it-works') ? 'font-bold' : 'hover:opacity-70'
            }`}
            style={getLinkStyle('/how-it-works')}
          >
            How It Works
          </Link>

          {/* Pricing */}
          <a
            href={isHomePage ? '#pricing' : '/#pricing'}
            onClick={handlePricingClick}
            className={`transition-all duration-200 cursor-pointer whitespace-nowrap ${
              isActive('#pricing') ? 'font-bold' : 'hover:opacity-70'
            }`}
            style={getLinkStyle('#pricing')}
          >
            Pricing
          </a>

          {/* Resources Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setResourcesDropdownOpen(true)}
            onMouseLeave={() => setResourcesDropdownOpen(false)}
          >
            <button
              type="button"
              className={`transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                isResourcesActive() ? 'font-bold' : 'hover:opacity-70'
              }`}
              style={{
                color: isResourcesActive() ? colors.blue : '#000000',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
              onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
            >
              Resources
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  resourcesDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {resourcesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                >
                  {RESOURCE_LINKS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setResourcesDropdownOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(item.to) ? 'font-semibold bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      style={{ color: isActive(item.to) ? colors.blue : 'inherit' }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Login */}
          <Link
            to="/login"
            className={`transition-all duration-200 cursor-pointer ${
              isActive('/login') ? 'font-bold' : 'hover:opacity-70'
            }`}
            style={getLinkStyle('/login')}
          >
            Login
          </Link>
        </nav>

        {/* Right side buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* AI trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('openAIModal'))}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            aria-label="Open Wilfred AI assistant"
          >
            <Sparkles className="w-4 h-4" style={{ color: '#7c3aed' }} />
          </button>

          {/* Desktop CTA */}
          <Link
            to={smartCTAPath}
            className="hidden xl:block px-6 py-3 rounded-full text-white font-bold"
            style={{ backgroundColor: colors.blue }}
          >
            Start for Free
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="xl:hidden p-2 text-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden fixed left-0 right-0 top-20 bottom-0 z-40 bg-white shadow-xl border-t border-black/10"
            style={{
              height: 'calc(100dvh - 80px)',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              <nav className="px-4 py-4 pb-8 space-y-2">
                {/* AI Guidance */}
                <Link
                  to="/ai-guidance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 transition-all duration-200 ${
                    isActive('/ai-guidance') ? 'font-bold' : 'hover:opacity-70'
                  }`}
                  style={getMobileLinkStyle('/ai-guidance')}
                >
                  AI Guidance
                </Link>

                {/* How It Works */}
                <Link
                  to="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 transition-all duration-200 ${
                    isActive('/how-it-works') ? 'font-bold' : 'hover:opacity-70'
                  }`}
                  style={getMobileLinkStyle('/how-it-works')}
                >
                  How It Works
                </Link>

                {/* Pricing */}
                <a
                  href={isHomePage ? '#pricing' : '/#pricing'}
                  onClick={handlePricingClick}
                  className={`block py-2 transition-all duration-200 ${
                    isActive('#pricing') ? 'font-bold' : 'hover:opacity-70'
                  }`}
                  style={getMobileLinkStyle('#pricing')}
                >
                  Pricing
                </a>

                {/* Resources dropdown (mobile) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
                    className={`flex items-center justify-between w-full py-2 text-left transition-all duration-200 ${
                      isResourcesActive() ? 'font-bold' : 'hover:opacity-70'
                    }`}
                    style={{
                      color: isResourcesActive() ? colors.blue : '#000000',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      paddingLeft: '12px',
                    }}
                  >
                    <span>Resources</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        mobileResourcesOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {mobileResourcesOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-6 space-y-1">
                          {RESOURCE_LINKS.map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setMobileResourcesOpen(false);
                              }}
                              className={`block py-2 transition-all duration-200 ${
                                isActive(item.to) ? 'font-semibold' : 'hover:opacity-70'
                              }`}
                              style={getMobileLinkStyle(item.to)}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Login */}
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 transition-all duration-200 ${
                    isActive('/login') ? 'font-bold' : 'hover:opacity-70'
                  }`}
                  style={getMobileLinkStyle('/login')}
                >
                  Login
                </Link>

                {/* CTA */}
                <Link
                  to={smartCTAPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block mt-4 px-6 py-3 rounded-full text-white font-bold text-center"
                  style={{ backgroundColor: colors.blue }}
                >
                  Start for Free
                </Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
