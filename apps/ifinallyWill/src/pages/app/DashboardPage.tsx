/**
 * Dashboard — 4-card overview with quick navigation
 *
 * Shows four main entry points:
 * 1. Your Estate Planning → /app/estate-planning
 * 2. Family Tree → /app/family-tree
 * 3. Assets → /app/estate-planning?category=assets
 * 4. Treasure Map → /app/estate-planning?category=finalArrangements
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePersonalData } from '../../hooks/usePersonalData';
import { useAuth } from '../../providers/AuthProvider';
import * as demoStore from '../../stores/demoDocumentStore';

const DASHBOARD_CARDS = [
  {
    label: 'Your Estate Planning',
    description: 'Create your will, manage steps, and track your progress',
    icon: '📝',
    href: '/app/estate-planning',
  },
  {
    label: 'Family Tree',
    description: 'View and manage your family members',
    icon: '🌳',
    href: '/app/family-tree',
  },
  {
    label: 'Assets',
    description: 'List and manage your assets and property',
    icon: '💰',
    href: '/app/estate-planning?category=assets',
  },
  {
    label: 'Treasure Map',
    description: 'Executors, POAs, and final arrangements',
    icon: '🗺️',
    href: '/app/estate-planning?category=finalArrangements',
  },
] as const;

export function DashboardPage() {
  const { user } = useAuth();

  // Ensure a demo document exists
  const doc = useMemo(() => demoStore.ensureDefaultDocument(user?.id), [user?.id]);

  // Load personal data for progress
  const data = usePersonalData(doc.id);

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Gold gradient hero */}
      <div
        className="py-6 sm:py-10 px-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6"
        style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
            style={{ color: '#0A1E86', opacity: 0.7 }}
          >
            My Dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Track your progress and manage your estate plan.
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)]">
            {data.ownerName}&apos;s Will
          </h2>
          <span className="text-sm font-medium text-[var(--ifw-neutral-500)]">
            {data.overallProgress}% complete
          </span>
        </div>
        <div className="h-3 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${data.overallProgress}%`,
              background:
                data.overallProgress === 100
                  ? 'var(--ifw-success)'
                  : 'linear-gradient(90deg, #FFBF00, #FFD54F)',
            }}
          />
        </div>
      </div>

      {/* 4-card grid */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DASHBOARD_CARDS.map((card) => (
            <Link
              key={card.label}
              to={card.href}
              className="text-left p-5 rounded-xl border border-[var(--ifw-neutral-200)] bg-white hover:border-[var(--ifw-primary-300)] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{card.icon}</span>
                <h3 className="text-sm font-semibold text-[var(--ifw-neutral-900)] group-hover:text-[var(--ifw-primary-700)]">
                  {card.label}
                </h3>
              </div>
              <p className="text-xs text-[var(--ifw-neutral-500)]">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
