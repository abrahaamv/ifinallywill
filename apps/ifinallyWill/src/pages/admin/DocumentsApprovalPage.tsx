/**
 * Admin Documents Approval page — review and approve/reject estate documents
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';

type StatusFilter = 'all' | 'draft' | 'in_progress' | 'complete' | 'expired';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-blue-700',
  complete: 'bg-green-50 text-green-700',
  expired: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Pending Review',
  in_progress: 'In Progress',
  complete: 'Approved',
  expired: 'Rejected',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  primary_will: 'Primary Will',
  secondary_will: 'Secondary Will',
  poa_property: 'POA — Property',
  poa_health: 'POA — Health',
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Approved' },
  { value: 'expired', label: 'Rejected' },
];

export function DocumentsApprovalPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const { data: documents, isLoading } = trpc.estateDocuments.list.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.estateDocuments.updateStatus.useMutation({
    onSuccess: () => {
      utils.estateDocuments.list.invalidate();
    },
  });

  const filtered =
    documents?.filter((doc) => {
      if (filter === 'all') return true;
      return doc.status === filter;
    }) ?? [];

  const pendingCount = documents?.filter((d) => d.status === 'draft').length ?? 0;
  const approvedCount = documents?.filter((d) => d.status === 'complete').length ?? 0;
  const rejectedCount = documents?.filter((d) => d.status === 'expired').length ?? 0;

  function handleApprove(id: string) {
    updateStatus.mutate({ id, status: 'complete' });
  }

  function handleReject(id: string) {
    updateStatus.mutate({ id, status: 'expired' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents Approval</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Pending Review</div>
          <div className="text-2xl font-bold mt-1">{pendingCount}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Approved</div>
          <div className="text-2xl font-bold mt-1 text-green-700">{approvedCount}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Rejected</div>
          <div className="text-2xl font-bold mt-1 text-red-700">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2 mb-6">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === opt.value
                ? 'bg-[var(--ifw-primary-700)] text-white'
                : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)] hover:bg-[var(--ifw-neutral-200)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-[var(--ifw-neutral-100)] rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ifw-neutral-50)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Document Type</th>
                <th className="text-left px-4 py-3 font-medium">Province</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Completion</th>
                <th className="text-left px-4 py-3 font-medium">Submitted</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-t border-[var(--ifw-border)]">
                  <td className="px-4 py-3 font-medium">
                    {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </td>
                  <td className="px-4 py-3 text-[var(--ifw-text-muted)]">{doc.province}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[doc.status] ?? ''
                      }`}
                    >
                      {STATUS_LABELS[doc.status] ?? doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ifw-primary-500)] rounded-full transition-all"
                          style={{ width: `${doc.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--ifw-text-muted)]">
                        {doc.completionPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--ifw-text-muted)]">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.status === 'draft' || doc.status === 'in_progress' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(doc.id)}
                          disabled={updateStatus.isPending}
                          className="text-xs px-3 py-1 rounded-md font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(doc.id)}
                          disabled={updateStatus.isPending}
                          className="text-xs px-3 py-1 rounded-md font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--ifw-text-muted)]">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-lg mb-1">No documents found</div>
          <p className="text-sm text-[var(--ifw-text-muted)]">
            {filter === 'all'
              ? 'There are no estate documents to review yet.'
              : `No documents with status "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}" found.`}
          </p>
        </div>
      )}
    </div>
  );
}
