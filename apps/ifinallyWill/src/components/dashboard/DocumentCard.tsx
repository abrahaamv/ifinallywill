/**
 * Estate document card — shows type, status, completion %
 */

import { DOCUMENT_TYPES } from '../../config/documents';

interface Props {
  id: string;
  documentType: string;
  status: string;
  completionPct: number;
  province: string;
  updatedAt: string;
  coupleDocId?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--ifw-neutral-400)' },
  in_progress: { label: 'In Progress', color: 'var(--ifw-accent-600)' },
  complete: { label: 'Complete', color: 'var(--ifw-success)' },
  expired: { label: 'Expired', color: 'var(--ifw-error)' },
};

function getDocRoute(id: string, documentType: string): string {
  if (documentType === 'poa_property' || documentType === 'poa_health') {
    return `/app/poa/${id}`;
  }
  return `/app/documents/${id}`;
}

export function DocumentCard({
  id,
  documentType,
  status,
  completionPct,
  province,
  updatedAt,
  coupleDocId,
}: Props) {
  const docMeta = DOCUMENT_TYPES.find((d) => d.type === documentType);
  const statusMeta = STATUS_LABELS[status] ?? STATUS_LABELS.draft!;

  return (
    <a
      href={getDocRoute(id, documentType)}
      className="block border rounded-xl p-5 hover:shadow-md hover:border-[var(--ifw-primary-300)] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-2xl">{docMeta?.icon ?? '📄'}</span>
          <h3 className="font-semibold mt-2">{docMeta?.name ?? documentType}</h3>
          <p className="text-xs text-[var(--ifw-neutral-400)] mt-0.5">{province}</p>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            color: statusMeta.color,
            backgroundColor: `color-mix(in oklch, ${statusMeta.color} 15%, transparent)`,
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--ifw-neutral-500)]">Progress</span>
          <span className="font-medium">{completionPct}%</span>
        </div>
        <div className="h-2 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completionPct}%`,
              backgroundColor:
                completionPct === 100 ? 'var(--ifw-success)' : 'var(--ifw-primary-500)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-[var(--ifw-neutral-400)]">
          Updated {new Date(updatedAt).toLocaleDateString()}
        </p>
        {coupleDocId && (
          <span className="text-xs text-[var(--ifw-primary-700)] font-medium">👥 Couple</span>
        )}
      </div>
    </a>
  );
}
