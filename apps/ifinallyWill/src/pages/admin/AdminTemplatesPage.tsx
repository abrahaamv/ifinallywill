/**
 * Admin Templates page — manage document templates and versions
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';

export function AdminTemplatesPage() {
  const { data: docTypes } = trpc.templateVersions.listDocumentTypes.useQuery();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const { data: templates } = trpc.templateVersions.list.useQuery(
    selectedTypeId ? { documentTypeId: selectedTypeId } : {},
  );

  const activateMutation = trpc.templateVersions.activate.useMutation();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Document Templates</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {/* Document type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSelectedTypeId(null)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            !selectedTypeId ? 'border-[var(--ifw-primary-500)] bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)]' : 'border-[var(--ifw-border)]'
          }`}
        >
          All Types
        </button>
        {docTypes?.map((dt) => (
          <button
            key={dt.id}
            type="button"
            onClick={() => setSelectedTypeId(dt.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              selectedTypeId === dt.id ? 'border-[var(--ifw-primary-500)] bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)]' : 'border-[var(--ifw-border)]'
            }`}
          >
            {dt.displayName}
          </button>
        ))}
      </div>

      {/* Templates list */}
      {templates && templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  Version {tmpl.version}
                  {tmpl.isActive && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                  )}
                </div>
                <div className="text-xs text-[var(--ifw-text-muted)] mt-1">
                  Created {new Date(tmpl.createdAt).toLocaleDateString()}
                  {tmpl.notes && ` — ${tmpl.notes}`}
                </div>
                <div className="text-xs text-[var(--ifw-text-muted)] mt-0.5">
                  {tmpl.content.length} chars
                </div>
              </div>
              {!tmpl.isActive && (
                <button
                  type="button"
                  onClick={() => activateMutation.mutate({ id: tmpl.id })}
                  disabled={activateMutation.isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--ifw-primary-500)] text-[var(--ifw-primary-700)] hover:bg-[var(--ifw-primary-50)] disabled:opacity-40"
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--ifw-text-muted)]">
          No templates found. Create templates via the API or seed data.
        </p>
      )}
    </div>
  );
}
