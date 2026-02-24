/**
 * Authenticated app layout — sidebar nav + content area
 */

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

const NAV_ITEMS = [
  { href: '/app/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/app/checkout', label: 'Checkout', icon: '💳', hide: true },
  { href: '/app/partners', label: 'Partners', icon: '🤝' },
];

const ADMIN_ITEMS = [
  { href: '/app/admin', label: 'Admin Dashboard', icon: '⚙️' },
  { href: '/app/admin/users', label: 'Users', icon: '👥' },
  { href: '/app/admin/templates', label: 'Templates', icon: '📝' },
  { href: '/app/admin/payments', label: 'Payments', icon: '💰' },
];

export function AppLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r bg-[var(--ifw-neutral-50)] p-4 hidden md:flex flex-col">
        <a href="/app/dashboard" className="font-bold text-lg mb-6 block" style={{ color: 'var(--ifw-primary-700)' }}>
          IFinallyWill
        </a>

        <nav className="space-y-1 text-sm flex-1">
          {NAV_ITEMS.filter((item) => !item.hide).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                location.pathname === item.href
                  ? 'bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)] font-medium'
                  : 'text-[var(--ifw-neutral-600)] hover:bg-[var(--ifw-neutral-200)]'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--ifw-text-muted)]">
                Admin
              </div>
              {ADMIN_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)] font-medium'
                      : 'text-[var(--ifw-neutral-600)] hover:bg-[var(--ifw-neutral-200)]'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t pt-3 mt-3">
          <div className="text-xs text-[var(--ifw-text-muted)] mb-2 px-3 truncate">
            {user?.email ?? 'Unknown user'}
          </div>
          <button
            type="button"
            onClick={() => signOut?.()}
            className="w-full text-left text-xs py-2 px-3 rounded-lg text-[var(--ifw-neutral-500)] hover:bg-[var(--ifw-neutral-200)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
        <a href="/app/dashboard" className="font-bold text-lg" style={{ color: 'var(--ifw-primary-700)' }}>
          IFW
        </a>
        <button type="button" onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileNavOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileNavOpen(false)}>
          <nav className="bg-white w-64 h-full p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            {NAV_ITEMS.filter((item) => !item.hide).map((item) => (
              <a key={item.href} href={item.href} className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm">
                <span>{item.icon}</span> {item.label}
              </a>
            ))}
            {isAdmin && ADMIN_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm">
                <span>{item.icon}</span> {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
