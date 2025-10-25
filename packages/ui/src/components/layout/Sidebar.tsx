/**
 * Sidebar - Collapsible navigation sidebar with mobile support
 * Modern design with hover effects, active states, and full accessibility
 */

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  active?: boolean;
}

interface SidebarProps {
  logo?: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
  defaultCollapsed?: boolean;
  onNavigate?: (href: string) => void;
}

export function Sidebar({
  logo,
  sections,
  footer,
  defaultCollapsed = false,
  onNavigate,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [sections]); // Sections change when route changes

  // Handle navigation
  const handleNavigate = (href: string) => {
    onNavigate?.(href);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, sectionIdx: number, itemIdx: number) => {
    const section = sections[sectionIdx];
    if (!section) return;

    const totalItemsInSection = section.items.length;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        // Move to next item or next section
        const nextItemIdx = itemIdx + 1;
        if (nextItemIdx < totalItemsInSection) {
          // Focus next item in same section
          const nextItem = section.items[nextItemIdx];
          if (nextItem) {
            document.getElementById(`nav-item-${nextItem.id}`)?.focus();
          }
        } else if (sectionIdx + 1 < sections.length) {
          // Focus first item in next section
          const nextSection = sections[sectionIdx + 1];
          if (nextSection) {
            const firstItem = nextSection.items[0];
            if (firstItem) {
              document.getElementById(`nav-item-${firstItem.id}`)?.focus();
            }
          }
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        // Move to previous item or previous section
        const prevItemIdx = itemIdx - 1;
        if (prevItemIdx >= 0) {
          // Focus previous item in same section
          const prevItem = section.items[prevItemIdx];
          if (prevItem) {
            document.getElementById(`nav-item-${prevItem.id}`)?.focus();
          }
        } else if (sectionIdx - 1 >= 0) {
          // Focus last item in previous section
          const prevSection = sections[sectionIdx - 1];
          if (prevSection) {
            const lastItem = prevSection.items[prevSection.items.length - 1];
            if (lastItem) {
              document.getElementById(`nav-item-${lastItem.id}`)?.focus();
            }
          }
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        // Focus first item in first section
        const firstSection = sections[0];
        if (firstSection) {
          const firstItem = firstSection.items[0];
          if (firstItem) {
            document.getElementById(`nav-item-${firstItem.id}`)?.focus();
          }
        }
        break;
      }
      case 'End': {
        e.preventDefault();
        // Focus last item in last section
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
          const lastItem = lastSection.items[lastSection.items.length - 1];
          if (lastItem) {
            document.getElementById(`nav-item-${lastItem.id}`)?.focus();
          }
        }
        break;
      }
    }
  };

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo area */}
      {logo && (
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && logo}
          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-lg p-1.5 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {sections.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && 'mt-6')}>
            {!collapsed && (
              <h3
                className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
                id={`section-${sectionIdx}`}
              >
                {section.title}
              </h3>
            )}
            <ul
              className="space-y-1"
              aria-labelledby={!collapsed ? `section-${sectionIdx}` : undefined}
            >
              {section.items.map((item, itemIdx) => (
                <li key={item.id}>
                  <button
                    id={`nav-item-${item.id}`}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    onKeyDown={(e) => handleKeyDown(e, sectionIdx, itemIdx)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      item.active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    aria-current={item.active ? 'page' : undefined}
                    aria-label={`Navigate to ${item.label}${item.badge ? `. ${item.badge} items` : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        item.active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              item.active
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-100 text-gray-600'
                            )}
                            aria-label={`${item.badge} unread`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && !collapsed && <div className="border-t border-gray-200 p-4">{footer}</div>}

      {/* Collapse toggle (desktop only) */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex border-t border-gray-200 p-3 items-center justify-center text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Fixed on mobile, static on desktop */}
      <aside
        className={cn(
          'h-full transition-transform duration-300 md:relative md:translate-x-0',
          'fixed inset-y-0 left-0 z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile menu toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-50 md:hidden rounded-full bg-primary-600 p-3 text-white shadow-lg hover:bg-primary-700"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </>
  );
}
