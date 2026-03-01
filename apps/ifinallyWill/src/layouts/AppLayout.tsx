/**
 * Authenticated app layout — top navbar + sidebar + content + AI sidebar
 * Pixel-perfect clone of source AuthenticatedLayout + AppNavbar
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  CreditCard,
  FileText,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  TreePine,
  User,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { WilfredSidebar } from '../components/ai/WilfredSidebar';
import { useAuth } from '../providers/AuthProvider';

const COLORS = {
  navyPrimary: '#0A1E86',
  navyDark: '#061254',
  yellowPrimary: '#FFBF00',
} as const;

const NAV_LINKS: ReadonlyArray<{
  readonly href: string;
  readonly label: string;
  readonly icon: typeof LayoutDashboard;
  readonly badge?: string;
}> = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/documents', label: 'Documents', icon: Sparkles, badge: 'New' },
  { href: '/app/support', label: 'Support', icon: HeadphonesIcon },
];

const SIDEBAR_ITEMS = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/family-tree', label: 'Family Tree', icon: TreePine },
] as const;

const ADMIN_ITEMS = [
  { href: '/app/admin', label: 'Overview', icon: Settings },
  { href: '/app/admin/users', label: 'Users', icon: Users },
  { href: '/app/admin/templates', label: 'Templates', icon: FileText },
  { href: '/app/admin/payments', label: 'Payments', icon: CreditCard },
] as const;

export function AppLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    signOut?.();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-8">
            <Link to="/app/dashboard" className="flex items-center gap-3">
              <span className="text-xl font-bold" style={{ color: COLORS.navyPrimary }}>
                iFinallyWill
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(({ href, label, icon: Icon, badge }) => (
                <Link
                  key={href}
                  to={href}
                  className={`inline-flex items-center gap-1.5 pb-1 text-sm font-semibold transition-colors ${
                    isActive(href) ? 'border-b-2' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={
                    isActive(href)
                      ? { color: COLORS.navyPrimary, borderColor: COLORS.yellowPrimary }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {badge && (
                    <span
                      className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: COLORS.yellowPrimary, color: COLORS.navyPrimary }}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: User dropdown */}
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 transition hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">{user?.name ?? 'User'}</span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showUserDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <Link
                        to="/app/profile"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 sm:hidden"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 sm:hidden"
            >
              <div className="space-y-1 px-4 pb-3 pt-2">
                {NAV_LINKS.map(({ href, label, icon: Icon, badge }) => (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`block border-l-4 py-2 pl-3 transition ${
                      isActive(href)
                        ? 'border-brand-gold bg-brand-gold/10 font-semibold text-brand-blue'
                        : 'border-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4" />
                      {label}
                      {badge && (
                        <span
                          className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: COLORS.yellowPrimary,
                            color: COLORS.navyPrimary,
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="border-t border-gray-200 px-4 pb-3 pt-4">
                <div className="mb-3">
                  <div className="text-base font-medium text-gray-800">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
                <div className="space-y-1">
                  <Link
                    to="/app/profile"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-2 border-l-4 border-transparent py-2 pl-3 text-gray-600 transition hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-l-4 border-transparent py-2 pl-3 text-left text-gray-600 transition hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Body: Sidebar + Content + AI */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-gray-100 bg-[var(--ifw-neutral-50)] p-4 transition-all ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <nav className="flex-1 space-y-1 text-sm">
            {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  isActive(href)
                    ? 'bg-[var(--ifw-primary-50)] font-medium text-[var(--ifw-primary-700)]'
                    : 'text-[var(--ifw-neutral-600)] hover:bg-[var(--ifw-neutral-200)]'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && label}
              </Link>
            ))}

            {isAdmin && (
              <>
                <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--ifw-text-muted)]">
                  Admin
                </div>
                {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    to={href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                      isActive(href)
                        ? 'bg-[var(--ifw-primary-50)] font-medium text-[var(--ifw-primary-700)]'
                        : 'text-[var(--ifw-neutral-600)] hover:bg-[var(--ifw-neutral-200)]'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="mt-3 border-t pt-3">
            <div className="mb-2 truncate px-3 text-xs text-[var(--ifw-text-muted)]">
              {user?.email ?? 'Unknown user'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--ifw-neutral-500)] transition-colors hover:bg-[var(--ifw-neutral-200)]"
            >
              {sidebarCollapsed ? <LogOut className="h-4 w-4" /> : 'Sign Out'}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--ifw-neutral-400)] transition-colors hover:bg-[var(--ifw-neutral-200)]"
            >
              {sidebarCollapsed ? '>' : 'Collapse'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>

        {/* AI Sidebar */}
        <WilfredSidebar />
      </div>
    </div>
  );
}
