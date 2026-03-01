/**
 * Admin All Files page — browse and download generated estate documents
 */

import { useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc';

type DocTypeFilter = 'all' | 'primary_will' | 'secondary_will' | 'poa_property' | 'poa_health';

const DOC_TYPE_LABELS: Record<string, string> = {
  primary_will: 'Primary Will',
  secondary_will: 'Secondary Will',
  poa_property: 'POA — Property',
  poa_health: 'POA — Health',
};

const DOC_TYPE_ICONS: Record<string, string> = {
  primary_will: '\u{1F4DC}',
  secondary_will: '\u{1F4C4}',
  poa_property: '\u{1F3E0}',
  poa_health: '\u{1FA7A}',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-blue-700',
  complete: 'bg-green-50 text-green-700',
  expired: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  complete: 'Generated',
  expired: 'Expired',
};

const FILTER_OPTIONS: { value: DocTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'primary_will', label: 'Primary Will' },
  { value: 'secondary_will', label: 'Secondary Will' },
  { value: 'poa_property', label: 'POA Property' },
  { value: 'poa_health', label: 'POA Health' },
];

export function AllFilesPage() {
  const [typeFilter, setTypeFilter] = useState<DocTypeFilter>('all');
  const [search, setSearch] = useState('');
  const { data: documents, isLoading } = trpc.estateDocuments.list.useQuery();

  const filtered = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesProvince = doc.province.toLowerCase().includes(q);
        const matchesType = (DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType)
          .toLowerCase()
          .includes(q);
        const matchesId = doc.id.toLowerCase().includes(q);
        if (!matchesProvince && !matchesType && !matchesId) return false;
      }
      return true;
    });
  }, [documents, typeFilter, search]);

  const totalFiles = documents?.length ?? 0;
  const completedFiles = documents?.filter((d) => d.status === 'complete').length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Files</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Total Documents</div>
          <div className="text-2xl font-bold mt-1">{totalFiles}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Generated</div>
          <div className="text-2xl font-bold mt-1 text-green-700">{completedFiles}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">In Progress</div>
          <div className="text-2xl font-bold mt-1">
            {documents?.filter((d) => d.status === 'draft' || d.status === 'in_progress').length ??
              0}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by province, type, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-[var(--ifw-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)] focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                typeFilter === opt.value
                  ? 'bg-[var(--ifw-primary-700)] text-white'
                  : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)] hover:bg-[var(--ifw-neutral-200)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse border rounded-lg p-5">
              <div className="h-8 w-8 bg-[var(--ifw-neutral-100)] rounded-lg mb-3" />
              <div className="h-4 bg-[var(--ifw-neutral-100)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[var(--ifw-neutral-100)] rounded w-1/2 mb-4" />
              <div className="h-3 bg-[var(--ifw-neutral-100)] rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="border border-[var(--ifw-border)] rounded-lg p-5 hover:border-[var(--ifw-primary-500)] transition-colors"
            >
              {/* Icon + type */}
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{DOC_TYPE_ICONS[doc.documentType] ?? '\u{1F4C3}'}</div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[doc.status] ?? ''
                  }`}
                >
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </span>
              </div>

              {/* Doc type name */}
              <div className="font-medium text-sm mb-1">
                {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
              </div>

              {/* Province */}
              <div className="text-xs text-[var(--ifw-text-muted)] mb-3">
                {doc.province}, {doc.country}
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-[var(--ifw-text-muted)] mb-1">
                  <span>Completion</span>
                  <span>{doc.completionPct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--ifw-primary-500)] rounded-full transition-all"
                    style={{ width: `${doc.completionPct}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--ifw-border)]">
                <span className="text-xs text-[var(--ifw-text-muted)]">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-mono text-[var(--ifw-text-muted)]">
                  {doc.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-lg mb-1">No files found</div>
          <p className="text-sm text-[var(--ifw-text-muted)]">
            {search.trim()
              ? `No documents matching "${search}" were found.`
              : typeFilter !== 'all'
                ? `No ${DOC_TYPE_LABELS[typeFilter] ?? typeFilter} documents found.`
                : 'There are no estate documents yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
