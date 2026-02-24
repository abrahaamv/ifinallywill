/**
 * Document portfolio dashboard
 * Shows all estate documents with progress, status, and create action
 */

import { useState } from 'react';
import { DocumentCard } from '../../components/dashboard/DocumentCard';
import { CreateDocumentDialog } from '../../components/dashboard/CreateDocumentDialog';
import { useAuth } from '../../providers/AuthProvider';
import { trpc } from '../../utils/trpc';

export function DashboardPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: documents,
    isLoading,
    refetch,
  } = trpc.estateDocuments.list.useQuery();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Documents</h1>
          <p className="text-sm text-[var(--ifw-neutral-500)] mt-1">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          + New Document
        </button>
      </div>

      {/* Documents grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl p-5 animate-pulse">
              <div className="h-6 w-6 bg-[var(--ifw-neutral-200)] rounded mb-3" />
              <div className="h-4 w-32 bg-[var(--ifw-neutral-200)] rounded mb-2" />
              <div className="h-3 w-20 bg-[var(--ifw-neutral-100)] rounded mb-4" />
              <div className="h-2 bg-[var(--ifw-neutral-100)] rounded-full" />
            </div>
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              documentType={doc.documentType}
              status={doc.status}
              completionPct={doc.completionPct}
              province={doc.province}
              updatedAt={doc.updatedAt.toString()}
              coupleDocId={(doc as Record<string, unknown>).coupleDocId as string | null | undefined}
            />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
          <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">
            Start by creating your first estate document — a will or power of attorney.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Create Your First Document
          </button>
        </div>
      )}

      {/* Create dialog */}
      <CreateDocumentDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
