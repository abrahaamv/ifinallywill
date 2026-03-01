/**
 * Landing/public page layout — fixed gold navbar + footer
 * Navy + Gold branding for marketing pages.
 * Adds pt-20 to clear the fixed 80px navbar.
 */

import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { SiteFooter } from '../components/layout/SiteFooter';

export function LandingLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isHomePage={isHomePage} />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
