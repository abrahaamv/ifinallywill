/**
 * Person selector — card-based selection from key_names pool
 *
 * Supports single or multi-select. Shows person name, relationship, and contact.
 */

import { trpc } from '../../utils/trpc';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  filterRelationship?: string[];
  excludeIds?: string[];
  label?: string;
}

export function PersonSelector({
  selectedIds,
  onChange,
  multiple = false,
  filterRelationship,
  excludeIds = [],
  label,
}: Props) {
  const { data: people, isLoading } = trpc.keyNames.list.useQuery();

  const filtered = (people ?? []).filter((p) => {
    if (excludeIds.includes(p.id)) return false;
    if (filterRelationship && !filterRelationship.includes(p.relationship)) return false;
    return true;
  });

  const togglePerson = (id: string) => {
    if (multiple) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onChange(next);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-[var(--ifw-neutral-100)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--ifw-text-muted)] py-4">
          No people available. Add people in the Key People step first.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((person) => {
            const isSelected = selectedIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => togglePerson(person.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)]'
                    : 'border-[var(--ifw-neutral-200)] hover:border-[var(--ifw-neutral-400)]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-700)]'
                      : 'border-[var(--ifw-neutral-300)]'
                  }`}
                >
                  {isSelected && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {person.firstName} {person.lastName}
                  </div>
                  <div className="text-xs text-[var(--ifw-text-muted)] capitalize">
                    {person.relationship}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
