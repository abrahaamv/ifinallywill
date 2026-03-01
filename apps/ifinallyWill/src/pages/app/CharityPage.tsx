/**
 * Charity — leave a charitable bequest in your will
 */

import { ExternalLink, Heart, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CharityOrg {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: string;
}

const FEATURED_CHARITIES: CharityOrg[] = [
  {
    id: '1',
    name: 'Canadian Red Cross',
    category: 'Humanitarian',
    description: 'Helps people in times of need across Canada and around the world.',
    logo: '🏥',
  },
  {
    id: '2',
    name: 'SickKids Foundation',
    category: 'Healthcare',
    description: 'Funds research and care for children with complex conditions.',
    logo: '🧒',
  },
  {
    id: '3',
    name: 'Nature Conservancy of Canada',
    category: 'Environment',
    description: 'Protects important natural areas and the species they sustain.',
    logo: '🌿',
  },
  {
    id: '4',
    name: 'United Way',
    category: 'Community',
    description: 'Strengthens communities by investing in local programs and initiatives.',
    logo: '🤝',
  },
  {
    id: '5',
    name: 'Canadian Cancer Society',
    category: 'Healthcare',
    description: 'Funds cancer research and supports Canadians living with cancer.',
    logo: '🎗️',
  },
  {
    id: '6',
    name: 'Habitat for Humanity Canada',
    category: 'Housing',
    description: 'Builds affordable homes for families across Canada.',
    logo: '🏠',
  },
];

export function CharityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharities, setSelectedCharities] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return FEATURED_CHARITIES;
    const q = searchTerm.toLowerCase();
    return FEATURED_CHARITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const toggleCharity = (id: string) => {
    setSelectedCharities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Hero */}
      <div
        className="py-6 sm:py-10 px-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6"
        style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
            style={{ color: '#0A1E86', opacity: 0.7 }}
          >
            Charity
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Leave a Legacy Gift
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Include a charitable bequest in your will and make a lasting impact.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Info card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FFBF00, #FFD54F)' }}
            >
              <Heart className="h-5 w-5 text-[#0C1F3C]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--ifw-neutral-900)] mb-1">
                What is a Charitable Bequest?
              </h2>
              <p className="text-sm text-[var(--ifw-neutral-600)] leading-relaxed">
                A charitable bequest is a gift you leave to a charity in your will. It can be a fixed
                amount, a percentage of your estate, or specific property. Your estate may also receive
                tax benefits. You can add charitable bequests in the <strong>Your Assets</strong> section
                of your estate plan.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ifw-neutral-400)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search charities by name or category..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-[var(--ifw-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-100)]"
          />
        </div>

        {/* Selected count */}
        {selectedCharities.size > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <span className="text-sm text-green-800 font-medium">
              {selectedCharities.size} {selectedCharities.size === 1 ? 'charity' : 'charities'} selected
            </span>
            <button
              type="button"
              onClick={() =>
                alert('This will be saved to your bequests in a future update.')
              }
              className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
            >
              Add to Will
            </button>
          </div>
        )}

        {/* Charity grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((charity) => {
            const selected = selectedCharities.has(charity.id);
            return (
              <button
                key={charity.id}
                type="button"
                onClick={() => toggleCharity(charity.id)}
                className={`text-left p-5 rounded-xl border transition-all group ${
                  selected
                    ? 'border-green-300 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 bg-white hover:border-[var(--ifw-primary-300)] hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">{charity.logo}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--ifw-neutral-900)] truncate">
                      {charity.name}
                    </h3>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--ifw-neutral-400)]">
                      {charity.category}
                    </span>
                  </div>
                  {selected && (
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--ifw-neutral-500)] leading-relaxed">{charity.description}</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <Search className="h-8 w-8 mx-auto mb-2 text-[var(--ifw-neutral-300)]" />
            <p className="text-sm text-[var(--ifw-neutral-500)]">No charities found matching "{searchTerm}"</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <p className="text-sm text-[var(--ifw-neutral-600)] mb-2">
            Don't see your charity? You can add any registered Canadian charity in your estate plan.
          </p>
          <a
            href="https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyBscSrch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ifw-primary-700)] hover:underline"
          >
            Search CRA Charity Registry <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
