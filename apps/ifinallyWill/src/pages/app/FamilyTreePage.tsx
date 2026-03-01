/**
 * Family Tree page — view and manage family members
 *
 * Standalone view of family members loaded via keyNames.list().
 * Displays people grouped by relationship type with navigation to wizard.
 */

import { Plus, TreePine, User, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../../utils/trpc';

const RELATIONSHIP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  spouse: { label: 'Spouse', color: 'text-pink-700', bg: 'bg-pink-50' },
  child: { label: 'Children', color: 'text-blue-700', bg: 'bg-blue-50' },
  parent: { label: 'Parents', color: 'text-purple-700', bg: 'bg-purple-50' },
  sibling: { label: 'Siblings', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  grandparent: { label: 'Grandparents', color: 'text-amber-700', bg: 'bg-amber-50' },
  friend: { label: 'Friends', color: 'text-green-700', bg: 'bg-green-50' },
  other: { label: 'Other', color: 'text-gray-700', bg: 'bg-gray-50' },
};

function getRelationshipMeta(relationship: string) {
  return RELATIONSHIP_LABELS[relationship] ?? RELATIONSHIP_LABELS.other!;
}

type KeyNameRecord = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: string;
  city: string;
  province: string;
  [key: string]: unknown;
};

export function FamilyTreePage() {
  const { data: documents, isLoading: docsLoading } = trpc.estateDocuments.list.useQuery();
  const { data: keyNamesRaw, isLoading: namesLoading } = trpc.keyNames.list.useQuery();

  const isLoading = docsLoading || namesLoading;
  const activeDoc = documents?.[0];
  const keyNames = (keyNamesRaw ?? []) as KeyNameRecord[];

  // Group people by relationship
  const grouped = useMemo(() => {
    const groups: Record<string, KeyNameRecord[]> = {};
    for (const person of keyNames) {
      const rel = person.relationship || 'other';
      if (!groups[rel]) groups[rel] = [];
      groups[rel].push(person);
    }
    return groups;
  }, [keyNames]);

  const relationshipOrder = [
    'spouse',
    'child',
    'parent',
    'sibling',
    'grandparent',
    'friend',
    'other',
  ];
  const sortedGroups = useMemo(() => {
    const entries = Object.entries(grouped);
    entries.sort(([a], [b]) => {
      const ai = relationshipOrder.indexOf(a);
      const bi = relationshipOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return entries;
  }, [grouped]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--ifw-neutral-100)] rounded" />
          <div className="h-24 bg-[var(--ifw-neutral-100)] rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-[var(--ifw-neutral-100)] rounded-xl" />
            <div className="h-32 bg-[var(--ifw-neutral-100)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeDoc) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <TreePine className="mx-auto h-16 w-16 text-[var(--ifw-neutral-300)]" />
        <h1 className="text-2xl font-bold mt-4">Family Tree</h1>
        <p className="mt-2 text-sm text-[var(--ifw-text-muted)]">
          Create a will document first to start building your family tree.
        </p>
        <Link
          to="/app/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const totalPeople = keyNames.length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TreePine className="h-6 w-6 text-[var(--ifw-primary-700)]" />
            Family Tree
          </h1>
          <p className="mt-1 text-sm text-[var(--ifw-text-muted)]">
            {totalPeople} {totalPeople === 1 ? 'person' : 'people'} in your family tree
          </p>
        </div>
        <Link
          to={`/app/documents/${activeDoc.id}/yourFamily/key-people`}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          <Plus className="h-4 w-4" />
          Add Person
        </Link>
      </div>

      {totalPeople === 0 ? (
        <div className="border-2 border-dashed border-[var(--ifw-border)] rounded-xl p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[var(--ifw-neutral-300)]" />
          <p className="mt-3 text-sm font-medium">No family members yet</p>
          <p className="mt-1 text-xs text-[var(--ifw-text-muted)]">
            Add people through your will wizard to see them here.
          </p>
          <Link
            to={`/app/documents/${activeDoc.id}/yourFamily/key-people`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--ifw-primary-700)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add your first family member
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([relationship, people]) => {
            const meta = getRelationshipMeta(relationship);
            return (
              <div key={relationship}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--ifw-text-muted)] mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs font-normal">({people.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="border border-[var(--ifw-border)] rounded-xl p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${meta.bg} ${meta.color}`}
                        >
                          {person.firstName?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {person.firstName} {person.lastName}
                          </div>
                          {person.city && (
                            <div className="text-xs text-[var(--ifw-text-muted)] mt-0.5 truncate">
                              {person.city}
                              {person.province ? `, ${person.province}` : ''}
                            </div>
                          )}
                          <div className="text-xs text-[var(--ifw-text-muted)] mt-0.5 capitalize">
                            {relationship}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
